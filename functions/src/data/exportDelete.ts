import { onCall, type CallableRequest } from "firebase-functions/v2/https";
import { getDb } from "../db";
import { getStorage } from "firebase-admin/storage";
import { Timestamp } from "firebase-admin/firestore";

const isOwner = async (db: ReturnType<typeof getDb>, parentId: string, uid: string) => {
  const snap = await db.doc(`parents/${parentId}/members/${uid}`).get();
  if (!snap.exists) return false;
  const role = (snap.data() as { role?: string } | undefined)?.role;
  return role === "owner";
};

export interface ParentScopedPayload {
  parentId: string;
}

export const exportParentDataHandler = async (request: CallableRequest<ParentScopedPayload>) => {
  const uid = request.auth?.uid;
  if (!uid) throw new Error("unauthenticated");
  const parentId = request.data?.parentId;
  if (typeof parentId !== "string") throw new Error("invalid");
  const db = getDb();
  if (!(await isOwner(db, parentId, uid))) throw new Error("permission-denied");

  const [parent, members, medicines, doseEvents, healthLogs, callSessions, prescriptions, alerts, invites] = await Promise.all([
    db.doc(`parents/${parentId}`).get(),
    db.collection(`parents/${parentId}/members`).get(),
    db.collection(`parents/${parentId}/medicines`).get(),
    db.collection(`parents/${parentId}/doseEvents`).get(),
    db.collection(`parents/${parentId}/healthLogs`).get(),
    db.collection(`parents/${parentId}/callSessions`).get(),
    db.collection(`parents/${parentId}/prescriptions`).get(),
    db.collection(`parents/${parentId}/alerts`).get(),
    db.collection("invites").where("parentId", "==", parentId).get(),
  ]);

  const data: Record<string, unknown> = {
    parent: parent.exists ? parent.data() : null,
    members: members.docs.map((d) => ({ id: d.id, ...d.data() })),
    medicines: medicines.docs.map((d) => ({ id: d.id, ...d.data() })),
    doseEvents: doseEvents.docs.map((d) => ({ id: d.id, ...d.data() })),
    healthLogs: healthLogs.docs.map((d) => ({ id: d.id, ...d.data() })),
    callSessions: callSessions.docs.map((d) => ({ id: d.id, ...d.data() })),
    prescriptions: prescriptions.docs.map((d) => ({ id: d.id, ...d.data() })),
    alerts: alerts.docs.map((d) => ({ id: d.id, ...d.data() })),
    invites: invites.docs.map((d) => ({ id: d.id, ...d.data() })),
  };

  console.info("data: export", { parentId });
  return data;
};

export const exportParentData = onCall({ region: "asia-south1" }, exportParentDataHandler);

export const deleteParentHandler = async (request: CallableRequest<ParentScopedPayload>) => {
  const uid = request.auth?.uid;
  if (!uid) throw new Error("unauthenticated");
  const parentId = request.data?.parentId;
  if (typeof parentId !== "string") throw new Error("invalid");
  const db = getDb();
  if (!(await isOwner(db, parentId, uid))) throw new Error("permission-denied");

  const bucket = getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET || process.env.STORAGE_BUCKET);
  try {
    await bucket.deleteFiles({ prefix: `prescriptions/${parentId}/` });
  } catch {
    // best effort
  }

  const collections = ["members", "medicines", "doseEvents", "healthLogs", "callSessions", "prescriptions", "alerts"];
  for (const col of collections) {
    const snap = await db.collection(`parents/${parentId}/${col}`).get();
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    if (snap.size > 0) await batch.commit();
  }

  try {
    const invites = await db.collection("invites").where("parentId", "==", parentId).get();
    if (!invites.empty) {
      const batch = db.batch();
      for (const doc of invites.docs) batch.delete(doc.ref);
      await batch.commit();
    }
  } catch {
    // best effort
  }

  await db.doc(`parents/${parentId}`).delete();

  await db.collection("auditLogs").add({
    actor: uid,
    action: "parent_deleted",
    parentId,
    at: Timestamp.now(),
  });

  console.info("data: delete", { parentId });
  return { deleted: true };
};

export const deleteParent = onCall({ region: "asia-south1" }, deleteParentHandler);
