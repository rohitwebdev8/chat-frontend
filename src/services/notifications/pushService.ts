/**
 * pushService.ts — Push Notification Service for PACE.
 * Handles permission, token registration, foreground display,
 * and local notification scheduling. All chat-specific code removed.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// ─── Foreground Handler ───────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Android Channel ──────────────────────────────────────────────────────────
export async function configureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pace-reminders', {
      name: 'PACE Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0066FF',
    });
  }
}

// ─── Permission ───────────────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[pushService] Notification permission denied.');
    return false;
  }
  return true;
}

// ─── Token Registration ───────────────────────────────────────────────────────
let _pushToken: string | null = null;

export function getStoredPushToken(): string | null {
  return _pushToken;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) {
    return null;
  }

  try {
    await configureAndroidNotificationChannel();
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return null;

    // Disable Expo's legacy auto-registration to prevent canceled fetch warnings
    await Notifications.setAutoServerRegistrationEnabledAsync(false);

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      console.error('[pushService] EAS projectId missing from Expo config.');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    _pushToken = tokenData.data;
    return _pushToken;
  } catch (error) {
    console.error('[pushService] Failed to register for push notifications:', error);
    return null;
  }
}

// ─── Local Notification Helper ────────────────────────────────────────────────
export async function scheduleLocalNotification(
  title: string,
  body: string,
  triggerSeconds: number
): Promise<string | null> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: triggerSeconds },
    });
    return id;
  } catch (err) {
    console.warn('[pushService] scheduleLocalNotification failed:', err);
    return null;
  }
}

export async function cancelNotification(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}

// ─── Master Init ──────────────────────────────────────────────────────────────
/**
 * Called once in root layout. Sets up permission + listeners.
 * Returns cleanup function.
 */
export async function initNotifications(): Promise<() => void> {
  await registerForPushNotifications();

  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[pushService] Notification received:', notification.request.content.title);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[pushService] Notification tapped:', response.notification.request.content.data);
    // PACE: future deep-link handling (e.g., open specific task/reminder)
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
