import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Linking } from "react-native";
import type { Billing, BillingProduct } from "../../billing/billing";
import { BillingProvider } from "../../billing/BillingProvider";
import { renderApp } from "../../test-utils";
import { LegalScreen } from "./LegalScreen";
import { SettingsScreen } from "./SettingsScreen";
import { SubscriptionScreen } from "./SubscriptionScreen";

const mockUser: { user: { uid: string; phoneNumber: string } | null } = { user: { uid: "u1", phoneNumber: "+919812345678" } };
jest.mock("../../auth/AuthProvider", () => ({ useAuth: () => ({ user: mockUser.user, initialising: false }) }));

const mockSubscription = { plan: "free" as "free" | "family", entitlement: null as null | { status: string; productId: string; expiresAtMs: number } };
jest.mock("../../family/useSubscription", () => ({
  useSubscription: () => ({ plan: mockSubscription.plan, entitlement: mockSubscription.entitlement, loading: false }),
}));

type FunctionsMock = { httpsCallable: jest.Mock; __callables: Record<string, jest.Mock> };
const fnsMock = jest.requireMock("@react-native-firebase/functions") as FunctionsMock;
const callable = (name: string): jest.Mock => {
  fnsMock.httpsCallable(undefined as never, name);
  return fnsMock.__callables[name];
};
type FirestoreMock = { getDoc: jest.Mock };
const fsMock = jest.requireMock("@react-native-firebase/firestore") as FirestoreMock;
type AuthMock = { signOut: jest.Mock };
const authMock = jest.requireMock("@react-native-firebase/auth") as AuthMock;

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const settingsRoute = { key: "s", name: "Settings" as const, params: undefined } as never;

const renderSettings = () => renderApp(<SettingsScreen navigation={navigation as never} route={settingsRoute} />);

beforeEach(async () => {
  await AsyncStorage.clear();
  navigation.navigate.mockClear();
  authMock.signOut.mockClear();
  mockUser.user = { uid: "u1", phoneNumber: "+919812345678" };
  mockSubscription.plan = "free";
  mockSubscription.entitlement = null;
  fsMock.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ displayName: "Rahul" }) });
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe("SettingsScreen", () => {
  it("shows the phone number read only, the stored name, the plan and the sections", async () => {
    await renderSettings();
    expect(screen.getByTestId("settings-phone")).toHaveTextContent("+919812345678");
    await waitFor(() => expect(screen.getByTestId("settings-name").props.value).toBe("Rahul"));
    expect(screen.getByText("Free plan")).toBeTruthy();
    expect(screen.queryByText("Appearance")).toBeNull();
    expect(screen.getByText("Privacy policy")).toBeTruthy();
    expect(screen.getByText("Terms and conditions")).toBeTruthy();
  });

  it("saves a changed display name through the server and confirms it", async () => {
    callable("setMyDisplayName").mockResolvedValue({ data: { ok: true } });
    await renderSettings();
    await waitFor(() => expect(screen.getByTestId("settings-name").props.value).toBe("Rahul"));
    await fireEvent.changeText(screen.getByTestId("settings-name"), "Rahul K");
    await fireEvent.press(screen.getByTestId("settings-save-name"));
    await waitFor(() => expect(callable("setMyDisplayName")).toHaveBeenCalledWith({ displayName: "Rahul K" }));
    expect(await screen.findByText("Name saved.")).toBeTruthy();
  });

  it("has no Show welcome again row", async () => {
    await renderSettings();
    expect(screen.queryByText("Show welcome again")).toBeNull();
    expect(screen.queryByTestId("settings-welcome")).toBeNull();
  });

  it("opens the plans screen from the plan row and the legal reader from the two entries", async () => {
    await renderSettings();
    await fireEvent.press(screen.getByTestId("settings-plan"));
    expect(navigation.navigate).toHaveBeenCalledWith("Subscription");
    await fireEvent.press(screen.getByTestId("settings-privacy"));
    expect(navigation.navigate).toHaveBeenCalledWith("Legal", { doc: "privacy" });
    await fireEvent.press(screen.getByTestId("settings-terms"));
    expect(navigation.navigate).toHaveBeenCalledWith("Legal", { doc: "terms" });
  });

  it("shows the paid plan and its end date", async () => {
    mockSubscription.plan = "family";
    mockSubscription.entitlement = { status: "active", productId: "ormma_family_monthly", expiresAtMs: Date.now() + 10 * 86_400_000 };
    await renderSettings();
    expect(screen.getByText(/^Ormma Family · Until /)).toBeTruthy();
  });

  it("has no Sign out button: it is the icon in the app bar", async () => {
    await renderSettings();
    expect(screen.queryByTestId("settings-sign-out")).toBeNull();
    expect(screen.queryByText("Sign out")).toBeNull();
  });

  it("refuses to delete while the member owns a parent and says what to do", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    callable("deleteMyAccount").mockRejectedValue({ code: "failed-precondition", details: { reason: "owns_parents" } });
    await renderSettings();
    await fireEvent.press(screen.getByTestId("settings-delete"));
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === "Delete")?.onPress?.();
    expect(await screen.findByText("Delete the parents you own first.")).toBeTruthy();
    expect(authMock.signOut).not.toHaveBeenCalled();
  });

  it("deletes the account after confirming and signs out", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    callable("deleteMyAccount").mockResolvedValue({ data: { deleted: true } });
    await renderSettings();
    await fireEvent.press(screen.getByTestId("settings-delete"));
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === "Delete")?.onPress?.();
    await waitFor(() => expect(callable("deleteMyAccount")).toHaveBeenCalled());
    await waitFor(() => expect(authMock.signOut).toHaveBeenCalled());
  });
});

