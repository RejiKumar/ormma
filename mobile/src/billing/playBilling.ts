import * as IAP from "expo-iap";
import { PRODUCT_IDS, PURCHASE_CANCELLED, type Billing, type BillingProduct, type BillingPurchase, type ProductId } from "./billing";

const isProductId = (id: string): id is ProductId => (PRODUCT_IDS as readonly string[]).includes(id);

// finishTransaction needs the store's own purchase object, so keep it by token until it is finished.
const open = new Map<string, IAP.Purchase>();

function toPurchase(purchase: IAP.Purchase): BillingPurchase | null {
  const token = purchase.purchaseToken;
  if (!token || !isProductId(purchase.productId)) return null;
  open.set(token, purchase);
  return { productId: purchase.productId, purchaseToken: token };
}

/** Google Play Billing through expo-iap. Not used on iOS (out of scope). */
export const playBilling: Billing = {
  async getProducts() {
    await IAP.initConnection();
    const items = await IAP.fetchProducts({ skus: [...PRODUCT_IDS], type: "subs" });
    const products: BillingProduct[] = [];
    for (const item of items ?? []) {
      if (item.type !== "subs" || !isProductId(item.id)) continue;
      const offer = (item.subscriptionOffers ?? []).find((o) => o.offerTokenAndroid);
      products.push({ productId: item.id, displayPrice: item.displayPrice, offerToken: offer?.offerTokenAndroid ?? null });
    }
    return products;
  },

  async purchase(product, accountId) {
    await IAP.initConnection();
    return new Promise<BillingPurchase>((resolve, reject) => {
      const updated = IAP.purchaseUpdatedListener((purchase) => {
        const mapped = toPurchase(purchase);
        if (!mapped || mapped.productId !== product.productId) return;
        updated.remove();
        failed.remove();
        resolve(mapped);
      });
      const failed = IAP.purchaseErrorListener((error) => {
        updated.remove();
        failed.remove();
        reject(new Error(String(error.code) === "user-cancelled" ? PURCHASE_CANCELLED : "purchase_failed"));
      });
      IAP.requestPurchase({
        type: "subs",
        request: {
          google: {
            skus: [product.productId],
            obfuscatedAccountId: accountId,
            subscriptionOffers: product.offerToken ? [{ sku: product.productId, offerToken: product.offerToken }] : undefined,
          },
        },
      }).catch(() => {
        updated.remove();
        failed.remove();
        reject(new Error("purchase_failed"));
      });
    });
  },

  async restore() {
    await IAP.initConnection();
    const purchases = await IAP.getAvailablePurchases();
    return (purchases ?? []).map(toPurchase).filter((p): p is BillingPurchase => p !== null);
  },

  async finish(purchase) {
    const store = open.get(purchase.purchaseToken);
    if (!store) return;
    await IAP.finishTransaction({ purchase: store, isConsumable: false });
    open.delete(purchase.purchaseToken);
  },
};
