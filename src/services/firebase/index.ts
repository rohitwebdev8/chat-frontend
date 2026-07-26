/**
 * Firebase service barrel export.
 *
 * All Firebase service consumers should import from this file only:
 *
 *   import { getRooms, subscribeToRoomMessages } from '@/services/firebase';
 *   import { uploadVoice } from '@/services/firebase';
 *
 * This keeps the import surface stable. If an underlying file is renamed
 * or refactored, only this file needs to change.
 */

// Core singletons
export { app, db, storage } from './config';

// Firestore types
export type {
  LastMessagePayload,
  Message,
  MessageType,
  Room,
} from './firestore';

// Firestore helpers
export {
  getRooms,
  sendTextMessage,
  sendVoiceMessage,
  subscribeToRooms,
  subscribeToRoomMessages,
  updateRoomLastMessage,
} from './firestore';

// Storage types
export type { UploadProgressCallback } from './storage';

// Storage helpers
export { deleteVoice, getVoiceDownloadUrl, uploadVoice, uploadVoiceMessage } from './storage';
