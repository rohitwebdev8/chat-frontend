/**
 * Firebase config — Expo / React Native (JS SDK, modular).
 * Auth is handled locally (AsyncStorage + UUID) — no Firebase Auth SDK needed.
 * Firestore: memoryLocalCache for React Native, persistentLocalCache for web.
 */

import { Platform } from 'react-native';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Firestore,
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDojuRWDgrppTLW2XsvVOouSfE3c9lXLW8',
  appId: '1:767613699062:android:793598e2bfd842e75bbdd7',
  projectId: 'curomates-chat-app',
  storageBucket: 'curomates-chat-app.firebasestorage.app',
  messagingSenderId: '767613699062',
  authDomain: 'curomates-chat-app.firebaseapp.com',
};

// ── App singleton ──────────────────────────────────────────────────────────────
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ── Firestore with platform-appropriate cache ──────────────────────────────────
let db: Firestore;
try {
  const localCache =
    Platform.OS === 'web'
      ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      : memoryLocalCache();

  db = initializeFirestore(app, { localCache });
} catch {
  // Already initialized (Fast Refresh)
  db = getFirestore(app);
}

const storage: FirebaseStorage = getStorage(app);

export { app, db, storage };
