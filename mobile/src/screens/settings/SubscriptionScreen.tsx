import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, View } from "react-native";
import type { TFunction } from "i18next";
import { useAuth } from "../../auth/AuthProvider";
import { PURCHASE_CANCELLED, type BillingProduct, type BillingPurchase, type TrialLength } from "../../billing/billing";
import { useBilling } from "../../billing/BillingProvider";
import { bestValue } from "../../billing/offers";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { verifyPurchase } from "../../family/callables";
import { statusLineOf, type StatusKind } from "../../family/subscriptionStatus";
import { useSubscription } from "../../family/useSubscription";

const MANAGE_URL = "https://play.google.com/store/account/subscriptions";
const FIX_URL = `${MANAGE_URL}?package=com.ormma.app`;

const shortDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const STATUS_KEY = {
  trial: "subscription.statusTrial",
  renews: "subscription.statusRenews",
  cancelled: "subscription.statusCancelled",
  paymentGrace: "subscription.statusPaymentGrace",
  paymentHold: "subscription.statusPaymentHold",
  ended: "subscription.paidEnded",
  active: "subscription.paidActive",
} as const satisfies Record<StatusKind, string>;

function trialText(t: TFunction, trial: TrialLength): string {
  const key = trial.unit === "day" ? "trialDay" : trial.unit === "week" ? "trialWeek" : "trialMonth";
  return t(`subscription.${key}`, { count: trial.amount });
}

/** The terms shown above the Subscribe button: price, renewal, cancel anytime, and the trial when Play returned one. */
function termsText(t: TFunction, product: BillingProduct, yearly: boolean): string {
  const price = product.displayPrice;
  if (product.trial) {
    return t(yearly ? "subscription.termsTrialYearly" : "subscription.termsTrialMonthly", {
      trial: trialText(t, product.trial),
      price,
    });
  }
  return t(yearly ? "subscription.termsYearly" : "subscription.termsMonthly", { price });
}

/**
 * Plans: the status of the current plan, what each plan includes, the prices and terms exactly as Google
 * Play returns them, Subscribe, Manage in Google Play and Restore purchases. The server verifies every
 * purchase and records the status; the screen only shows it.
 */
