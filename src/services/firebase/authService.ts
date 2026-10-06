/**
 * authService.ts — Local profile auth (no Firebase Auth).
 * User enters name + email once; a UUID is generated as their UID
 * and persisted in AsyncStorage. All Firestore data lives at users/{uid}/...
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './config';

const KEY_UID   = '@pace_uid';
const KEY_NAME  = '@pace_name';
const KEY_EMAIL = '@pace_email';

let _uid:   string | null = null;
let _name:  string | null = null;
let _email: string | null = null;

// ── Simple UUID v4 (no external dep) ─────────────────────────────────────────
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── Boot: load persisted profile from AsyncStorage ────────────────────────────
let _readyResolve: (() => void) | undefined;
const _ready: Promise<void> = new Promise((res) => { _readyResolve = res; });

(async () => {
  try {
    _uid   = await AsyncStorage.getItem(KEY_UID);
    _name  = await AsyncStorage.getItem(KEY_NAME);
    _email = await AsyncStorage.getItem(KEY_EMAIL);
  } catch {}
  _readyResolve?.();
  _readyResolve = undefined;
})();

export function ensureAuth(): Promise<void> {
  return _ready;
}

/** Returns true if a profile has been set up. */
export function isProfileSet(): boolean {
  return !!_uid && !!_name;
}

/** Synchronous UID — throws if profile not yet set. */
export function getUID(): string {
  if (!_uid) throw new Error('[authService] Profile not set up yet');
  return _uid;
}

export function getCurrentUser() {
  if (!_uid) return null;
  return { uid: _uid, displayName: _name, email: _email };
}

/** Subscribe helper (no-op stub for compatibility). */
export function onUIDChange(cb: (uid: string | null) => void): () => void {
  cb(_uid);
  return () => {};
}

// ── One-time setup ────────────────────────────────────────────────────────────

/**
 * Called from the SetupScreen. Persists name+email locally,
 * generates a UUID, and creates the Firestore profile doc.
 */
export async function setupProfile(name: string, email: string): Promise<void> {
  const uid = uuidv4();

  await AsyncStorage.multiSet([
    [KEY_UID,   uid],
    [KEY_NAME,  name.trim()],
    [KEY_EMAIL, email.trim()],
  ]);

  _uid   = uid;
  _name  = name.trim();
  _email = email.trim();

  // Create Firestore profile doc
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        displayName: _name,
        email: _email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('[authService] Firestore profile write failed (offline?):', err);
  }
}

/** Clears local profile (logout / reset). */
export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_UID, KEY_NAME, KEY_EMAIL]);
  _uid = _name = _email = null;
}
