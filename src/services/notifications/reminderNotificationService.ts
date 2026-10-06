import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Reminder, QuietHours } from '@/types/reminders';
import { DailyLog } from '@/types/logs';
import { calculateRollingWindowSchedule } from '@/lib/reminders/scheduler';
import { personalOS } from '@/services/firebase/personalOS';
import { getUID } from '@/services/firebase/authService';

const REMINDER_CHANNEL_ID = 'reminders';
const REMINDER_CATEGORY_ID = 'REMINDER_ACTIONS';

let responseListenerRegistered = false;

/**
 * Initializes dedicated Android Notification Channel "reminders" and Action Categories.
 * Registers notification action response handler for "DONE", "SNOOZE", and "ADD_TASK".
 */
export async function initReminderNotificationService() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Daily Reminders & Habits',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
        sound: 'default',
      });
    }

    // Register Notification Action Categories: "Done", "Snooze 1h"
    await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY_ID, [
      {
        identifier: 'DONE',
        buttonTitle: '✅ Done',
        options: { isAuthenticationRequired: false },
      },
      {
        identifier: 'SNOOZE',
        buttonTitle: '⏰ Snooze 1h',
        options: { isAuthenticationRequired: false },
      },
    ]);

    // Register listener only once
    if (!responseListenerRegistered) {
      responseListenerRegistered = true;
      Notifications.addNotificationResponseReceivedListener(async (response) => {
        const actionIdentifier = response.actionIdentifier;
        const data = response.notification.request.content.data as {
          reminderId?: string;
          taskId?: string | null;
        };

        if (!data?.reminderId) return;

        let uid: string;
        try { uid = getUID(); } catch { return; }

        if (actionIdentifier === 'DONE' && data.taskId) {
          // Mark task completed in Firestore
          await personalOS.toggleTaskCompletion(data.taskId, true);
        } else if (actionIdentifier === 'SNOOZE') {
          // Schedule snooze notification in 60 minutes
          const content = response.notification.request.content;
          await Notifications.scheduleNotificationAsync({
            content: {
              title: content.title || 'Snoozed Reminder',
              body: content.body || '',
              categoryIdentifier: REMINDER_CATEGORY_ID,
              data: content.data,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 3600, // 1 hour
              channelId: REMINDER_CHANNEL_ID,
            },
          });
        }
      });
    }
  } catch (err) {
    console.warn('Failed to initialize reminder notification service:', err);
  }
}

/**
 * Checks and requests Local Notification permissions.
 */
export async function checkReminderPermissions(): Promise<{ granted: boolean; canRequest: boolean }> {
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
 * Schedules rolling window local notifications adhering to iOS <= 64 pending limit.
 * Cancels outdated reminder notifications and schedules only nearest valid instances.
 */
export async function syncLocalScheduledReminders(
  reminders: Reminder[],
  currentLog: DailyLog | null,
  quietHours?: QuietHours
): Promise<void> {
  const { granted } = await checkReminderPermissions();
  if (!granted) return;

  // Cancel all previously scheduled reminder notifications to prevent duplicates
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.reminderId) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (e) {
    console.warn('Cancel notifications warning:', e);
  }

  // Calculate rolling window instances (top 50 nearest)
  const instances = calculateRollingWindowSchedule(reminders, quietHours, 50);

  for (const instance of instances) {
    const rem = instance.reminder;

    // Skip if linked task is already completed today
    if (rem.taskId && currentLog?.completedTaskIds?.includes(rem.taskId)) {
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
}
