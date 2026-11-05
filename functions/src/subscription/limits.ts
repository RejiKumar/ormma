// Server-side limit checks. The app shows plan messages, but only these checks decide.
import { HttpsError } from "firebase-functions/v2/https";
import { Timestamp, type Transaction } from "firebase-admin/firestore";
import { getDb } from "../db";
import { readEntitlement } from "./entitlement";
import { limitsFor, type EntitlementLike } from "./plan";

export type PlanReason = "plan_parent_limit" | "plan_member_limit";

/** Error the app recognises by `details.reason` and answers with a fixed plan message. */
export function planError(reason: PlanReason): HttpsError {
  const message =
    reason === "plan_parent_limit"
      ? "The current plan includes a limited number of parents."
      : "The current plan includes a limited number of members.";
  return new HttpsError("resource-exhausted", message, { reason });
}

/** Refuses when the owner already has as many parents as the plan allows. */
export async function assertCanCreateParent(uid: string, now = Date.now()): Promise<void> {
  const db = getDb();
  const [entitlement, owned] = await Promise.all([
    readEntitlement(uid),
    db.collection("parents").where("createdBy", "==", uid).count().get(),
  ]);
  if (owned.data().count >= limitsFor(entitlement, now).parents) throw planError("plan_parent_limit");
}

/** Refuses an invite when members plus unused, unexpired invites already fill the plan's slots. */
export async function assertCanInvite(parentId: string, ownerUid: string, now = Date.now()): Promise<void> {
  const db = getDb();
  const [entitlement, members, pending] = await Promise.all([
    readEntitlement(ownerUid),
    db.collection(`parents/${parentId}/members`).count().get(),
    db
      .collection("invites")
      .where("parentId", "==", parentId)
      .where("usedBy", "==", null)
      .where("expiresAt", ">", Timestamp.fromMillis(now))
      .count()
      .get(),
  ]);
  if (members.data().count + pending.data().count >= limitsFor(entitlement, now).membersPerParent) {
    throw planError("plan_member_limit");
  }
}

/**
 * Inside the redeem transaction: refuses when the parent already has as many members as the owner's
 * plan allows. Reads happen before the caller's writes, as Firestore transactions require.
 */
export async function assertSlotInTransaction(
  tx: Transaction,
  parentId: string,
  ownerUid: string,
  now = Date.now(),
): Promise<void> {
  const db = getDb();
  const [members, entitlementSnap] = await Promise.all([
    tx.get(db.collection(`parents/${parentId}/members`)),
    tx.get(db.doc(`subscriptions/${ownerUid}`)),
  ]);
  const data = entitlementSnap.data() as { status: EntitlementLike["status"]; expiresAt: Timestamp } | undefined;
  const entitlement = data ? { status: data.status, expiresAtMs: data.expiresAt.toMillis() } : null;
  if (members.size >= limitsFor(entitlement, now).membersPerParent) throw planError("plan_member_limit");
}
