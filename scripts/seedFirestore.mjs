/**
 * Firestore Seed Script
 *
 * Creates the initial rooms collection with seed data.
 * Safe to re-run — uses setDoc with merge:false only if the document
 * doesn't already exist (checked before writing).
 *
 * Run from the chatFrontend directory:
 *   node scripts/seedFirestore.mjs
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';

// ─── Firebase config (mirrors src/services/firebase/config.ts) ────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyDojuRWDgrppTLW2XsvVOouSfE3c9lXLW8',
  appId: '1:767613699062:android:793598e2bfd842e75bbdd7',
  projectId: 'curomates-chat-app',
  storageBucket: 'curomates-chat-app.firebasestorage.app',
  messagingSenderId: '767613699062',
  authDomain: 'curomates-chat-app.firebaseapp.com',
};

// ─── Seed data ────────────────────────────────────────────────────────────────
const ROOMS = [
  {
    id: 'General',
    name: 'General',
    description: 'General discussion for everyone',
    lastMessage: 'Welcome to General! 👋',
    lastSender: 'System',
    lastMessageAt: Timestamp.now(),
  },
  {
    id: 'Random',
    name: 'Random',
    description: 'Random thoughts and ideas',
    lastMessage: 'Share anything here',
    lastSender: 'System',
    lastMessageAt: Timestamp.now(),
  },
  {
    id: 'Dev',
    name: 'Dev',
    description: 'Engineering and development chat',
    lastMessage: 'Talk code here 💻',
    lastSender: 'System',
    lastMessageAt: Timestamp.now(),
  },
];

// ─── Seed messages per room ───────────────────────────────────────────────────
const SEED_MESSAGES = {
  General: [
    {
      type: 'text',
      senderId: 'system',
      senderName: 'System',
      text: 'Welcome to the General room! 👋',
      createdAt: Timestamp.now(),
    },
  ],
  Random: [
    {
      type: 'text',
      senderId: 'system',
      senderName: 'System',
      text: 'This is the Random room. Share anything here!',
      createdAt: Timestamp.now(),
    },
  ],
  Dev: [
    {
      type: 'text',
      senderId: 'system',
      senderName: 'System',
      text: 'Welcome to the Dev room. Talk code here 💻',
      createdAt: Timestamp.now(),
    },
  ],
};

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🔥 Connecting to Firebase project:', firebaseConfig.projectId);

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('\n📦 Seeding rooms collection...\n');

  for (const room of ROOMS) {
    const roomRef = doc(db, 'rooms', room.id);
    const existing = await getDoc(roomRef);

    if (existing.exists()) {
      console.log(`  ⏭  Skipped  rooms/${room.id}  (already exists)`);
    } else {
      const { id, ...roomData } = room;
      await setDoc(roomRef, roomData);
      console.log(`  ✅ Created  rooms/${room.id}`);

      // Seed initial messages into the room's subcollection
      const messages = SEED_MESSAGES[id] ?? [];
      for (const message of messages) {
        const msgRef = doc(collection(db, 'rooms', id, 'messages'));
        await setDoc(msgRef, message);
        console.log(`     💬 Added seed message to rooms/${id}/messages`);
      }
    }
  }

  console.log('\n✅ Seeding complete. Your app should now show rooms.\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌ Seed failed:', err.message ?? err);
  process.exit(1);
});
