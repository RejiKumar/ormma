/** The two Google Play subscription products that grant the Ormma Family plan. */
export const PRODUCT_IDS = ["ormma_family_monthly", "ormma_family_yearly"] as const;
export type ProductId = (typeof PRODUCT_IDS)[number];

/** The free period Google Play returns for this account, for example 7 days. */
export interface TrialLength {
  amount: number;
  unit: "day" | "week" | "month";
}

export interface BillingProduct {
  productId: ProductId;
  /** The price exactly as Google Play returns it, for example "₹299.00". */
  displayPrice: string;
  offerToken: string | null;
  /** Present only when Google Play returned a free-trial offer for this account. */
  trial?: TrialLength | null;
  /** The recurring price in micro-units and its currency, from Play, for the best-value saving. */
  priceMicros?: number | null;
  currencyCode?: string | null;
}

export interface BillingPurchase {
  productId: ProductId;
  /** Sent to the server for verification; never stored or logged by the app. */
  purchaseToken: string;
}

/** What the Subscription screen needs from Google Play. Implemented by `playBilling`, faked in tests. */
export interface Billing {
  /** Product details with Play's own prices; rejects when Google Play cannot be reached. */
  getProducts(): Promise<BillingProduct[]>;
  /** Starts the Play purchase sheet for the account; rejects when cancelled or failed. */
  purchase(product: BillingProduct, accountId: string): Promise<BillingPurchase>;
  /** Existing purchases on this Google account, for "Restore purchases". */
  restore(): Promise<BillingPurchase[]>;
  /** Tells Play the purchase was handled, after the server verified it. */
  finish(purchase: BillingPurchase): Promise<void>;
}

/** The error code the app uses when the user closed the purchase sheet. */
export const PURCHASE_CANCELLED = "purchase_cancelled";
