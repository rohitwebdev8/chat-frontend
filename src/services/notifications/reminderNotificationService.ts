import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Reminder, QuietHours } from '@/types/reminders';
import { DailyLog } from '@/types/logs';
import { calculateRollingWindowSchedule } from '@/lib/reminders/scheduler';
import { personalOS } from '@/services/firebase/personalOS';

const REMINDER_CHANNEL_ID = 'reminders';
const REMINDER_CATEGORY_ID = 'REMINDER_ACTIONS';

let responseListenerRegistered = false;

/**
 * Initializes dedicated Android Notification Channel "reminders" and Action Categories.
 * Registers notification action response handler for "DONE", "SNOOZE".
 */
export async function initReminderNotificationService() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Daily Reminders & Habits',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
      });
    }

    await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY_ID, [
      {
        identifier: 'DONE',
        buttonTitle: 'Done ✅',
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
      {
        identifier: 'SNOOZE_60',
        buttonTitle: 'Snooze 1 hr ⏰',
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
    ]);

    if (!responseListenerRegistered) {
      responseListenerRegistered = true;
      Notifications.addNotificationResponseReceivedListener(async (response) => {
        const { actionIdentifier, notification } = response;
        const data = notification.request.content.data as {
          reminderId?: string;
          taskId?: string;
        };

        if (actionIdentifier === 'DONE' && data?.taskId) {
          await personalOS.toggleTaskCompletion(data.taskId, true);
        } else if (actionIdentifier === 'SNOOZE_60' && data?.reminderId) {
          const snoozeDate = new Date(Date.now() + 60 * 60 * 1000);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `[Snoozed] ${notification.request.content.title}`,
              body: notification.request.content.body,
              sound: true,
              categoryIdentifier: REMINDER_CATEGORY_ID,
              data,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: snoozeDate,
              channelId: REMINDER_CHANNEL_ID,
            },
          });
        }
      });
    }
  } catch (err) {
    console.warn('Notification init error:', err);
  }
}

export async function checkReminderPermissions(): Promise<{ granted: boolean; canRequest: boolean }> {
  if (Platform.OS === 'web') return { granted: false, canRequest: false };
  try {
    const settings = await Notifications.getPermissionsAsync();
    let granted =
      settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;

    if (!granted && settings.canAskAgain) {
      const req = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      granted = req.granted;
    }

    return { granted, canRequest: settings.canAskAgain };
  } catch {
    return { granted: false, canRequest: true };
  }
}

/**
 * Schedules rolling window local notifications.
 * Automatically schedules default 9:00 PM "Finish today's tasks (N left)" reminder.
 */
export async function syncLocalScheduledReminders(
  reminders: Reminder[],
  currentLog: DailyLog | null,
  quietHours?: QuietHours,
  remainingTasksCount: number = 0
): Promise<void> {
  const { granted } = await checkReminderPermissions();
  if (!granted) return;

  // Cancel all previously scheduled reminder notifications to prevent duplicates
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.reminderId || notif.content.data?.isDefaultEveningReminder) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (e) {
    console.warn('Cancel notifications warning:', e);
  }

  // 1. Calculate rolling window instances (top 50 nearest)
  const instances = calculateRollingWindowSchedule(reminders, quietHours, 50);

  for (const instance of instances) {
    const rem = instance.reminder;

    // Skip if linked task is already completed today
    if (rem.taskId && currentLog?.done?.[rem.taskId]) {
      continue;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: rem.title,
          body: rem.body || rem.title,
          sound: true,
          categoryIdentifier: REMINDER_CATEGORY_ID,
          data: {
            reminderId: rem.id,
            taskId: rem.taskId,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: instance.fireDate,
          channelId: REMINDER_CHANNEL_ID,
        },
      });
    } catch (schedErr) {
      console.warn(`Failed to schedule notification for ${rem.title}:`, schedErr);
    }
  }

  // 2. Schedule default 9:00 PM reminder: "Finish today's tasks (N left)"
  try {
    const now = new Date();
    const tonight9pm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0, 0);

    const targetDate = now.getTime() < tonight9pm.getTime()
      ? tonight9pm
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 21, 0, 0, 0);

    const message = remainingTasksCount > 0
      ? `Finish today's tasks (${remainingTasksCount} left)!`
      : 'All tasks complete for today 🎉 Great job staying on pace!';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 9:00 PM Daily Check-in',
        body: message,
        sound: true,
        data: { isDefaultEveningReminder: true },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  } catch (eveningErr) {
    console.warn('Failed to schedule 9:00 PM reminder:', eveningErr);
  }
}

export async function sendImmediateTestNotification(reminder: Reminder): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${reminder.emoji ? reminder.emoji + ' ' : ''}${reminder.title}`,
        body: reminder.body || 'Time to complete your task!',
        sound: true,
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('Failed to send test notification:', err);
  }
}
