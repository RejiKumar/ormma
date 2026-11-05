import { zonedTimeToMs } from "../schedule/time";
import { allowedCallTimes, GRACE_MS, limitsFor, PLAN_LIMITS, planFor } from "./plan";

const IST = "Asia/Kolkata";
const at = (date: string, time: string) => zonedTimeToMs(date, time, IST)!;
const DAY = 24 * 60 * 60 * 1000;
const END = at("2026-12-01", "00:00");

describe("planFor", () => {
  it("is free without an entitlement", () => {
    expect(planFor(null, END)).toBe("free");
  });

  it("is paid while an active or cancelled subscription has time left", () => {
    expect(planFor({ status: "active", expiresAtMs: END }, END - 1)).toBe("family");
    expect(planFor({ status: "cancelled", expiresAtMs: END }, END - 1)).toBe("family");
  });

  it("keeps the paid plan for 7 days after the end, then falls back", () => {
    const e = { status: "expired" as const, expiresAtMs: END };
    expect(planFor(e, END + 3 * DAY)).toBe("family");
    expect(planFor(e, END + GRACE_MS - 1)).toBe("family");
    expect(planFor(e, END + GRACE_MS)).toBe("free");
    expect(planFor(e, END + 8 * DAY)).toBe("free");
  });

  it("ends a refund at once, with no grace", () => {
    expect(planFor({ status: "refunded", expiresAtMs: END + 30 * DAY }, END)).toBe("free");
  });

  it("treats an expired entitlement whose end is in the future as free", () => {
    expect(planFor({ status: "expired", expiresAtMs: END }, END - DAY)).toBe("free");
  });

  it("exposes the limits table", () => {
    expect(limitsFor(null, END)).toEqual(PLAN_LIMITS.free);
    expect(PLAN_LIMITS.free).toEqual({ parents: 1, membersPerParent: 2, callTimesPerDay: 2 });
    expect(PLAN_LIMITS.family.parents).toBe(3);
    expect(PLAN_LIMITS.family.membersPerParent).toBe(6);
  });
});

describe("allowedCallTimes", () => {
  const times = [at("2026-11-05", "08:00"), at("2026-11-05", "13:00"), at("2026-11-05", "21:00")];

  it("allows the first two distinct times of a local day", () => {
    const allowed = allowedCallTimes(times, IST, 2);
    expect(allowed.has(times[0])).toBe(true);
    expect(allowed.has(times[1])).toBe(true);
    expect(allowed.has(times[2])).toBe(false);
  });

  it("counts events at the same time once and counts each day separately", () => {
    const next = [at("2026-11-06", "08:00"), at("2026-11-06", "13:00"), at("2026-11-06", "21:00")];
    const allowed = allowedCallTimes([...times, times[0], ...next], IST, 2);
    expect(allowed.size).toBe(4);
    expect(allowed.has(next[2])).toBe(false);
  });

  it("uses the parent's timezone for the day boundary", () => {
    const lateIst = at("2026-11-05", "23:30");
    const earlyIst = at("2026-11-06", "00:30");
    expect(allowedCallTimes([lateIst, earlyIst], IST, 1).size).toBe(2);
  });

  it("has no limit when the limit is Infinity", () => {
    expect(allowedCallTimes(times, IST, Number.POSITIVE_INFINITY).size).toBe(3);
  });
});
