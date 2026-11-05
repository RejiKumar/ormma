// Plans and limits. Pure functions only: every enforcement point (createParent, invites, the
// dispatcher) resolves the plan here, and the app never decides a plan itself.
import type { SubscriptionStatus } from "../../../shared/types";
import { localDateKey } from "../schedule/time";

export type PlanName = "free" | "family";

export interface PlanLimits {
  parents: number;
  membersPerParent: number;
  /** Distinct dose times per local day that get check-in calls; Infinity means no limit. */
  callTimesPerDay: number;
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free: { parents: 1, membersPerParent: 2, callTimesPerDay: 2 },
  family: { parents: 3, membersPerParent: 6, callTimesPerDay: Number.POSITIVE_INFINITY },
};

/** After a subscription ends the paid limits still apply for this long. */
export const GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export interface EntitlementLike {
  status: SubscriptionStatus;
  expiresAtMs: number;
}

/**
 * The plan for an entitlement at `now`. Active or cancelled: paid until the period ends. Expired or
 * cancelled: paid for the 7-day grace period after the end. Refunded or revoked: free at once.
 */
export function planFor(entitlement: EntitlementLike | null, now: number): PlanName {
  if (!entitlement) return "free";
  if (entitlement.status === "refunded") return "free";
  if (now < entitlement.expiresAtMs) return entitlement.status === "expired" ? "free" : "family";
  return now < entitlement.expiresAtMs + GRACE_MS ? "family" : "free";
}

export function limitsFor(entitlement: EntitlementLike | null, now: number): PlanLimits {
  return PLAN_LIMITS[planFor(entitlement, now)];
}

/**
 * The dose times (epoch ms) that get check-in calls under a limit of `limit` distinct dose times per
 * local day: the earliest `limit` times of each local day. Pass every dose time of the parent's day,
 * called or not, so the first two stay the first two all day. Events at the same time share one call
 * group and count once.
 */
export function allowedCallTimes(times: readonly number[], timeZone: string, limit: number): Set<number> {
  const byDay = new Map<string, number[]>();
  for (const t of new Set(times)) {
    const day = localDateKey(t, timeZone);
    byDay.set(day, [...(byDay.get(day) ?? []), t]);
  }
  const allowed = new Set<number>();
  for (const list of byDay.values()) {
    list.sort((a, b) => a - b).slice(0, limit).forEach((t) => allowed.add(t));
  }
  return allowed;
}
