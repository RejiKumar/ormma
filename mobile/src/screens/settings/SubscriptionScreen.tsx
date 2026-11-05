import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, View } from "react-native";
import { useAuth } from "../../auth/AuthProvider";
import { PURCHASE_CANCELLED, type BillingProduct, type BillingPurchase } from "../../billing/billing";
import { useBilling } from "../../billing/BillingProvider";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { verifyPurchase } from "../../family/callables";
import { useSubscription } from "../../family/useSubscription";

const MANAGE_URL = "https://play.google.com/store/account/subscriptions";

const shortDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * Plans: what each plan includes, the prices exactly as Google Play returns them, Subscribe, Manage in
 * Google Play and Restore purchases. The server verifies every purchase; the screen only shows the plan.
 */
export function SubscriptionScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const billing = useBilling();
  const { plan, entitlement } = useSubscription();
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
  const status =
    entitlement && plan === "family"
      ? Date.now() < entitlement.expiresAtMs
        ? t("subscription.paidActive", { date: shortDate(entitlement.expiresAtMs) })
        : t("subscription.paidEnded", { date: shortDate(entitlement.expiresAtMs) })
      : null;

  return (
    <Screen belowHeader>
      <Text variant="body" tone="muted">
        {t("subscription.intro")}
      </Text>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="cardTitle">{t("subscription.freeTitle")}</Text>
        <Text variant="body">{t("subscription.freeLine")}</Text>
      </Card>
      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="cardTitle">{t("subscription.paidTitle")}</Text>
        <Text variant="body">{t("subscription.paidLine")}</Text>
        {status ? (
          <Text variant="label" tone="primary" testID="subscription-status">
            {status}
          </Text>
        ) : null}
      </Card>
      <Text variant="caption" tone="muted">
        {t("subscription.everyPlan")}
      </Text>

      {playDown ? <Banner testID="subscription-unavailable" message={t("subscription.unavailable")} /> : null}

      <View style={{ gap: theme.spacing.sm }}>
        {monthly ? (
          <Button
            label={`${t("subscription.subscribe")} · ${t("subscription.pricePerMonth", { price: monthly.displayPrice })}`}
            testID="subscription-monthly"
            loading={busy}
            onPress={() => void subscribe(monthly)}
          />
        ) : null}
        {yearly ? (
          <Button
            variant="secondary"
            label={`${t("subscription.subscribe")} · ${t("subscription.pricePerYear", { price: yearly.displayPrice })}`}
            testID="subscription-yearly"
            loading={busy}
            onPress={() => void subscribe(yearly)}
          />
        ) : null}
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
