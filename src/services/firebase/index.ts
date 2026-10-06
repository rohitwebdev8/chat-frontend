/**
 * Firebase service barrel export for PACE.
 */

// Core singletons
export { app, db, storage } from './config';

// Auth helpers
export { ensureAuth, getUID, getCurrentUser, isProfileSet, setupProfile, logout, onUIDChange } from './authService';

// Firestore Chat & Rooms
export * from './firestore';

// Storage
export * from './storage';

// Personal OS (Firestore CRUD)
export * from './personalOS';
