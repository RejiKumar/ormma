import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Lazy init: the emulator test process sets FIRESTORE_EMULATOR_HOST before the first call,
// and the deployed runtime has FIREBASE_CONFIG provided by the platform.
//
// Check for the DEFAULT app, not for "any app": in the deployed runtime another, named app can
// already exist, and `getApps().length === 0` then skipped initializeApp(), so every Firestore access
// threw "The default Firebase app does not exist" (createParent failed with code=internal).
export function ensureAdminApp(): void {
  if (!getApps().some((app) => app.name === "[DEFAULT]")) {
    initializeApp();
  }
}

/** The default app, creating it first if needed. */
export function defaultAdminApp() {
  ensureAdminApp();
  return getApp();
}

export function getDb(): Firestore {
  return getFirestore(defaultAdminApp());
}
