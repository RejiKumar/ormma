import { statusLineOf } from "./subscriptionStatus";

const NOW = Date.parse("2026-11-13T00:00:00Z");
const DAY = 86_400_000;
const e = (over: Record<string, unknown> = {}) =>
  ({ status: "active", productId: "ormma_family_monthly", expiresAtMs: NOW + 10 * DAY, ...over }) as never;

describe("statusLineOf", () => {
  it("is null without an entitlement or after a refund", () => {
    expect(statusLineOf(null, NOW)).toBeNull();
    expect(statusLineOf(e({ status: "refunded" }), NOW)).toBeNull();
  });

  it("names the trial, the renewal, the cancellation and an older record", () => {
    expect(statusLineOf(e({ trial: true, autoRenew: true }), NOW)?.kind).toBe("trial");
    expect(statusLineOf(e({ trial: false, autoRenew: true }), NOW)?.kind).toBe("renews");
    expect(statusLineOf(e({ status: "cancelled", trial: true, autoRenew: false }), NOW)?.kind).toBe("cancelled");
    expect(statusLineOf(e(), NOW)?.kind).toBe("active");
  });

  it("shows a payment problem before anything else", () => {
    expect(statusLineOf(e({ paymentIssue: "grace", trial: true }), NOW)?.kind).toBe("paymentGrace");
    expect(statusLineOf(e({ status: "expired", paymentIssue: "hold" }), NOW)?.kind).toBe("paymentHold");
  });

  it("shows the ended line during the 7-day grace and nothing after it", () => {
    expect(statusLineOf(e({ expiresAtMs: NOW - 3 * DAY }), NOW)?.kind).toBe("ended");
    expect(statusLineOf(e({ expiresAtMs: NOW - 8 * DAY }), NOW)).toBeNull();
  });
});