describe("LegalScreen", () => {
  const route = (doc: "privacy" | "terms") => ({ key: "l", name: "Legal" as const, params: { doc } }) as never;

  it("shows the full privacy policy text with its date, offline", async () => {
    await renderApp(<LegalScreen navigation={navigation as never} route={route("privacy")} />);
    expect(screen.getByText("What we collect")).toBeTruthy();
    expect(screen.getByText(/^Last updated /)).toBeTruthy();
    // The published page exists, so the screen offers the full text online as well.
    expect(screen.getByTestId("legal-open-online")).toBeTruthy();
  });

  it("shows the terms with the no-medical-advice section", async () => {
    await renderApp(<LegalScreen navigation={navigation as never} route={route("terms")} />);
    expect(screen.getByText("No medical advice")).toBeTruthy();
  });
});

const monthly: BillingProduct = { productId: "ormma_family_monthly", displayPrice: "₹299.00", offerToken: "t1" };
const yearly: BillingProduct = { productId: "ormma_family_yearly", displayPrice: "₹2,999.00", offerToken: "t2" };

function fakeBilling(over: Partial<Billing> = {}): Billing {
  return {
    getProducts: jest.fn(async () => [monthly, yearly]),
    purchase: jest.fn(async (product) => ({ productId: product.productId, purchaseToken: "tok-1234567890" })),
    restore: jest.fn(async () => []),
    finish: jest.fn(async () => undefined),
    ...over,
  };
}

const renderPlans = (billing: Billing) =>
  renderApp(
    <BillingProvider billing={billing}>
      <SubscriptionScreen />
    </BillingProvider>,
  );

