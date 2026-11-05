import { getDb } from "../db";
import { entitlementDoc, tokenHashOf } from "./entitlement";
import type { PlayClient } from "./play";

/** Google Play Real-time Developer Notification payload (the fields this handler uses). */
export interface PlayNotification {
  packageName?: string;
  subscriptionNotification?: { notificationType?: number; purchaseToken?: string };
  voidedPurchaseNotification?: { purchaseToken?: string };
}

/** SUBSCRIPTION_REVOKED: the purchase was revoked, so the entitlement ends at once. */
const REVOKED = 12;

/**
 * Applies one Play notification. It re-reads the subscription from Google instead of trusting the
 * message body, finds the account by the token hash, and is idempotent: the same message twice leaves
 * the same document. Tokens this app never verified are ignored. Logs uid and status only.
 */
export async function playBillingEventsHandler(
  notification: PlayNotification,
  play: PlayClient,
): Promise<"updated" | "ignored"> {
  const token =
    notification.subscriptionNotification?.purchaseToken ??
    notification.voidedPurchaseNotification?.purchaseToken;
  if (!token) return "ignored";
  const db = getDb();
  const found = await db.collection("subscriptions").where("tokenHash", "==", tokenHashOf(token)).limit(1).get();
  if (found.empty) return "ignored";
  const doc = found.docs[0];
  const current = doc.data() as { productId: string; tokenHash: string; expiresAt: { toMillis(): number } };

  const refunded =
    notification.voidedPurchaseNotification !== undefined ||
    notification.subscriptionNotification?.notificationType === REVOKED;
  if (refunded) {
    await doc.ref.set(
      entitlementDoc({
        status: "refunded",
        productId: current.productId,
        tokenHash: current.tokenHash,
        expiresAtMs: current.expiresAt.toMillis(),
      }),
    );
    console.log(`playBillingEvents ok uid=${doc.id} status=refunded`);
    return "updated";
  }

  const purchase = await play.getSubscription(token);
  if (purchase.status === null) return "ignored";
  await doc.ref.set(
    entitlementDoc({
      status: purchase.status,
      productId: purchase.productId,
      tokenHash: current.tokenHash,
      expiresAtMs: purchase.expiresAtMs,
    }),
  );
  console.log(`playBillingEvents ok uid=${doc.id} status=${purchase.status}`);
  return "updated";
}
