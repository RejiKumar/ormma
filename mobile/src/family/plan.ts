// Display copy of the server's plan rules (functions/src/subscription/plan.ts). The server decides
// every limit; the app only uses this to show the current plan.
export type PlanName = "free" | "family";
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "refunded";

export interface Entitlement {
  status: SubscriptionStatus;
  productId: string;
  expiresAtMs: number;
}

/** After a subscription ends the paid plan still shows for this long. */
export const GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export function planOf(entitlement: Pick<Entitlement, "status" | "expiresAtMs"> | null, now: number): PlanName {
  if (!entitlement) return "free";
  if (entitlement.status === "refunded") return "free";
  if (now < entitlement.expiresAtMs) return entitlement.status === "expired" ? "free" : "family";
  return now < entitlement.expiresAtMs + GRACE_MS ? "family" : "free";
}
