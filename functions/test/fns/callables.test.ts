import { initializeApp, getApps } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import type { CallableRequest } from "firebase-functions/v2/https";
import type { InviteDoc, MemberDoc, ParentDoc, Role, UserDoc } from "../../../shared/types";
import {
  DEFAULT_CALL_POLICY,
  createParentHandler,
  type CreateParentPayload,
} from "../../src/family";
import { createInviteHandler, redeemInviteHandler } from "../../src/invites";
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from "../../src/validation";

// Runs under `firebase emulators:exec --only firestore` (npm run test:fns from the repo root).
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: "demo-ormma" });
});

const db = () => getFirestore();

let seq = 0;
const uid = (prefix: string): string =>
  `${prefix}_${(seq += 1)}${Math.random().toString(36).slice(2, 8)}`;

function call<T>(authUid: string | null, data: T, phone?: string): CallableRequest<T> {
  return {
    data,
    auth: authUid ? { uid: authUid, token: phone ? { phone_number: phone } : {} } : null,
  } as unknown as CallableRequest<T>;
}

const future = (days: number): Timestamp => Timestamp.fromMillis(Date.now() + days * 86_400_000);

async function seedUser(
  userUid: string,
  displayName: string,
  phone = "+919000000001",
): Promise<void> {
  const user: UserDoc = { displayName, phone, fcmTokens: [], createdAt: Timestamp.now() };
  await db().doc(`users/${userUid}`).set(user);
}

async function seedParent(parentId: string, ownerUid: string): Promise<void> {
  const parent: ParentDoc = {
    name: "Amma",
    phone: "+919812345678",
    language: "ml-IN",
    timezone: "Asia/Kolkata",
    createdBy: ownerUid,
    active: true,
    callPolicy: DEFAULT_CALL_POLICY,
    consent: {
      status: "pending",
      grantedAt: null,
      revokedAt: null,
      regrantedAt: null,
      method: null,
      policyVersion: null,
      sharedWith: "all_members",
    },
    createdAt: Timestamp.now(),
  };
  await db().doc(`parents/${parentId}`).set(parent);
}

async function seedMember(parentId: string, memberUid: string, role: Role): Promise<void> {
  const member: MemberDoc = {
    role,
    addedBy: "seeded",
    addedAt: Timestamp.now(),
    displayName: "Seeded",
  };
  await db().doc(`parents/${parentId}/members/${memberUid}`).set(member);
}

async function seedInvite(
  code: string,
  invite: Partial<InviteDoc> & { parentId: string },
): Promise<void> {
  // A seeded code must pass the same format check the callable applies, or the test would
  // exercise the validation branch instead of the intended scenario.
  for (const ch of code) expect(INVITE_CODE_ALPHABET).toContain(ch);
  expect(code).toHaveLength(INVITE_CODE_LENGTH);
  const doc: InviteDoc = {
    role: "editor",
    createdBy: "seeded_owner",
    expiresAt: future(7),
    usedBy: null,
    ...invite,
  };
  await db().doc(`invites/${code}`).set(doc);
}

