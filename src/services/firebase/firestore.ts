import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore';
import { db } from './config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  name: string;
  lastMessage: string;
  lastSender: string;
  lastMessageAt: Timestamp | null;
}

export type MessageType = 'text' | 'voice';

export interface Message {
  id: string;
  type: MessageType;
  senderId: string;
  senderName: string;
  text?: string;
  downloadUrl?: string;
  durationSeconds?: number;
  createdAt: Timestamp;
}

export interface LastMessagePayload {
  lastMessage: string;
  lastSender: string;
  lastMessageAt: ReturnType<typeof serverTimestamp>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps a raw Firestore QuerySnapshot document to a typed Room.
 * Keeps mapping logic in one place so it never drifts.
 */
function documentToRoom(id: string, data: DocumentData): Room {
  return {
    id,
    name: data.name ?? '',
    lastMessage: data.lastMessage ?? '',
    lastSender: data.lastSender ?? '',
    lastMessageAt: data.lastMessageAt ?? null,
  };
}

/**
 * Maps a raw Firestore QuerySnapshot document to a typed Message.
 */
function documentToMessage(id: string, data: DocumentData): Message {
  return {
    id,
    type: data.type,
    senderId: data.senderId,
    senderName: data.senderName,
    text: data.text,
    downloadUrl: data.downloadUrl,
    durationSeconds: data.durationSeconds,
    createdAt: data.createdAt,
  };
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Fetches the full list of chat rooms once.
 *
 * @returns Promise resolving to an array of Room objects.
 */
export async function getRooms(): Promise<Room[]> {
  const snapshot: QuerySnapshot = await getDocs(collection(db, 'rooms'));
  return snapshot.docs.map((docSnap) => documentToRoom(docSnap.id, docSnap.data()));
}

/**
 * Subscribes to real-time messages in a room, ordered by creation time ascending.
 *
 * The caller is responsible for invoking the returned unsubscribe function
 * when the subscription is no longer needed (e.g., on component unmount).
 *
 * @param roomId   - Firestore document ID of the room.
 * @param onChange - Callback invoked with the updated messages array on every snapshot.
 * @returns Unsubscribe function that stops the listener.
 */
export function subscribeToRoomMessages(
  roomId: string,
  onChange: (messages: Message[]) => void,
): Unsubscribe {
  const messagesQuery = query(
    collection(db, 'rooms', roomId, 'messages'),
    orderBy('createdAt', 'asc'),
  );

  return onSnapshot(messagesQuery, (snapshot: QuerySnapshot) => {
    const messages = snapshot.docs.map((docSnap) =>
      documentToMessage(docSnap.id, docSnap.data()),
    );
    onChange(messages);
  });
}

/**
 * Subscribes to the rooms collection in real time, ordered by last activity descending.
 *
 * The caller is responsible for invoking the returned unsubscribe function
 * when the subscription is no longer needed (e.g., on component unmount).
 *
 * @param onChange - Callback invoked with the updated Room array on every snapshot.
 * @param onError  - Optional callback invoked if the listener encounters an error.
 * @returns Unsubscribe function that stops the listener.
 */
export function subscribeToRooms(
  onChange: (rooms: Room[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const roomsQuery = query(
    collection(db, 'rooms'),
    orderBy('lastMessageAt', 'desc'),
  );

  return onSnapshot(
    roomsQuery,
    (snapshot: QuerySnapshot) => {
      const rooms = snapshot.docs.map((docSnap) =>
        documentToRoom(docSnap.id, docSnap.data()),
      );
      onChange(rooms);
    },
    onError,
  );
}

/**
 * Sends a text message to a room's messages subcollection.
 *
 * @param roomId     - Firestore document ID of the target room.
 * @param senderId   - UID or unique identifier of the sender.
 * @param senderName - Display name of the sender.
 * @param text       - The message body.
 */
export async function sendTextMessage(
  roomId: string,
  senderId: string,
  senderName: string,
  text: string,
): Promise<void> {
  await addDoc(collection(db, 'rooms', roomId, 'messages'), {
    type: 'text' satisfies MessageType,
    senderId,
    senderName,
    text,
    createdAt: serverTimestamp(),
  });
}

/**
 * Sends a voice message to a room's messages subcollection.
 *
 * @param roomId          - Firestore document ID of the target room.
 * @param senderId        - UID or unique identifier of the sender.
 * @param senderName      - Display name of the sender.
 * @param downloadUrl     - Firebase Storage download URL for the audio file.
 * @param durationSeconds - Duration of the audio in seconds.
 */
export async function sendVoiceMessage(
  roomId: string,
  senderId: string,
  senderName: string,
  downloadUrl: string,
  durationSeconds: number,
): Promise<void> {
  await addDoc(collection(db, 'rooms', roomId, 'messages'), {
    type: 'voice' satisfies MessageType,
    senderId,
    senderName,
    downloadUrl,
    durationSeconds,
    createdAt: serverTimestamp(),
  });
}

/**
 * Updates the room document's last message preview fields.
 *
 * Call this after every successful sendTextMessage or sendVoiceMessage
 * so the Rooms list always shows the latest activity.
 *
 * @param roomId      - Firestore document ID of the room to update.
 * @param lastMessage - Short preview string (e.g. the text or "Voice message").
 * @param lastSender  - Display name of the user who sent the last message.
 */
export async function updateRoomLastMessage(
  roomId: string,
  lastMessage: string,
  lastSender: string,
): Promise<void> {
  await updateDoc(doc(db, 'rooms', roomId), {
    lastMessage,
    lastSender,
    lastMessageAt: serverTimestamp(),
  } satisfies Omit<LastMessagePayload, 'lastMessageAt'> & { lastMessageAt: ReturnType<typeof serverTimestamp> });
}
