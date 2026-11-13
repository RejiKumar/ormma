import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import type { SubscriptionDoc } from "../../../shared/types";
import { getDb } from "../db";
import type { EntitlementLike } from "./plan";

export const tokenHashOf = (purchaseToken: string): string =>
  createHash("sha256").update(purchaseToken).digest("hex");

/** The entitlement of an account, or null. Used by every limit check. */
export async function readEntitlement(uid: string): Promise<EntitlementLike | null> {
  const snap = await getDb().doc(`subscriptions/${uid}`).get();
  if (!snap.exists) return null;
  const data = snap.data() as SubscriptionDoc;
  return { status: data.status, expiresAtMs: data.expiresAt.toMillis() };
}

export function entitlementDoc(
  fields: Pick<SubscriptionDoc, "status" | "productId" | "tokenHash" | "trial" | "autoRenew" | "paymentIssue"> & {
    expiresAtMs: number;
  },
): SubscriptionDoc {
  return {
    status: fields.status,
    productId: fields.productId,
    expiresAt: Timestamp.fromMillis(fields.expiresAtMs),
    tokenHash: fields.tokenHash,
    updatedAt: Timestamp.now(),
    // Never the token or order details: only what the Subscription screen needs to say.
    trial: fields.trial ?? false,
    autoRenew: fields.autoRenew ?? false,
    paymentIssue: fields.paymentIssue ?? null,
  };
}
