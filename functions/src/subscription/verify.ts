import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { getDb } from "../db";
import { entitlementDoc, tokenHashOf } from "./entitlement";
import { PRODUCT_IDS, type PlayClient } from "./play";

export interface VerifyPurchasePayload {
  productId?: unknown;
  purchaseToken?: unknown;
}

/**
 * Checks a purchase with Google Play, acknowledges it, and stores the entitlement for the caller. Logs
 * the uid and the status only: never the token or order details (hard rule 6 and the data-protection spec).
 */
export async function verifyPurchaseHandler(
  request: CallableRequest<VerifyPurchasePayload>,
  play: PlayClient,
): Promise<{ status: string; expiresAtMs: number }> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const { productId, purchaseToken } = request.data ?? {};
  if (typeof purchaseToken !== "string" || purchaseToken.length < 10 || purchaseToken.length > 4096) {
    throw new HttpsError("invalid-argument", "A purchase token is required.");
  }
  if (typeof productId !== "string" || !(PRODUCT_IDS as readonly string[]).includes(productId)) {
    throw new HttpsError("invalid-argument", "Unknown product.");
  }

  let purchase;
  try {
    purchase = await play.getSubscription(purchaseToken);
  } catch {
    console.warn(`verifyPurchase failed uid=${uid} status=lookup_failed`);
    throw new HttpsError("failed-precondition", "The purchase could not be verified.");
  }
  if (purchase.productId !== productId || purchase.status === null) {
    throw new HttpsError("failed-precondition", "The purchase could not be verified.");
  }
  if (purchase.accountId !== null && purchase.accountId !== uid) {
    console.warn(`verifyPurchase refused uid=${uid} status=account_mismatch`);
    throw new HttpsError("permission-denied", "This purchase belongs to another account.");
  }

  const hash = tokenHashOf(purchaseToken);
  const db = getDb();
  const linked = await db.collection("subscriptions").where("tokenHash", "==", hash).limit(2).get();
  if (linked.docs.some((d) => d.id !== uid)) {
    console.warn(`verifyPurchase refused uid=${uid} status=token_linked_elsewhere`);
    throw new HttpsError("permission-denied", "This purchase belongs to another account.");
  }

  if (!purchase.acknowledged) {
    try {
      await play.acknowledge(purchase.productId, purchaseToken);
    } catch {
      console.warn(`verifyPurchase failed uid=${uid} status=acknowledge_failed`);
      throw new HttpsError("unavailable", "The purchase could not be confirmed. Try again.");
    }
  }

  await db.doc(`subscriptions/${uid}`).set(
    entitlementDoc({
      status: purchase.status,
      productId: purchase.productId,
      tokenHash: hash,
      expiresAtMs: purchase.expiresAtMs,
    }),
  );
  console.log(`verifyPurchase ok uid=${uid} status=${purchase.status}`);
  return { status: purchase.status, expiresAtMs: purchase.expiresAtMs };
}
