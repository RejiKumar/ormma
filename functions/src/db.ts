import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Lazy init: the emulator test process sets FIRESTORE_EMULATOR_HOST before the first call,
// and the deployed runtime has FIREBASE_CONFIG provided by the platform.
export function ensureAdminApp(): void {
  if (getApps().length === 0) {
    initializeApp();
  }
}

export function getDb(): Firestore {
  ensureAdminApp();
  return getFirestore();
}
