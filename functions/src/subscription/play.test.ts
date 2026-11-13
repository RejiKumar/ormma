import { paymentIssueFromPlayState, purchaseFromResponse } from "./play";

const EXPIRY = "2026-12-01T00:00:00Z";
const response = (over: Record<string, unknown> = {}, line: Record<string, unknown> = {}) =>
  ({
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    latestOrderId: "GPA.1111-2222-3333-44444",
    lineItems: [
      {
        productId: "ormma_family_monthly",
        expiryTime: EXPIRY,
        autoRenewingPlan: { autoRenewEnabled: true },
        offerDetails: { offerTags: [] },
        ...line,
      },
    ],
    ...over,
  }) as never;

describe("purchaseFromResponse phase fields", () => {
  it("a plain active subscription renews and is not a trial", () => {
    expect(purchaseFromResponse(response())).toMatchObject({ status: "active", trial: false, autoRenew: true, paymentIssue: null });
  });

  it("an offer tagged trial on its first order is a trial", () => {
    expect(purchaseFromResponse(response({}, { offerDetails: { offerTags: ["trial"] } })).trial).toBe(true);
  });

  it("is no longer a trial once it has renewed (the order id carries ..)", () => {
    const renewed = response({ latestOrderId: "GPA.1111-2222-3333-44444..0" }, { offerDetails: { offerTags: ["trial"] } });
    expect(purchaseFromResponse(renewed).trial).toBe(false);
  });

  it("a cancelled subscription does not renew and keeps the paid period", () => {
    const cancelled = purchaseFromResponse(
      response({ subscriptionState: "SUBSCRIPTION_STATE_CANCELED" }, { autoRenewingPlan: { autoRenewEnabled: false } }),
    );
    expect(cancelled).toMatchObject({ status: "cancelled", autoRenew: false, paymentIssue: null });
  });

  it("grace keeps the entitlement active with a grace payment issue", () => {
    expect(purchaseFromResponse(response({ subscriptionState: "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" }))).toMatchObject({
      status: "active",
      autoRenew: true,
      paymentIssue: "grace",
    });
  });

  it("hold records a hold payment issue and does not renew", () => {
    expect(purchaseFromResponse(response({ subscriptionState: "SUBSCRIPTION_STATE_ON_HOLD" }))).toMatchObject({
      status: "expired",
      autoRenew: false,
      paymentIssue: "hold",
    });
  });

  it("maps only grace and hold to a payment issue", () => {
    expect(paymentIssueFromPlayState("SUBSCRIPTION_STATE_ACTIVE")).toBeNull();
    expect(paymentIssueFromPlayState(undefined)).toBeNull();
  });

  it("never carries the order id or token into the result", () => {
    expect(JSON.stringify(purchaseFromResponse(response()))).not.toContain("GPA.");
  });
});
