import { deleteMyAccountHandler, setMyDisplayNameHandler } from "../../src/account";
import { getApps, initializeApp } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import type { CallableRequest } from "firebase-functions/v2/https";
import { createParentHandler } from "../../src/family";
import { createInviteHandler, redeemInviteHandler } from "../../src/invites";
import { tokenHashOf } from "../../src/subscription/entitlement";
import { playBillingEventsHandler } from "../../src/subscription/events";
import type { PlayClient, PlayPurchase } from "../../src/subscription/play";
import { verifyPurchaseHandler } from "../../src/subscription/verify";

// Runs under the Firestore emulator (npm run test:fns).
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: "demo-ormma" });
});

const db = () => getFirestore();
let seq = 0;
const uid = (label: string) => `sub_${label}_${Date.now().toString(36)}_${(seq += 1)}`;
const call = <T>(auth: string | null, data: T) =>
  ({
    auth: auth ? { uid: auth, token: { phone_number: "+919000000001" } } : undefined,
    data,
  }) as unknown as CallableRequest<T>;
const day = 86_400_000;
let tokenSeq = 0;
const freshToken = () => `purchase-token-${Date.now()}-${(tokenSeq += 1)}-abcdefghij`;

function fakePlay(over: Partial<PlayPurchase> = {}): PlayClient & { acknowledged: string[] } {
  const acknowledged: string[] = [];
  const purchase: PlayPurchase = {
    productId: "ormma_family_monthly",
    status: "active",
    expiresAtMs: Date.now() + 30 * day,
    accountId: null,
    acknowledged: false,
    ...over,
  };
  return {
    acknowledged,
    getSubscription: jest.fn(async () => purchase),
    acknowledge: jest.fn(async (_product: string, token: string) => {
      acknowledged.push(token);
    }),
  };
}

const newParent = (owner: string, name = "Amma") =>
  createParentHandler(call(owner, { name, phone: "+919812345678", language: "en-IN" } as never));

async function grantPlan(owner: string, status: "active" | "expired" | "refunded", expiresInDays: number) {
  await db()
    .doc(`subscriptions/${owner}`)
    .set({
      status,
      productId: "ormma_family_monthly",
      expiresAt: Timestamp.fromMillis(Date.now() + expiresInDays * day),
      tokenHash: `h_${owner}`,
      updatedAt: Timestamp.now(),
    });
}

