import { getAuth } from "firebase-admin/auth";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { getDb } from "./db";

export type DeleteAuthUser = (uid: string) => Promise<void>;
const defaultDeleteAuthUser: DeleteAuthUser = async (uid) => {
  await getAuth().deleteUser(uid);
};

/**
 * Deletes the caller's own data: their memberships, profile, entitlement and unused invites they
 * created, then the sign-in account. Refuses while the caller owns a parent (they delete those first)
 * so other members' data is never touched. Logs the uid and a status only.
 */
export async function deleteMyAccountHandler(
  request: CallableRequest,
  deleteAuthUser: DeleteAuthUser = defaultDeleteAuthUser,
): Promise<{ deleted: true }> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const db = getDb();
  const owned = await db.collection("parents").where("createdBy", "==", uid).get();
  if (!owned.empty) {
    throw new HttpsError("failed-precondition", "Delete the parents you own first.", {
      reason: "owns_parents",
      parentIds: owned.docs.map((d) => d.id),
    });
  }

  // Memberships: the list of parents is small enough to scan, as listMyParents does.
  const parents = await db.collection("parents").get();
  const memberRefs = parents.docs.map((p) => db.doc(`parents/${p.id}/members/${uid}`));
  const memberSnaps = memberRefs.length > 0 ? await db.getAll(...memberRefs) : [];
  const invites = await db.collection("invites").where("createdBy", "==", uid).where("usedBy", "==", null).get();

  const batch = db.batch();
  memberSnaps.forEach((snap) => {
    if (snap.exists) batch.delete(snap.ref);
  });
  invites.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(db.doc(`users/${uid}`));
  batch.delete(db.doc(`subscriptions/${uid}`));
  await batch.commit();

  await deleteAuthUser(uid);
  console.log(`deleteMyAccount ok uid=${uid} status=deleted`);
  return { deleted: true };
}

const MAX_DISPLAY_NAME = 60;

/**
 * Sets the caller's display name on their profile and on every member document they have, so other
 * members see the new name. Names are shown as typed; nothing about them is logged.
 */
export async function setMyDisplayNameHandler(
  request: CallableRequest<{ displayName?: unknown }>,
): Promise<{ ok: true }> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const raw = request.data?.displayName;
  const name = typeof raw === "string" ? raw.trim() : "";
  if (name.length === 0 || name.length > MAX_DISPLAY_NAME) {
    throw new HttpsError("invalid-argument", "A name of 1 to 60 characters is required.");
  }

  const db = getDb();
  const parents = await db.collection("parents").get();
  const memberRefs = parents.docs.map((p) => db.doc(`parents/${p.id}/members/${uid}`));
  const memberSnaps = memberRefs.length > 0 ? await db.getAll(...memberRefs) : [];
  const batch = db.batch();
  memberSnaps.forEach((snap) => {
    if (snap.exists) batch.update(snap.ref, { displayName: name });
  });
  batch.set(db.doc(`users/${uid}`), { displayName: name }, { merge: true });
  await batch.commit();
  console.log(`setMyDisplayName ok uid=${uid} status=saved`);
  return { ok: true };
}
