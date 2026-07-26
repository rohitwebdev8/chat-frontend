import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';

// ─── Payload Contract ────────────────────────────────────────────────────────
// This is the exact structure expected from the notification backend:
//
// Text Message Notification Payload:
// {
//   "to": "ExponentPushToken[XXXXXXXXXXXXXXXXXXXXXX]",
//   "title": "Sender Display Name",
//   "body": "Hello, how are you?",
//   "data": {
//     "roomId": "room_id_here",
//     "roomName": "General Chat",
//     "messageType": "text"
//   }
// }
//
// Voice Message Notification Payload:
// {
//   "to": "ExponentPushToken[XXXXXXXXXXXXXXXXXXXXXX]",
//   "title": "Sender Display Name",
//   "body": "🎤 Voice message",
//   "data": {
//     "roomId": "room_id_here",
//     "roomName": "General Chat",
//     "messageType": "voice"
//   }
// }
// ─────────────────────────────────────────────────────────────────────────────

export interface PushNotificationData {
  roomId?: string;
  roomName?: string;
  messageType?: 'text' | 'voice';
  [key: string]: unknown;
}

// ─── 1. Foreground Handler ───────────────────────────────────────────────────
// Configures how incoming notifications are presented while the app is in foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── 2. Android Channel Configuration ────────────────────────────────────────
/**
 * Configures the default high-importance Android notification channel for chat.
 * Safe to call multiple times or during app initialization.
 */
export async function configureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Chat Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5',
    });
  }
}

// ─── 3. Permission Request ───────────────────────────────────────────────────
/**
 * Checks and requests notification permissions.
 * Does not crash if permission is denied.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[pushService] Notification permission was denied by user.');
    return false;
  }

  return true;
}

// ─── 4. Push Token Registration ──────────────────────────────────────────────
/**
 * Full registration flow for Expo Push Notifications:
 *  - Verifies physical device
 *  - Sets up Android channel
 *  - Requests permissions
 *  - Obtains EAS projectId
 *  - Retrieves and logs Expo Push Token
 *
 * @returns The Expo Push Token string (e.g. ExponentPushToken[...]) or null if unavailable.
 */
// Module state storing the active Expo push token for sender identification
let currentPushToken: string | null = null;

/**
 * Accessor for the active Expo push token obtained by this device.
 */
export function getStoredPushToken(): string | null {
  return currentPushToken;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[pushService] Must use a physical device for Expo Push Notifications.');
    return null;
  }

  try {
    await configureAndroidNotificationChannel();

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return null;
    }

    // Disable legacy Expo auto-server token registration to prevent canceled fetch warnings
    await Notifications.setAutoServerRegistrationEnabledAsync(false);

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      console.error('[pushService] EAS projectId is missing from Expo configuration.');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    currentPushToken = token;

    // Register token with Node.js notification backend
    const { registerPushTokenWithBackend } = await import('../api/notificationApi');
    await registerPushTokenWithBackend(token);

    return token;
  } catch (error) {
    console.error('[pushService] Failed to register for push notifications:', error);
    return null;
  }
}

// ─── 5. Navigation Router Helper ─────────────────────────────────────────────
function navigateFromNotification(data?: PushNotificationData): void {
  if (!data || !data.roomId) {
    return;
  }

  console.log(`[pushService] Navigating to room: ${data.roomId}`);
  router.push(`/chat/${data.roomId}`);
}

// ─── 6. Master Listener & Cold-Start Initializer ─────────────────────────────
/**
 * Sets up notification registration, listeners, and handles cold-start notification taps.
 * Should be called once during root app layout mounting.
 *
 * @returns A cleanup function to unsubscribe listeners on unmount.
 */
export async function initNotifications(): Promise<() => void> {
  // 1. Register device & obtain token
  await registerForPushNotifications();

  // 2. Notification received while app is active (Foreground Listener)
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[pushService] Notification Received in Foreground:', {
      title: notification.request.content.title,
      body: notification.request.content.body,
      data: notification.request.content.data,
    });
  });

  // 3. User taps a notification (Background / Active Response Listener)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[pushService] Notification Response (Tap):', response.notification.request.content.data);
    const data = response.notification.request.content.data as PushNotificationData;
    navigateFromNotification(data);
  });

  // 4. Cold-Start Check: user opened app by tapping a notification while app was terminated
  try {
    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    if (lastResponse) {
      console.log('[pushService] Cold-start Notification Response:', lastResponse.notification.request.content.data);
      const data = lastResponse.notification.request.content.data as PushNotificationData;
      // Slight delay to ensure Expo Router container is fully mounted before navigating
      setTimeout(() => {
        navigateFromNotification(data);
      }, 300);
    }
  } catch (err) {
    console.error('[pushService] Error checking cold-start notification response:', err);
  }

  // Return subscription cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