describe("verifyPurchase", () => {
  it("rejects unauthenticated calls, bad tokens and unknown products", async () => {
    const TOKEN = freshToken();
    await expect(verifyPurchaseHandler(call(null, { productId: "ormma_family_monthly", purchaseToken: TOKEN }), fakePlay())).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(verifyPurchaseHandler(call(uid("a"), { productId: "ormma_family_monthly", purchaseToken: "short" }), fakePlay())).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(verifyPurchaseHandler(call(uid("a"), { productId: "other_product", purchaseToken: TOKEN }), fakePlay())).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("acknowledges a valid purchase and stores the entitlement with a hash, never the token", async () => {
    const owner = uid("buyer");
    const TOKEN = freshToken();
    const play = fakePlay({ accountId: owner });
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const result = await verifyPurchaseHandler(call(owner, { productId: "ormma_family_monthly", purchaseToken: TOKEN }), play);
    expect(result.status).toBe("active");
    expect(play.acknowledged).toEqual([TOKEN]);
    const doc = (await db().doc(`subscriptions/${owner}`).get()).data();
    expect(doc?.status).toBe("active");
    expect(doc?.tokenHash).toBe(tokenHashOf(TOKEN));
    expect(JSON.stringify(doc)).not.toContain(TOKEN);
    expect(log.mock.calls.flat().join(" ")).not.toContain(TOKEN);
    log.mockRestore();
  });

  it("does not acknowledge twice and refuses a mismatching product or a pending purchase", async () => {
    const owner = uid("buyer");
    const TOKEN = freshToken();
    const already = fakePlay({ acknowledged: true });
    await verifyPurchaseHandler(call(owner, { productId: "ormma_family_monthly", purchaseToken: TOKEN }), already);
    expect(already.acknowledged).toEqual([]);
    await expect(verifyPurchaseHandler(call(uid("b"), { productId: "ormma_family_yearly", purchaseToken: TOKEN }), fakePlay())).rejects.toMatchObject({ code: "failed-precondition" });
    await expect(verifyPurchaseHandler(call(uid("c"), { productId: "ormma_family_monthly", purchaseToken: TOKEN }), fakePlay({ status: null }))).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("refuses a purchase made for another account or already linked to another account", async () => {
    const owner = uid("buyer");
    const TOKEN = freshToken();
    await expect(
      verifyPurchaseHandler(call(owner, { productId: "ormma_family_monthly", purchaseToken: TOKEN }), fakePlay({ accountId: "someone_else" })),
    ).rejects.toMatchObject({ code: "permission-denied" });
    const token = `linked-${Date.now()}-abcdefghij`;
    await verifyPurchaseHandler(call(owner, { productId: "ormma_family_monthly", purchaseToken: token }), fakePlay());
    await expect(
      verifyPurchaseHandler(call(uid("thief"), { productId: "ormma_family_monthly", purchaseToken: token }), fakePlay()),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });
});

describe("playBillingEvents", () => {
  async function subscribed(token: string) {
    const owner = uid("subscriber");
    await verifyPurchaseHandler(call(owner, { productId: "ormma_family_monthly", purchaseToken: token }), fakePlay());
    return owner;
  }

  it("renews, cancels and expires from Google's current state, and is idempotent", async () => {
    const token = `events-${Date.now()}-abcdefghij`;
    const owner = await subscribed(token);
    const message = { subscriptionNotification: { notificationType: 2, purchaseToken: token } };
    const later = Date.now() + 60 * day;
    expect(await playBillingEventsHandler(message, fakePlay({ expiresAtMs: later }))).toBe("updated");
    expect(await playBillingEventsHandler(message, fakePlay({ expiresAtMs: later }))).toBe("updated");
    let doc = (await db().doc(`subscriptions/${owner}`).get()).data();
    expect(doc?.status).toBe("active");
    expect(doc?.expiresAt.toMillis()).toBe(later);
    await playBillingEventsHandler(message, fakePlay({ status: "cancelled", expiresAtMs: later }));
    doc = (await db().doc(`subscriptions/${owner}`).get()).data();
    expect(doc?.status).toBe("cancelled");
    await playBillingEventsHandler(message, fakePlay({ status: "expired", expiresAtMs: Date.now() - day }));
    doc = (await db().doc(`subscriptions/${owner}`).get()).data();
    expect(doc?.status).toBe("expired");
  });

  it("ends the entitlement at once on a revoke or a voided purchase", async () => {
    const token = `refund-${Date.now()}-abcdefghij`;
    const owner = await subscribed(token);
    await playBillingEventsHandler({ subscriptionNotification: { notificationType: 12, purchaseToken: token } }, fakePlay());
    expect((await db().doc(`subscriptions/${owner}`).get()).data()?.status).toBe("refunded");
    const token2 = `void-${Date.now()}-abcdefghij`;
    const owner2 = await subscribed(token2);
    await playBillingEventsHandler({ voidedPurchaseNotification: { purchaseToken: token2 } }, fakePlay());
    expect((await db().doc(`subscriptions/${owner2}`).get()).data()?.status).toBe("refunded");
  });

  it("ignores tokens this app never verified and messages without a token", async () => {
    expect(await playBillingEventsHandler({ subscriptionNotification: { notificationType: 2, purchaseToken: "unknown-token-abcdefghij" } }, fakePlay())).toBe("ignored");
    expect(await playBillingEventsHandler({}, fakePlay())).toBe("ignored");
  });
});

describe("plan limits are enforced on the server", () => {
  it("lets a free owner have one parent and refuses the second", async () => {
    const owner = uid("free");
    await newParent(owner);
    await expect(newParent(owner, "Appa")).rejects.toMatchObject({ code: "resource-exhausted", details: { reason: "plan_parent_limit" } });
  });

  it("lets an active subscriber have three parents and refuses the fourth", async () => {
    const owner = uid("paid");
    await grantPlan(owner, "active", 30);
    await newParent(owner, "A");
    await newParent(owner, "B");
    await newParent(owner, "C");
    await expect(newParent(owner, "D")).rejects.toMatchObject({ code: "resource-exhausted" });
  });

  it("keeps the paid limits for 3 days after expiry and drops them after 8", async () => {
    const graced = uid("grace");
    await grantPlan(graced, "expired", -3);
    await newParent(graced, "A");
    await newParent(graced, "B");
    const lapsed = uid("lapsed");
    await grantPlan(lapsed, "expired", -8);
    await newParent(lapsed, "A");
    await expect(newParent(lapsed, "B")).rejects.toMatchObject({ code: "resource-exhausted" });
  });

  it("drops the paid limits at once after a refund", async () => {
    const owner = uid("refunded");
    await grantPlan(owner, "refunded", 20);
    await newParent(owner, "A");
    await expect(newParent(owner, "B")).rejects.toMatchObject({ code: "resource-exhausted" });
  });

  it("limits members: a free parent holds the owner and one more, counting unused invites", async () => {
    const owner = uid("owner");
    const { parentId } = await newParent(owner);
    const { code } = await createInviteHandler(call(owner, { parentId, role: "viewer" }));
    await expect(createInviteHandler(call(owner, { parentId, role: "viewer" }))).rejects.toMatchObject({
      code: "resource-exhausted",
      details: { reason: "plan_member_limit" },
    });
    await redeemInviteHandler(call(uid("sibling"), { code }));
    await expect(createInviteHandler(call(owner, { parentId, role: "viewer" }))).rejects.toMatchObject({ code: "resource-exhausted" });
  });

  it("refuses a redemption when the parent is already full, and lets a paid parent reach six", async () => {
    const owner = uid("owner");
    const { parentId } = await newParent(owner);
    await db().doc(`parents/${parentId}/members/${uid("m1")}`).set({ role: "viewer", addedBy: owner, addedAt: Timestamp.now(), displayName: "M" });
    await db().doc("invites/CCCCCCCC").set({ parentId, role: "viewer", createdBy: owner, expiresAt: Timestamp.fromMillis(Date.now() + day), usedBy: null });
    await expect(redeemInviteHandler(call(uid("late"), { code: "CCCCCCCC" }))).rejects.toMatchObject({ code: "resource-exhausted" });

    const paidOwner = uid("paidowner");
    await grantPlan(paidOwner, "active", 30);
    const paid = await newParent(paidOwner);
    for (let i = 0; i < 5; i += 1) {
      const { code } = await createInviteHandler(call(paidOwner, { parentId: paid.parentId, role: "viewer" }));
      await redeemInviteHandler(call(uid(`joiner${i}`), { code }));
    }
    await expect(createInviteHandler(call(paidOwner, { parentId: paid.parentId, role: "viewer" }))).rejects.toMatchObject({ code: "resource-exhausted" });
  });
});

describe("deleteMyAccount", () => {


  it("refuses while the caller owns a parent and deletes nothing", async () => {
    const owner = uid("owner");
    const { parentId } = await newParent(owner);
    const deleteAuth = jest.fn(async () => undefined);
    await expect(deleteMyAccountHandler(call(owner, {}), deleteAuth)).rejects.toMatchObject({
      code: "failed-precondition",
      details: { reason: "owns_parents", parentIds: [parentId] },
    });
    expect(deleteAuth).not.toHaveBeenCalled();
    expect((await db().doc(`parents/${parentId}/members/${owner}`).get()).exists).toBe(true);
  });

  it("deletes a member's own data and sign-in account and leaves everyone else's data", async () => {
    const owner = uid("owner");
    const { parentId } = await newParent(owner);
    const { code } = await createInviteHandler(call(owner, { parentId, role: "viewer" }));
    const member = uid("member");
    await redeemInviteHandler(call(member, { code }));
    await db().doc(`users/${member}`).set({ displayName: "M", phone: "+919000000002", fcmTokens: [], createdAt: Timestamp.now() });
    await grantPlan(member, "active", 30);
    await db().doc("invites/DDDDDDDD").set({ parentId, role: "viewer", createdBy: member, expiresAt: Timestamp.fromMillis(Date.now() + day), usedBy: null });
    const deleteAuth = jest.fn(async () => undefined);

    await expect(deleteMyAccountHandler(call(member, {}), deleteAuth)).resolves.toEqual({ deleted: true });

    expect(deleteAuth).toHaveBeenCalledWith(member);
    expect((await db().doc(`parents/${parentId}/members/${member}`).get()).exists).toBe(false);
    expect((await db().doc(`users/${member}`).get()).exists).toBe(false);
    expect((await db().doc(`subscriptions/${member}`).get()).exists).toBe(false);
    expect((await db().doc("invites/DDDDDDDD").get()).exists).toBe(false);
    expect((await db().doc(`parents/${parentId}/members/${owner}`).get()).exists).toBe(true);
    expect((await db().doc(`parents/${parentId}`).get()).exists).toBe(true);
  });

  it("rejects an unauthenticated call", async () => {
    await expect(deleteMyAccountHandler(call(null, {}), jest.fn())).rejects.toMatchObject({ code: "unauthenticated" });
  });
});

describe("setMyDisplayName", () => {
  it("updates the profile and every member document of the caller, and validates the name", async () => {
    const owner = uid("owner");
    const { parentId } = await newParent(owner);
    await setMyDisplayNameHandler(call(owner, { displayName: "  Rahul K  " }));
    expect((await db().doc(`parents/${parentId}/members/${owner}`).get()).data()?.displayName).toBe("Rahul K");
    expect((await db().doc(`users/${owner}`).get()).data()?.displayName).toBe("Rahul K");
    await expect(setMyDisplayNameHandler(call(owner, { displayName: "   " }))).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(setMyDisplayNameHandler(call(owner, { displayName: "x".repeat(61) }))).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(setMyDisplayNameHandler(call(null, { displayName: "A" }))).rejects.toMatchObject({ code: "unauthenticated" });
  });
});