export function SubscriptionScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const billing = useBilling();
  const { entitlement } = useSubscription();
  const [products, setProducts] = useState<BillingProduct[] | null>(null);
  const [playDown, setPlayDown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    billing
      .getProducts()
      .then((items) => {
        if (active) setProducts(items);
      })
      .catch(() => {
        if (active) setPlayDown(true);
      });
    return () => {
      active = false;
    };
  }, [billing]);

  /** Verifies a purchase on the server and only then tells Google Play it was handled. */
  const handle = async (purchase: BillingPurchase): Promise<boolean> => {
    try {
      await verifyPurchase({ productId: purchase.productId, purchaseToken: purchase.purchaseToken });
      await billing.finish(purchase);
      return true;
    } catch (error) {
      // Ids and statuses only in logs (hard rule 6).
      console.warn(`verifyPurchase failed code=${(error as { code?: string } | null)?.code ?? "unknown"}`);
      return false;
    }
  };

  const subscribe = async (product: BillingProduct) => {
    if (!user) return;
    setBusy(true);
    setMessage(null);
    try {
      const purchase = await billing.purchase(product, user.uid);
      setMessage((await handle(purchase)) ? t("subscription.updated") : t("subscription.verifyFailed"));
    } catch (error) {
      setMessage((error as Error).message === PURCHASE_CANCELLED ? t("subscription.cancelled") : t("subscription.unavailable"));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const found = await billing.restore();
      if (found.length === 0) {
        setMessage(t("subscription.nothingToRestore"));
        return;
      }
      const results = await Promise.all(found.map(handle));
      setMessage(results.some(Boolean) ? t("subscription.restored") : t("subscription.verifyFailed"));
    } catch {
      setMessage(t("subscription.unavailable"));
    } finally {
      setBusy(false);
    }
  };

  const priced = (products ?? []).filter((p) => p.displayPrice.trim().length > 0);
  const monthly = priced.find((p) => p.productId === "ormma_family_monthly");
  const yearly = priced.find((p) => p.productId === "ormma_family_yearly");
  const value = bestValue(monthly, yearly);
  const line = statusLineOf(entitlement, Date.now());
  const paymentProblem = line?.kind === "paymentGrace" || line?.kind === "paymentHold";

  const rows: Array<[string, string, string]> = [
    [t("subscription.rowParents"), "1", "3"],
    [t("subscription.rowMembers"), "2", "6"],
    [t("subscription.rowCalls"), t("subscription.callsFree"), t("subscription.callsFamily")],
  ];

  const planCard = (product: BillingProduct, isYearly: boolean) => {
    const labelPrice = t(isYearly ? "subscription.pricePerYear" : "subscription.pricePerMonth", { price: product.displayPrice });
    return (
      <Card style={{ gap: theme.spacing.sm }} testID={isYearly ? "plan-yearly" : "plan-monthly"}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm }}>
          <Text variant="cardTitle">{t(isYearly ? "subscription.yearlyTitle" : "subscription.monthlyTitle")}</Text>
          {isYearly && value ? (
            <View
              testID="best-value"
              style={{
                backgroundColor: theme.colors.primaryTint,
                borderRadius: theme.radius.lg,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: 6,
              }}
            >
              <Text variant="micro" tone="primary">
                {t("subscription.bestValue")}
              </Text>
            </View>
          ) : null}
        </View>
        {isYearly && value ? (
          <Text variant="body" tone="muted" testID="best-value-line">
            {t("subscription.bestValueLine", { price: value.monthlyEquivalent, percent: value.savingPercent })}
          </Text>
        ) : null}
        <Text variant="body" testID={isYearly ? "terms-yearly" : "terms-monthly"}>
          {termsText(t, product, isYearly)}
        </Text>
        <Button
          variant={isYearly ? "secondary" : "primary"}
          label={product.trial ? t("subscription.startTrial") : `${t("subscription.subscribe")} · ${labelPrice}`}
          testID={isYearly ? "subscription-yearly" : "subscription-monthly"}
          loading={busy}
          onPress={() => void subscribe(product)}
        />
      </Card>
    );
  };

  return (
    <Screen belowHeader>
      <Text variant="body" tone="muted">
        {t("subscription.intro")}
      </Text>

      {line ? (
        <Card tone="tinted" style={{ gap: theme.spacing.sm }} testID="subscription-status-card">
          <Text variant="label" tone="primary" testID="subscription-status">
            {t(STATUS_KEY[line.kind], { date: shortDate(line.dateMs) })}
          </Text>
          {paymentProblem ? (
            <Button
              variant="secondary"
              label={t("subscription.fixPayment")}
              testID="subscription-fix-payment"
              onPress={() => void Linking.openURL(FIX_URL).catch(() => undefined)}
            />
          ) : null}
        </Card>
      ) : null}

      <Card style={{ gap: theme.spacing.sm }} testID="plan-comparison">
        <Text variant="cardTitle">{t("subscription.compareTitle")}</Text>
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          <View style={{ flex: 1.4 }} />
          <Text variant="label" style={{ flex: 1, textAlign: "center" }}>
            {t("subscription.compareFree")}
          </Text>
          <Text variant="label" tone="primary" style={{ flex: 1, textAlign: "center" }}>
            {t("subscription.compareFamily")}
          </Text>
        </View>
        {rows.map(([label, free, family]) => (
          <View key={label} style={{ flexDirection: "row", gap: theme.spacing.sm, alignItems: "center" }}>
            <Text variant="small" tone="muted" style={{ flex: 1.4 }}>
              {label}
            </Text>
            <Text variant="bodyMedium" style={{ flex: 1, textAlign: "center" }}>
              {free}
            </Text>
            <Text variant="bodyMedium" tone="primary" style={{ flex: 1, textAlign: "center" }}>
              {family}
            </Text>
          </View>
        ))}
        <Text variant="caption" tone="muted">
          {t("subscription.everyPlan")}
        </Text>
      </Card>

      {playDown ? <Banner testID="subscription-unavailable" message={t("subscription.unavailable")} /> : null}

      {monthly ? planCard(monthly, false) : null}
      {yearly ? planCard(yearly, true) : null}

      <View style={{ gap: theme.spacing.sm }}>
        <Button variant="quiet" label={t("subscription.restore")} testID="subscription-restore" disabled={busy} onPress={() => void restore()} />
        <Button
          variant="quiet"
          label={t("subscription.manage")}
          testID="subscription-manage"
          onPress={() => void Linking.openURL(MANAGE_URL).catch(() => undefined)}
        />
      </View>

      {message ? (
        <Text variant="body" testID="subscription-message" accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}
    </Screen>
  );
}
