import {
  deleteObject,
  getDownloadURL,
  ref,
  StorageReference,
  uploadBytesResumable,
} from 'firebase/storage';
import { storage } from './config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadProgressCallback {
  (progress: number): void;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Uploads a voice recording to Firebase Storage.
 *
 * The file at `localUri` is fetched as a Blob and uploaded to `storagePath`.
 * An optional `onProgress` callback receives upload progress as a value
 * between 0 and 1, useful for driving a progress indicator.
 *
 * @param localUri    - The local file URI returned by expo-av (e.g. file://...).
 * @param storagePath - Destination path in Storage (e.g. "voice/roomId/timestamp.m4a").
 * @param onProgress  - Optional callback invoked with upload progress (0–1).
 * @returns Promise resolving to the public download URL of the uploaded file.
 *
 * @example
 * const url = await uploadVoice(
 *   recording.getURI(),
 *   `voice/${roomId}/${Date.now()}.m4a`,
 *   (p) => setProgress(p),
 * );
 */
export async function uploadVoice(
  localUri: string,
  storagePath: string,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const storageRef: StorageReference = ref(storage, storagePath);

  return new Promise<string>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          const progress = snapshot.bytesTransferred / snapshot.totalBytes;
          onProgress(progress);
        }
      },
      (error) => reject(error),
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (error) {
          reject(error);
        }
      },
    );
  });
}

/**
 * Deletes a voice file from Firebase Storage by its storage path.
 *
 * @param storagePath - The exact path in Storage that was used during upload
 *                      (e.g. "voice/roomId/timestamp.m4a").
 */
export async function deleteVoice(storagePath: string): Promise<void> {
  const storageRef: StorageReference = ref(storage, storagePath);
  await deleteObject(storageRef);
}

/**
 * Retrieves the public download URL for a file at the given storage path.
 *
 * Use this when you have a storage path but need the HTTPS URL,
 * for example when rendering audio or images from Storage.
 *
 * @param storagePath - The path in Storage (e.g. "voice/roomId/timestamp.m4a").
 * @returns Promise resolving to the HTTPS download URL.
 */
export async function getVoiceDownloadUrl(storagePath: string): Promise<string> {
  const storageRef: StorageReference = ref(storage, storagePath);
  return getDownloadURL(storageRef);
}

/**
 * Uploads a voice recording for a specific chat room to Firebase Storage.
 *
 * Builds a collision-safe storage path automatically:
 *   voice-messages/{roomId}/{timestamp}-{random}.m4a
 *
 * This is the preferred function for the voice message send pipeline.
 * Do not build the storage path in the UI layer — use this instead.
 *
 * @param localUri   - The local file URI returned by expo-audio (e.g. file://...).
 * @param roomId     - Firestore document ID of the room (used as a storage subfolder).
 * @param onProgress - Optional callback invoked with upload progress (0–1).
 * @returns Promise resolving to the public download URL of the uploaded file.
 */
export async function uploadVoiceMessage(
  localUri: string,
  roomId: string,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  const suffix = Math.random().toString(36).slice(2, 8);
  const filename = `${Date.now()}-${suffix}.m4a`;
  const storagePath = `voice-messages/${roomId}/${filename}`;
  return uploadVoice(localUri, storagePath, onProgress);
}