describe("SubscriptionScreen", () => {
  it("shows both plans and the prices exactly as Google Play returns them", async () => {
    await renderPlans(fakeBilling());
    expect(await screen.findByText("Subscribe · ₹299.00 per month")).toBeTruthy();
    expect(screen.getByText("Subscribe · ₹2,999.00 per year")).toBeTruthy();
    expect(screen.getByText("What each plan includes")).toBeTruthy();
    expect(screen.getByText(/^Missed-dose alerts, urgent alerts/)).toBeTruthy();
  });

  it("does not offer a plan when Google Play returns no price for it", async () => {
    await renderPlans(fakeBilling({ getProducts: jest.fn(async () => [{ ...monthly, displayPrice: "" }, yearly]) }));
    expect(await screen.findByTestId("subscription-yearly")).toBeTruthy();
    expect(screen.queryByTestId("subscription-monthly")).toBeNull();
  });

  it("buys, has the server verify the purchase, and only then finishes the transaction", async () => {
    callable("verifyPurchase").mockResolvedValue({ data: { status: "active", expiresAtMs: 1 } });
    const billing = fakeBilling();
    await renderPlans(billing);
    await fireEvent.press(await screen.findByTestId("subscription-monthly"));
    await waitFor(() =>
      expect(callable("verifyPurchase")).toHaveBeenCalledWith({ productId: "ormma_family_monthly", purchaseToken: "tok-1234567890" }),
    );
    expect(billing.purchase).toHaveBeenCalledWith(monthly, "u1");
    await waitFor(() => expect(billing.finish).toHaveBeenCalled());
    expect(await screen.findByText("Plan updated.")).toBeTruthy();
  });

  it("does not finish the purchase when the server cannot verify it", async () => {
    callable("verifyPurchase").mockRejectedValue({ code: "failed-precondition" });
    const billing = fakeBilling();
    await renderPlans(billing);
    await fireEvent.press(await screen.findByTestId("subscription-yearly"));
    expect(await screen.findByText(/could not be verified/)).toBeTruthy();
    expect(billing.finish).not.toHaveBeenCalled();
  });

  it("says nothing was bought when the purchase sheet is closed", async () => {
    const billing = fakeBilling({ purchase: jest.fn(async () => { throw new Error("purchase_cancelled"); }) });
    await renderPlans(billing);
    await fireEvent.press(await screen.findByTestId("subscription-monthly"));
    expect(await screen.findByText("The purchase was not completed.")).toBeTruthy();
    expect(callable("verifyPurchase")).not.toHaveBeenCalled();
  });

  it("restores purchases by re-verifying them on the server", async () => {
    callable("verifyPurchase").mockResolvedValue({ data: { status: "active", expiresAtMs: 1 } });
    const billing = fakeBilling({ restore: jest.fn(async () => [{ productId: "ormma_family_yearly" as const, purchaseToken: "old-token-123456" }]) });
    await renderPlans(billing);
    await fireEvent.press(await screen.findByTestId("subscription-restore"));
    expect(await screen.findByText("Purchases restored.")).toBeTruthy();
    expect(callable("verifyPurchase")).toHaveBeenCalledWith({ productId: "ormma_family_yearly", purchaseToken: "old-token-123456" });
  });

  it("says when there is nothing to restore", async () => {
    await renderPlans(fakeBilling());
    await fireEvent.press(await screen.findByTestId("subscription-restore"));
    expect(await screen.findByText("No purchases were found on this Google account.")).toBeTruthy();
  });

  it("tells the user when Google Play cannot be reached and keeps the rest of the screen", async () => {
    await renderPlans(fakeBilling({ getProducts: jest.fn(async () => { throw new Error("down"); }) }));
    expect(await screen.findByTestId("subscription-unavailable")).toBeTruthy();
    expect(screen.queryByTestId("subscription-monthly")).toBeNull();
    expect(screen.getByTestId("subscription-manage")).toBeTruthy();
  });

  it("opens Manage in Google Play", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue();
    await renderPlans(fakeBilling());
    await fireEvent.press(await screen.findByTestId("subscription-manage"));
    expect(open).toHaveBeenCalledWith(expect.stringContaining("play.google.com"));
  });

  it("shows the active paid plan with its end date", async () => {
    mockSubscription.plan = "family";
    mockSubscription.entitlement = { status: "active", productId: "ormma_family_monthly", expiresAtMs: Date.now() + 20 * 86_400_000 };
    await renderPlans(fakeBilling());
    expect(await screen.findByTestId("subscription-status")).toHaveTextContent(/^Ormma Family is active until /);
  });
  const trialMonthly: BillingProduct = {
    ...monthly,
    trial: { amount: 7, unit: "day" },
    priceMicros: 299_000_000,
    currencyCode: "INR",
  };
  const plainMonthly: BillingProduct = { ...monthly, priceMicros: 299_000_000, currencyCode: "INR" };
  const plainYearly: BillingProduct = { ...yearly, priceMicros: 2_999_000_000, currencyCode: "INR" };
  const inDays = (n: number) => Date.now() + n * 86_400_000;

  it("compares Free and Ormma Family on parents, members and call times", async () => {
    await renderPlans(fakeBilling());
    expect(await screen.findByTestId("plan-comparison")).toBeTruthy();
    for (const text of ["Parents", "Members per parent", "Check-in call times per day", "First 2", "Every dose time"]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(screen.getByText(/^Missed-dose alerts, urgent alerts/)).toBeTruthy();
  });

  it("shows the terms above the buttons: price, renewal and cancel anytime", async () => {
    await renderPlans(fakeBilling({ getProducts: jest.fn(async () => [plainMonthly, plainYearly]) }));
    expect(await screen.findByTestId("terms-monthly")).toHaveTextContent(
      "₹299.00 per month. Renews each month until you cancel. Cancel anytime in Google Play.",
    );
    expect(screen.getByTestId("terms-yearly")).toHaveTextContent(
      "₹2,999.00 per year. Renews each year until you cancel. Cancel anytime in Google Play.",
    );
  });

  it("marks yearly as best value with the saving computed from the Play prices", async () => {
    await renderPlans(fakeBilling({ getProducts: jest.fn(async () => [plainMonthly, plainYearly]) }));
    expect(await screen.findByTestId("best-value")).toHaveTextContent("Best value");
    expect(screen.getByTestId("best-value-line")).toHaveTextContent("About ₹250 per month. Saves 16% compared with paying monthly.");
  });

  it("shows no best value when the prices have no saving or no currency", async () => {
    await renderPlans(fakeBilling({ getProducts: jest.fn(async () => [monthly, yearly]) }));
    await screen.findByTestId("plan-yearly");
    expect(screen.queryByTestId("best-value")).toBeNull();
  });

  it("shows the trial only when Play returned one, with the price after it, and a start-trial button", async () => {
    await renderPlans(fakeBilling({ getProducts: jest.fn(async () => [trialMonthly, plainYearly]) }));
    expect(await screen.findByTestId("terms-monthly")).toHaveTextContent(
      "7 days free, then ₹299.00 per month. Renews each month until you cancel. Cancel anytime in Google Play.",
    );
    expect(screen.getByTestId("subscription-monthly")).toHaveTextContent("Start free trial");
    // Yearly had no trial offer: plain price and plain button.
    expect(screen.getByTestId("terms-yearly")).not.toHaveTextContent("free");
    expect(screen.getByTestId("subscription-yearly")).toHaveTextContent("Subscribe · ₹2,999.00 per year");
  });

  it("buys the trial offer with the offer token Play returned", async () => {
    const billing = fakeBilling({ getProducts: jest.fn(async () => [{ ...trialMonthly, offerToken: "trial-token" }, plainYearly]) });
    await renderPlans(billing);
    await fireEvent.press(await screen.findByTestId("subscription-monthly"));
    await waitFor(() => expect(billing.purchase).toHaveBeenCalled());
    expect((billing.purchase as jest.Mock).mock.calls[0][0].offerToken).toBe("trial-token");
  });

  it.each([
    ["a trial", { status: "active", trial: true, autoRenew: true }, "Free trial until "],
    ["a renewing plan", { status: "active", trial: false, autoRenew: true }, "Renews on "],
    ["a cancelled plan", { status: "cancelled", trial: false, autoRenew: false }, "Cancelled. Ormma Family stays active until "],
    ["an older entitlement", { status: "active" }, "Ormma Family is active until "],
  ])("shows the status for %s", async (_name, fields, text) => {
    mockSubscription.plan = "family";
    mockSubscription.entitlement = { productId: "ormma_family_monthly", expiresAtMs: inDays(20), ...fields } as never;
    await renderPlans(fakeBilling());
    expect(await screen.findByTestId("subscription-status")).toHaveTextContent(new RegExp(`^${text}`));
    expect(screen.queryByTestId("subscription-fix-payment")).toBeNull();
  });

  it("says there is a payment problem and opens Google Play to fix it", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue();
    mockSubscription.plan = "family";
    mockSubscription.entitlement = {
      status: "active",
      productId: "ormma_family_monthly",
      expiresAtMs: inDays(2),
      trial: false,
      autoRenew: true,
      paymentIssue: "grace",
    } as never;
    await renderPlans(fakeBilling());
    expect(await screen.findByTestId("subscription-status")).toHaveTextContent(
      "There is a problem with your payment. Update it in Google Play to keep Ormma Family.",
    );
    await fireEvent.press(screen.getByTestId("subscription-fix-payment"));
    expect(open).toHaveBeenCalledWith(expect.stringContaining("play.google.com"));
    open.mockRestore();
  });

  it("shows a hold as paused with the fix button even when the plan is free", async () => {
    mockSubscription.plan = "free";
    mockSubscription.entitlement = {
      status: "expired",
      productId: "ormma_family_monthly",
      expiresAtMs: inDays(1),
      paymentIssue: "hold",
    } as never;
    await renderPlans(fakeBilling());
    expect(await screen.findByTestId("subscription-status")).toHaveTextContent(/^Ormma Family is paused because of a problem with your payment/);
    expect(screen.getByTestId("subscription-fix-payment")).toBeTruthy();
  });

  it("keeps the comparison and the status when Google Play cannot be reached, without prices or buy buttons", async () => {
    mockSubscription.plan = "family";
    mockSubscription.entitlement = { status: "active", productId: "ormma_family_monthly", expiresAtMs: inDays(20), trial: false, autoRenew: true } as never;
    await renderPlans(fakeBilling({ getProducts: jest.fn(async () => Promise.reject(new Error("down"))) }));
    expect(await screen.findByTestId("subscription-unavailable")).toBeTruthy();
    expect(screen.getByTestId("plan-comparison")).toBeTruthy();
    expect(screen.getByTestId("subscription-status")).toHaveTextContent(/^Renews on /);
    expect(screen.queryByTestId("subscription-monthly")).toBeNull();
    expect(screen.queryByTestId("subscription-yearly")).toBeNull();
  });
});
