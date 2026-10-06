import { useCallback, useEffect, useState } from 'react';
import {
  resetRoomUnreadCount,
  sendTextMessage,
  sendVoiceMessage,
  subscribeToRoomMessages,
  updateRoomLastMessage,
  uploadVoiceMessage,
} from '@/services/firebase';
import type { Message as FirestoreMessage } from '@/services/firebase';
import { getStoredPushToken } from '@/services/notifications/pushService';
import { triggerPushNotification } from '@/services/api/notificationApi';

function formatRoomName(roomId: string): string {
  if (roomId.toLowerCase().endsWith('chat')) {
    return roomId;
  }
  return `${roomId} Chat`;
}

// ─── UI-layer Message type ────────────────────────────────────────────────────
// Matches what MessageList.tsx expects. Kept separate from the Firestore Message
// type so the component is never coupled to Firebase shapes.

export interface UIMessage {
  id: string;
  sender: string;
  /** For text messages: the message body. For voice messages: the formatted duration string. */
  text: string;
  time: string;
  type: string;
  /** Firebase Storage HTTPS URL — only present for voice messages. */
  downloadUrl?: string;
  /** Duration in seconds — only present for voice messages. */
  durationSeconds?: number;
}

interface UseMessagesResult {
  messages: UIMessage[];
  loading: boolean;
  error: string | null;
  inputText: string;
  onChangeText: (text: string) => void;
  onSend: () => Promise<void>;
  /** Upload a local audio file and create a Firestore voice message. */
  onSendVoice: (localUri: string, durationSeconds: number) => Promise<void>;
  /** True while a voice message is uploading to Storage. */
  isSendingVoice: boolean;
  /** Non-null when a voice send attempt failed. */
  voiceError: string | null;
}

/**
 * Manages real-time message subscription for a single chat room.
 *
 * Subscribes to the room's messages subcollection on mount and unsubscribes
 * on unmount — preventing memory leaks and unnecessary Firestore reads.
 *
 * Also owns the text input state and handles sending both text and voice messages.
 *
 * @param roomId      - Firestore document ID of the room to subscribe to.
 * @param senderId    - Unique ID for the current user (used as Firestore senderId).
 * @param senderName  - Display name for the current user.
 */
export function useMessages(
  roomId: string,
  senderId: string,
  senderName: string,
): UseMessagesResult {
  const [messages, setMessages]       = useState<UIMessage[]>([]);
  const [loading, setLoading]         = useState<boolean>(true);
  const [error]                       = useState<string | null>(null);
  const [inputText, setInputText]     = useState<string>('');
  const [isSendingVoice, setIsSendingVoice] = useState<boolean>(false);
  const [voiceError, setVoiceError]   = useState<string | null>(null);

  // ─── Real-time subscription ─────────────────────────────────────────────────
  useEffect(() => {
    // Reset unread count when opening the room
    resetRoomUnreadCount(roomId);

    const unsubscribe = subscribeToRoomMessages(roomId, (firestoreMessages) => {
      const mapped: UIMessage[] = firestoreMessages.map((msg) =>
        adaptMessage(msg),
      );
      setMessages(mapped);
      setLoading(false);
    });

    // Firestore listener cleanup — runs when roomId changes or component unmounts.
    return () => {
      unsubscribe();
    };
  }, [roomId]);

  // ─── Send text message ──────────────────────────────────────────────────────
  const onSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Clear input immediately for responsive feel before the async write completes.
    setInputText('');

    try {
      await sendTextMessage(roomId, senderId, senderName, trimmed);
      await updateRoomLastMessage(roomId, trimmed, senderName);

      // Trigger backend push notification asynchronously (after Firestore write success).
      // Wrap in try/catch to ensure notification failure NEVER breaks messaging.
      const senderToken = getStoredPushToken();
      if (senderToken) {
        triggerPushNotification({
          roomId,
          roomName: formatRoomName(roomId),
          senderName,
          senderToken,
          messageType: 'text',
          text: trimmed,
        }).catch((pushErr) => {
          console.warn('[useMessages] Notification trigger returned error:', pushErr);
        });
      }
    } catch (err) {
      console.error('[useMessages] Failed to send message:', err);
      // Restore the text so the user doesn't lose what they typed.
      setInputText(trimmed);
    }
  }, [inputText, roomId, senderId, senderName]);

  // ─── Send voice message ─────────────────────────────────────────────────────
  const onSendVoice = useCallback(async (localUri: string, durationSeconds: number) => {
    setIsSendingVoice(true);
    setVoiceError(null);

    try {
      // 1. Upload audio to Firebase Storage — obtain a public download URL.
      const downloadUrl = await uploadVoiceMessage(localUri, roomId);

      // 2. Only after Storage upload succeeds, create the Firestore document.
      //    This ensures we never have a Firestore message pointing to a missing file.
      await sendVoiceMessage(roomId, senderId, senderName, downloadUrl, durationSeconds);

      // 3. Update the room's last-message preview in the Rooms list.
      await updateRoomLastMessage(roomId, '🎤 Voice message', senderName);

      // 4. Trigger backend push notification asynchronously (after Storage + Firestore success).
      //    Wrap in try/catch to ensure notification failure NEVER breaks messaging.
      const senderToken = getStoredPushToken();
      if (senderToken) {
        triggerPushNotification({
          roomId,
          roomName: formatRoomName(roomId),
          senderName,
          senderToken,
          messageType: 'voice',
        }).catch((pushErr) => {
          console.warn('[useMessages] Notification trigger returned error:', pushErr);
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send voice message.';
      setVoiceError(message);
      console.error('[useMessages] onSendVoice failed:', err);
    } finally {
      setIsSendingVoice(false);
    }
  }, [roomId, senderId, senderName]);

  return {
    messages,
    loading,
    error,
    inputText,
    onChangeText: setInputText,
    onSend,
    onSendVoice,
    isSendingVoice,
    voiceError,
  };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Adapts a Firestore Message to the UIMessage shape expected by MessageList.
 */
function adaptMessage(msg: FirestoreMessage): UIMessage {
  return {
    id:             msg.id,
    sender:         msg.senderName,
    text:           msg.type === 'voice'
                      ? formatDuration(msg.durationSeconds)
                      : (msg.text ?? ''),
    time:           msg.createdAt ? formatTimestamp(msg.createdAt.toDate()) : '',
    type:           msg.type,
    downloadUrl:    msg.downloadUrl,
    durationSeconds: msg.durationSeconds,
  };
}

/**
 * Formats a JS Date to a short time string (e.g. "3:42 PM").
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formats a duration in seconds to "m:ss" format (e.g. 68 → "1:08").
 * Used as the display text for voice messages.
 */
function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
