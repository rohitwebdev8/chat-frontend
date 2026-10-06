/**
 * Firebase service barrel export for PACE.
 */

// Core singletons (no auth export — auth is local/AsyncStorage)
export { app, db, storage } from './config';

// Auth helpers (local profile-based)
export { ensureAuth, getUID, getCurrentUser, isProfileSet, setupProfile, logout, onUIDChange } from './authService';

// Personal OS (Firestore CRUD)
export * from './personalOS';
