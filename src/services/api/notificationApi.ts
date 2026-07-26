import { networkMonitor } from './networkMonitor';

export interface SendNotificationPayload {
  roomId: string;
  roomName: string;
  senderName: string;
  senderToken: string;
  messageType: 'text' | 'voice';
  text?: string;
}

/**
 * Resolves the Backend API base URL.
 */
const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, ''); // Trim trailing slashes
  }
  return 'https://chat-backend-r2cp.onrender.com';
};

/**
 * Registers an Expo push token with the backend.
 */
export async function registerPushTokenWithBackend(token: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const startTime = Date.now();
  const endpoint = '/api/notifications/register';
  const fullUrl = `${baseUrl}${endpoint}`;

  try {
    console.log(`[notificationApi] Registering push token with backend at ${baseUrl}...`);

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const durationMs = Date.now() - startTime;
    const data = await response.json();

    networkMonitor.addLog({
      method: 'POST',
      endpoint,
      url: fullUrl,
      status: response.status,
      durationMs,
      requestBody: { token },
      responseBody: data,
    });

    if (response.ok && data.success) {
      console.log('[notificationApi] Push token successfully registered with backend.');
      return true;
    } else {
      console.warn('[notificationApi] Backend token registration returned non-success:', data);
      return false;
    }
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : 'Network error';

    networkMonitor.addLog({
      method: 'POST',
      endpoint,
      url: fullUrl,
      status: 'ERR',
      durationMs,
      requestBody: { token },
      error: errMsg,
    });

    console.error('[notificationApi] Failed to connect to notification backend:', error);
    return false;
  }
}

/**
 * Unregisters an Expo push token from the backend.
 */
export async function unregisterPushTokenWithBackend(token: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const startTime = Date.now();
  const endpoint = '/api/notifications/unregister';
  const fullUrl = `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const durationMs = Date.now() - startTime;
    const data = await response.json();

    networkMonitor.addLog({
      method: 'DELETE',
      endpoint,
      url: fullUrl,
      status: response.status,
      durationMs,
      requestBody: { token },
      responseBody: data,
    });

    return response.ok && data.success;
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : 'Network error';

    networkMonitor.addLog({
      method: 'DELETE',
      endpoint,
      url: fullUrl,
      status: 'ERR',
      durationMs,
      requestBody: { token },
      error: errMsg,
    });

    console.error('[notificationApi] Failed to unregister push token:', error);
    return false;
  }
}

/**
 * Triggers a push notification via the backend after a Firestore message is sent.
 */
export async function triggerPushNotification(payload: SendNotificationPayload): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const startTime = Date.now();
  const endpoint = '/api/notifications/send';
  const fullUrl = `${baseUrl}${endpoint}`;

  try {
    console.log(`[notificationApi] Triggering push notification for room "${payload.roomId}" via backend...`);

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const durationMs = Date.now() - startTime;
    const data = await response.json();

    networkMonitor.addLog({
      method: 'POST',
      endpoint,
      url: fullUrl,
      status: response.status,
      durationMs,
      requestBody: payload,
      responseBody: data,
    });

    if (response.ok && data.success) {
      console.log('[notificationApi] Push notification request processed successfully by backend:', data.data);
      return true;
    } else {
      console.warn('[notificationApi] Backend notification request failed:', data);
      return false;
    }
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : 'Network error';

    networkMonitor.addLog({
      method: 'POST',
      endpoint,
      url: fullUrl,
      status: 'ERR',
      durationMs,
      requestBody: payload,
      error: errMsg,
    });

    console.error('[notificationApi] Network error when requesting push notification from backend:', error);
    return false;
  }
}

