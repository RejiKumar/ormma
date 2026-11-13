// Google Play Developer API client for subscriptions, behind an interface so tests use a fake.
// The raw purchase token is only ever passed to Google from memory; it is never stored or logged.
import type { SubscriptionPaymentIssue, SubscriptionStatus } from "../../../shared/types";

export const PACKAGE_NAME = "com.ormma.app";
/** The only products that grant the paid plan. */
export const PRODUCT_IDS = ["ormma_family_monthly", "ormma_family_yearly"] as const;

/** What the app needs to know about a purchase, already reduced from Google's response. */
export interface PlayPurchase {
  productId: string;
  /** Mapped from Google's subscription state; null for states that grant nothing (pending). */
  status: SubscriptionStatus | null;
  expiresAtMs: number;
  /** The account id the app attached when it started the purchase (the buyer's uid), when present. */
  accountId: string | null;
  acknowledged: boolean;
  /** In the free-trial period (an offer tagged "trial", still on its first order). */
  trial: boolean;
  /** Will renew at the end of the period. */
  autoRenew: boolean;
  /** Google's grace period or account hold; null when there is no payment problem. */
  paymentIssue: SubscriptionPaymentIssue | null;
}

/** The offer tag set on the free-trial offer in Play Console. */
export const TRIAL_OFFER_TAG = "trial";

export interface PlayClient {
  getSubscription(purchaseToken: string): Promise<PlayPurchase>;
  acknowledge(productId: string, purchaseToken: string): Promise<void>;
}

/** Maps Google's subscriptionsv2 state to the entitlement status. */
export function statusFromPlayState(state: string | undefined): SubscriptionStatus | null {
  switch (state) {
    case "SUBSCRIPTION_STATE_ACTIVE":
    case "SUBSCRIPTION_STATE_IN_GRACE_PERIOD":
      return "active";
    case "SUBSCRIPTION_STATE_CANCELED":
      return "cancelled";
    case "SUBSCRIPTION_STATE_ON_HOLD":
    case "SUBSCRIPTION_STATE_PAUSED":
    case "SUBSCRIPTION_STATE_EXPIRED":
      return "expired";
    default:
      return null;
  }
}

interface SubscriptionV2Response {
  subscriptionState?: string;
  acknowledgementState?: string;
  latestOrderId?: string;
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
    offerDetails?: { offerTags?: string[] };
  }>;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
}

/** Converts a subscriptionsv2 response; throws when it carries no usable line item. */
export function purchaseFromResponse(body: SubscriptionV2Response): PlayPurchase {
  const item = body.lineItems?.[0];
  const expiry = item?.expiryTime ? Date.parse(item.expiryTime) : Number.NaN;
  if (!item?.productId || Number.isNaN(expiry)) throw new Error("play response has no line item");
  return {
    productId: item.productId,
    status: statusFromPlayState(body.subscriptionState),
    expiresAtMs: expiry,
    accountId: body.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? null,
    acknowledged: body.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    // A renewal order id carries "..", so a trial is the first order of an offer tagged "trial".
    trial: (item.offerDetails?.offerTags ?? []).includes(TRIAL_OFFER_TAG) && !(body.latestOrderId ?? "").includes(".."),
    autoRenew:
      item.autoRenewingPlan?.autoRenewEnabled === true &&
      (body.subscriptionState === "SUBSCRIPTION_STATE_ACTIVE" || body.subscriptionState === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"),
    paymentIssue: paymentIssueFromPlayState(body.subscriptionState),
  };
}

/** Grace keeps access and hold does not; neither changes the plan limits (plan.ts decides those). */
export function paymentIssueFromPlayState(state: string | undefined): SubscriptionPaymentIssue | null {
  if (state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") return "grace";
  if (state === "SUBSCRIPTION_STATE_ON_HOLD") return "hold";
  return null;
}

const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}`;

/** Real client: a service account key (from Secret Manager) signs in with google-auth-library. */
export class GooglePlayClient implements PlayClient {
  constructor(private readonly serviceAccountJson: string) {}

  private async token(): Promise<string> {
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      credentials: JSON.parse(this.serviceAccountJson),
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();
    if (!token) throw new Error("no access token");
    return token;
  }

  async getSubscription(purchaseToken: string): Promise<PlayPurchase> {
    const response = await fetch(`${BASE}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`, {
      headers: { Authorization: `Bearer ${await this.token()}` },
    });
    if (!response.ok) throw new Error(`play lookup failed status=${response.status}`);
    return purchaseFromResponse((await response.json()) as SubscriptionV2Response);
  }

  async acknowledge(productId: string, purchaseToken: string): Promise<void> {
    const response = await fetch(
      `${BASE}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${await this.token()}`, "Content-Type": "application/json" },
        body: "{}",
      },
    );
    if (!response.ok) throw new Error(`play acknowledge failed status=${response.status}`);
  }
}
