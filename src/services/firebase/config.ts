import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

/**
 * Credentials sourced from google-services.json:
 *   apiKey            → client[0].api_key[0].current_key
 *   appId             → client[0].client_info.mobilesdk_app_id
 *   projectId         → project_info.project_id
 *   storageBucket     → project_info.storage_bucket
 *   messagingSenderId → project_info.project_number
 *
 * authDomain is not present in google-services.json.
 * It follows the pattern: <projectId>.firebaseapp.com
 */
const firebaseConfig = {
  apiKey: 'AIzaSyDojuRWDgrppTLW2XsvVOouSfE3c9lXLW8',
  appId: '1:767613699062:android:793598e2bfd842e75bbdd7',
  projectId: 'curomates-chat-app',
  storageBucket: 'curomates-chat-app.firebasestorage.app',
  messagingSenderId: '767613699062',
  authDomain: 'curomates-chat-app.firebaseapp.com',
};

/**
 * Initialise Firebase only once.
 *
 * Expo Fast Refresh re-executes module code on every save.
 * Checking getApps().length prevents the
 * "Firebase App named '[DEFAULT]' already exists" error.
 */
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, db, storage };
