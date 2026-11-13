// Which status line the Subscription screen shows. The entitlement comes from the server (written
// from Google Play); the app only chooses the wording and never decides a plan from its own purchase.
import { planOf, type Entitlement } from "./plan";

export type StatusKind = "trial" | "renews" | "cancelled" | "paymentGrace" | "paymentHold" | "ended" | "active";

export interface StatusLine {
  kind: StatusKind;
  /** The date the line names, in milliseconds. */
  dateMs: number;
}

export function statusLineOf(entitlement: Entitlement | null, now: number): StatusLine | null {
  if (!entitlement) return null;
  const dateMs = entitlement.expiresAtMs;
  if (entitlement.paymentIssue === "hold") return { kind: "paymentHold", dateMs };
  if (entitlement.paymentIssue === "grace") return { kind: "paymentGrace", dateMs };
  if (entitlement.status === "refunded") return null;
  if (now >= dateMs) return planOf(entitlement, now) === "family" ? { kind: "ended", dateMs } : null;
  if (entitlement.status === "expired") return null;
  if (entitlement.status === "cancelled") return { kind: "cancelled", dateMs };
  if (entitlement.trial === true) return { kind: "trial", dateMs };
  if (entitlement.autoRenew === true) return { kind: "renews", dateMs };
  // An older entitlement without the new fields: the plain active-until line.
  return { kind: "active", dateMs };
}
