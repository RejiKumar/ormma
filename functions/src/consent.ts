import { onCall, type CallableRequest } from "firebase-functions/v2/https";
import { getDb } from "./db";
import { Timestamp } from "firebase-admin/firestore";

const isOwnerOrEditor = async (db: ReturnType<typeof getDb>, parentId: string, uid: string) => {
  const snap = await db.doc(`parents/${parentId}/members/${uid}`).get();
  if (!snap.exists) return false;
  const role = (snap.data() as { role?: string } | undefined)?.role;
  return role === "owner" || role === "editor";
};

export interface ConsentPayload {
  parentId: string;
  method?: "call_voice" | "call_dtmf" | "family_attested";
}

export const revokeConsentHandler = async (request: CallableRequest<ConsentPayload>) => {
  const uid = request.auth?.uid;
  if (!uid) throw new Error("unauthenticated");
  const parentId = request.data?.parentId;
  if (typeof parentId !== "string") throw new Error("invalid");
  const db = getDb();
  if (!(await isOwnerOrEditor(db, parentId, uid))) throw new Error("permission-denied");

  const parentRef = db.doc(`parents/${parentId}`);
  const parentSnap = await parentRef.get();
  const parent = parentSnap.data() as { consent?: { revokedAt?: unknown; regrantedAt?: unknown } } | undefined;
  const now = Timestamp.now();
  const revokedAt = parent?.consent?.revokedAt ?? now;

  await parentRef.update({
    "consent.status": "revoked",
    "consent.revokedAt": revokedAt,
    "consent.regrantedAt": null,
    "consent.method": request.data?.method ?? "family_attested",
  });

  return { ok: true };
};

export const grantConsentHandler = async (request: CallableRequest<ConsentPayload>) => {
  const uid = request.auth?.uid;
  if (!uid) throw new Error("unauthenticated");
  const parentId = request.data?.parentId;
  if (typeof parentId !== "string") throw new Error("invalid");
  const db = getDb();
  if (!(await isOwnerOrEditor(db, parentId, uid))) throw new Error("permission-denied");

  const parentRef = db.doc(`parents/${parentId}`);
  const now = Timestamp.now();

  await parentRef.update({
    "consent.status": "granted",
    "consent.grantedAt": now,
    "consent.regrantedAt": now,
    "consent.method": request.data?.method ?? "family_attested",
  });

  return { ok: true };
};