describe("createParent", () => {
  it("rejects unauthenticated calls", async () => {
    await expect(
      createParentHandler(call(null, { name: "Amma", phone: "+919812345678", language: "ml-IN" })),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejects invalid name, phone and language", async () => {
    const caller = uid("owner");
    for (const payload of [
      { name: "   ", phone: "+919812345678", language: "ml-IN" },
      { name: "Amma", phone: "9812345678", language: "ml-IN" },
      { name: "Amma", phone: "+919812345678", language: "fr-IN" },
      { name: 42, phone: "+919812345678", language: "ml-IN" },
    ]) {
      await expect(
        createParentHandler(call(caller, payload as CreateParentPayload)),
      ).rejects.toMatchObject({
        code: "invalid-argument",
      });
    }
  });

  it("creates the parent and owner member together with consent pending", async () => {
    const caller = uid("owner");
    await seedUser(caller, "Ravi", "+919000000002");

    const { parentId } = await createParentHandler(
      call(caller, { name: "  Amma  ", phone: "+919812345678", language: "ml-IN" }),
    );

    const parentSnap = await db().doc(`parents/${parentId}`).get();
    expect(parentSnap.exists).toBe(true);
    const parent = parentSnap.data() as ParentDoc;
    expect(parent.name).toBe("Amma");
    expect(parent.phone).toBe("+919812345678");
    expect(parent.language).toBe("ml-IN");
    expect(parent.timezone).toBe("Asia/Kolkata");
    expect(parent.createdBy).toBe(caller);
    expect(parent.active).toBe(true);
    expect(parent.callPolicy).toEqual(DEFAULT_CALL_POLICY);
    expect(parent.consent.status).toBe("pending");
    expect(parent.consent.grantedAt).toBeNull();

    const memberSnap = await db().doc(`parents/${parentId}/members/${caller}`).get();
    expect(memberSnap.exists).toBe(true);
    const member = memberSnap.data() as MemberDoc;
    expect(member.role).toBe("owner");
    expect(member.addedBy).toBe(caller);
    expect(member.displayName).toBe("Ravi");
  });

  it("falls back to the auth token phone when the caller has no users doc", async () => {
    const caller = uid("bare");
    const { parentId } = await createParentHandler(
      call(caller, { name: "Appa", phone: "+919812345679", language: "ta-IN" }, "+919000000003"),
    );
    const member = (
      await db().doc(`parents/${parentId}/members/${caller}`).get()
    ).data() as MemberDoc;
    expect(member.displayName).toBe("+919000000003");
  });
});

describe("createInvite", () => {
  it("rejects unauthenticated calls and invalid payloads", async () => {
    await expect(
      createInviteHandler(call(null, { parentId: "x", role: "viewer" })),
    ).rejects.toMatchObject({
      code: "unauthenticated",
    });

    const owner = uid("owner");
    for (const payload of [
      { parentId: "", role: "viewer" },
      { parentId: "p", role: "owner" },
      { parentId: "p", role: "viewer", ttlDays: 0 },
      { parentId: "p", role: "viewer", ttlDays: 8 },
      { parentId: "p", role: "viewer", ttlDays: 1.5 },
    ]) {
      await expect(createInviteHandler(call(owner, payload))).rejects.toMatchObject({
        code: "invalid-argument",
      });
    }
  });

  it("rejects an unknown parent, a non-member and a non-owner member", async () => {
    const caller = uid("caller");
    await expect(
      createInviteHandler(call(caller, { parentId: "no_such_parent", role: "viewer" })),
    ).rejects.toMatchObject({ code: "not-found" });

    const parentId = uid("parent");
    const owner = uid("owner");
    await seedParent(parentId, owner);
    await expect(
      createInviteHandler(call(caller, { parentId, role: "viewer" })),
    ).rejects.toMatchObject({
      code: "permission-denied",
    });

    const editor = uid("editor");
    await seedMember(parentId, editor, "editor");
    await expect(
      createInviteHandler(call(editor, { parentId, role: "viewer" })),
    ).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("lets the owner create an invite with the correct document shape", async () => {
    const owner = uid("owner");
    const parentId = uid("parent");
    await seedParent(parentId, owner);
    await seedMember(parentId, owner, "owner");

    const before = Date.now();
    const { code, expiresAt } = await createInviteHandler(
      call(owner, { parentId, role: "viewer" }),
    );

    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    for (const ch of code) expect(INVITE_CODE_ALPHABET).toContain(ch);

    const invite = (await db().doc(`invites/${code}`).get()).data() as InviteDoc;
    expect(invite.parentId).toBe(parentId);
    expect(invite.role).toBe("viewer");
    expect(invite.createdBy).toBe(owner);
    expect(invite.usedBy).toBeNull();
    expect(Math.abs(invite.expiresAt.toMillis() - (before + 7 * 86_400_000))).toBeLessThan(60_000);
    expect(Math.abs(new Date(expiresAt).getTime() - invite.expiresAt.toMillis())).toBeLessThan(
      1_000,
    );
  });

  it("honours a shorter caller-supplied TTL", async () => {
    const owner = uid("owner");
    const parentId = uid("parent");
    await seedParent(parentId, owner);
    await seedMember(parentId, owner, "owner");

    const before = Date.now();
    const { code } = await createInviteHandler(
      call(owner, { parentId, role: "editor", ttlDays: 2 }),
    );
    const invite = (await db().doc(`invites/${code}`).get()).data() as InviteDoc;
    expect(Math.abs(invite.expiresAt.toMillis() - (before + 2 * 86_400_000))).toBeLessThan(60_000);
  });

  it("retries with a fresh code when the id already exists", async () => {
    const owner = uid("owner");
    const parentId = uid("parent");
    await seedParent(parentId, owner);
    await seedMember(parentId, owner, "owner");
    await seedInvite("AAAAAAAA", { parentId });

    const codes = ["AAAAAAAA", "BBBBBBBB"];
    const { code } = await createInviteHandler(call(owner, { parentId, role: "editor" }), () => {
      const next = codes.shift();
      if (next === undefined) throw new Error("test generator exhausted");
      return next;
    });
    expect(code).toBe("BBBBBBBB");
    expect(codes).toHaveLength(0);
  });

  it("fails after exhausting collision retries", async () => {
    const owner = uid("owner");
    const parentId = uid("parent");
    await seedParent(parentId, owner);
    await seedMember(parentId, owner, "owner");
    await seedInvite("AAAAAAAA", { parentId });

    await expect(
      createInviteHandler(call(owner, { parentId, role: "editor" }), () => "AAAAAAAA"),
    ).rejects.toMatchObject({ code: "internal" });
  });
});

describe("redeemInvite", () => {
  it("rejects unauthenticated calls and malformed codes", async () => {
    await expect(redeemInviteHandler(call(null, { code: "ABCD2345" }))).rejects.toMatchObject({
      code: "unauthenticated",
    });

    const caller = uid("caller");
    for (const code of ["", "abc", "IIIIIIII", "ABCD23456789"]) {
      await expect(redeemInviteHandler(call(caller, { code }))).rejects.toMatchObject({
        code: "invalid-argument",
      });
    }
  });

  it("rejects an unknown code", async () => {
    await expect(
      redeemInviteHandler(call(uid("caller"), { code: "ZZZZ9999" })),
    ).rejects.toMatchObject({
      code: "not-found",
    });
  });

  it("rejects an expired invite without changing anything", async () => {
    const caller = uid("caller");
    const parentId = uid("parent");
    await seedInvite("EXPRED88", { parentId, expiresAt: Timestamp.fromMillis(Date.now() - 1_000) });

    await expect(redeemInviteHandler(call(caller, { code: "EXPRED88" }))).rejects.toMatchObject({
      code: "failed-precondition",
    });
    const invite = (await db().doc("invites/EXPRED88").get()).data() as InviteDoc;
    expect(invite.usedBy).toBeNull();
    expect((await db().doc(`parents/${parentId}/members/${caller}`).get()).exists).toBe(false);
  });

  it("rejects a reused invite without changing the member set", async () => {
    const caller = uid("caller");
    const parentId = uid("parent");
    await seedInvite("USEDCD88", { parentId, usedBy: uid("first_user") });

    await expect(redeemInviteHandler(call(caller, { code: "USEDCD88" }))).rejects.toMatchObject({
      code: "failed-precondition",
    });
    const invite = (await db().doc("invites/USEDCD88").get()).data() as InviteDoc;
    expect(invite.usedBy).not.toBe(caller);
    expect((await db().doc(`parents/${parentId}/members/${caller}`).get()).exists).toBe(false);
  });

  it("rejects a caller who is already a member", async () => {
    const caller = uid("member");
    const parentId = uid("parent");
    await seedInvite("MEMBERD8", { parentId });
    await seedMember(parentId, caller, "viewer");

    await expect(redeemInviteHandler(call(caller, { code: "MEMBERD8" }))).rejects.toMatchObject({
      code: "failed-precondition",
    });
    const invite = (await db().doc("invites/MEMBERD8").get()).data() as InviteDoc;
    expect(invite.usedBy).toBeNull();
  });

  it("redeems a valid invite and creates the member doc", async () => {
    const caller = uid("sibling");
    const owner = uid("owner");
    const parentId = uid("parent");
    await seedUser(caller, "Priya", "+919000000004");
    await seedInvite("BASKET88", { parentId, role: "editor", createdBy: owner });

    const result = await redeemInviteHandler(call(caller, { code: "BASKET88" }));
    expect(result).toEqual({ parentId, role: "editor" });

    const invite = (await db().doc("invites/BASKET88").get()).data() as InviteDoc;
    expect(invite.usedBy).toBe(caller);

    const member = (
      await db().doc(`parents/${parentId}/members/${caller}`).get()
    ).data() as MemberDoc;
    expect(member.role).toBe("editor");
    expect(member.addedBy).toBe(owner);
    expect(member.displayName).toBe("Priya");
    expect(Math.abs(member.addedAt.toMillis() - Date.now())).toBeLessThan(60_000);
  });

  it("falls back to the auth token phone when the caller has no users doc", async () => {
    const caller = uid("bare");
    const parentId = uid("parent");
    await seedInvite("PAPER888", { parentId });

    await redeemInviteHandler(call(caller, { code: "PAPER888" }, "+919000000005"));
    const member = (
      await db().doc(`parents/${parentId}/members/${caller}`).get()
    ).data() as MemberDoc;
    expect(member.displayName).toBe("+919000000005");
  });

  it("lets exactly one of two concurrent redemptions win", async () => {
    const callerA = uid("siblingA");
    const callerB = uid("siblingB");
    const parentId = uid("parent");
    await seedInvite("RACED888", { parentId });

    const results = await Promise.allSettled([
      redeemInviteHandler(call(callerA, { code: "RACED888" })),
      redeemInviteHandler(call(callerB, { code: "RACED888" })),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      code: "failed-precondition",
    });

    const invite = (await db().doc("invites/RACED888").get()).data() as InviteDoc;
    const winner = (
      results.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ parentId: string }>
    ).value;
    expect(winner.parentId).toBe(parentId);
    expect(invite.usedBy === callerA || invite.usedBy === callerB).toBe(true);

    const members = await db().doc(`parents/${parentId}/members/${callerA}`).get();
    const membersB = await db().doc(`parents/${parentId}/members/${callerB}`).get();
    expect([members.exists, membersB.exists].filter(Boolean)).toHaveLength(1);
  });
});
