import { initializeApp, getApps } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import type { CallableRequest } from "firebase-functions/v2/https";
import type { Consent, Role } from "../../../shared/types";
import {
  getCallHistoryHandler,
  markDosesSeenHandler,
  setMemberProfileHandler,
  setNotifyPrefsHandler,
} from "../../src/parity";
import { eveningDigestHandler } from "../../src/schedule/eveningDigest";
import type { PushSender } from "../../src/alerts/fcm";

// Runs under `firebase emulators:exec --only firestore` (npm run test:fns from the repo root).
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: "demo-ormma" });
});

const db = () => getFirestore();
let seq = 0;
const id = (prefix: string): string => `${prefix}_${(seq += 1)}${Math.random().toString(36).slice(2, 7)}`;
const ts = (ms: number) => Timestamp.fromMillis(ms);

function call<T>(uid: string | null, data: T): CallableRequest<T> {
  return { data, auth: uid ? { uid, token: {} } : null } as unknown as CallableRequest<T>;
}

const granted = (over: Partial<Consent> = {}): Consent => ({
  status: "granted",
  grantedAt: ts(0),
  revokedAt: null,
  regrantedAt: null,
  method: "family_attested",
  policyVersion: "v1",
  sharedWith: "all_members",
  ...over,
});

// 2026-11-03 08:30 IST
const T0 = Date.UTC(2026, 10, 3, 3, 0, 0);

async function seedParent(extra: Record<string, unknown> = {}): Promise<string> {
  const parentId = id("p");
  await db().doc(`parents/${parentId}`).set({
    name: "Amma",
    timezone: "Asia/Kolkata",
    active: true,
    consent: granted(),
    ...extra,
  });
  return parentId;
}
async function seedMember(parentId: string, uid: string, role: Role, extra: Record<string, unknown> = {}) {
  await db()
    .doc(`parents/${parentId}/members/${uid}`)
    .set({ role, addedBy: "x", addedAt: ts(0), displayName: uid, ...extra });
}
async function seedEvent(parentId: string, over: Record<string, unknown> = {}): Promise<string> {
  const eventId = id("e");
  await db()
    .doc(`parents/${parentId}/doseEvents/${eventId}`)
    .set({ status: "taken", attempts: 1, scheduledFor: ts(T0), medicineId: "m1", ...over });
  return eventId;
}

describe("markDosesSeen", () => {
  it("records seenBy for the caller once and never overwrites", async () => {
    const parentId = await seedParent();
    const uid = id("m");
    await seedMember(parentId, uid, "viewer");
    const eventId = await seedEvent(parentId);

    const first = await markDosesSeenHandler(call(uid, { parentId, eventIds: [eventId] }), T0 + 1000);
    const second = await markDosesSeenHandler(call(uid, { parentId, eventIds: [eventId] }), T0 + 999_000);
    expect(first.marked).toBe(1);
    expect(second.marked).toBe(0);
    const stored = (await db().doc(`parents/${parentId}/doseEvents/${eventId}`).get()).data() as {
      seenBy: Record<string, Timestamp>;
    };
    expect(stored.seenBy[uid].toMillis()).toBe(T0 + 1000);
  });

  it("keeps each member's own entry", async () => {
    const parentId = await seedParent();
    const a = id("a");
    const b = id("b");
    await seedMember(parentId, a, "owner");
    await seedMember(parentId, b, "editor");
    const eventId = await seedEvent(parentId);
    await markDosesSeenHandler(call(a, { parentId, eventIds: [eventId] }), T0 + 1000);
    await markDosesSeenHandler(call(b, { parentId, eventIds: [eventId] }), T0 + 2000);
    const stored = (await db().doc(`parents/${parentId}/doseEvents/${eventId}`).get()).data() as {
      seenBy: Record<string, Timestamp>;
    };
    expect(Object.keys(stored.seenBy).sort()).toEqual([a, b].sort());
  });

  it("denies a non-member, rejects a bad payload, and skips events outside the member's visibility", async () => {
    const parentId = await seedParent({ consent: granted({ status: "revoked", revokedAt: ts(T0 - 1000) }) });
    const viewer = id("viewer");
    await seedMember(parentId, viewer, "viewer");
    const eventId = await seedEvent(parentId);
    await expect(markDosesSeenHandler(call(id("x"), { parentId, eventIds: [eventId] }))).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(markDosesSeenHandler(call(viewer, { parentId, eventIds: [] }))).rejects.toMatchObject({
      code: "invalid-argument",
    });
    const result = await markDosesSeenHandler(call(viewer, { parentId, eventIds: [eventId] }), T0);
    expect(result.marked).toBe(0);
  });
});

describe("setMemberProfile and setNotifyPrefs", () => {
  it("writes only the caller's own member document", async () => {
    const parentId = await seedParent();
    const me = id("me");
    const other = id("other");
    await seedMember(parentId, me, "editor");
    await seedMember(parentId, other, "owner");
    await setMemberProfileHandler(call(me, { parentId, relationship: "Daughter", city: "Dubai" }));
    const mine = (await db().doc(`parents/${parentId}/members/${me}`).get()).data() as Record<string, unknown>;
    const theirs = (await db().doc(`parents/${parentId}/members/${other}`).get()).data() as Record<string, unknown>;
    expect(mine).toMatchObject({ relationship: "Daughter", city: "Dubai" });
    expect(theirs.relationship).toBeUndefined();
  });

  it("clears a field with an empty string and rejects text that is too long or not text", async () => {
    const parentId = await seedParent();
    const me = id("me");
    await seedMember(parentId, me, "viewer", { city: "Dubai" });
    await setMemberProfileHandler(call(me, { parentId, city: "  " }));
    expect(((await db().doc(`parents/${parentId}/members/${me}`).get()).data() as Record<string, unknown>).city).toBeUndefined();
    await expect(
      setMemberProfileHandler(call(me, { parentId, relationship: "x".repeat(31) })),
    ).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(setMemberProfileHandler(call(me, { parentId, city: 5 }))).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("saves three booleans and rejects anything else", async () => {
    const parentId = await seedParent();
    const me = id("me");
    await seedMember(parentId, me, "viewer");
    await setNotifyPrefsHandler(call(me, { parentId, missed: false, summary: true, quiet: true }));
    const stored = (await db().doc(`parents/${parentId}/members/${me}`).get()).data() as {
      notify: Record<string, boolean>;
    };
    expect(stored.notify).toEqual({ missed: false, summary: true, quiet: true });
    await expect(
      setNotifyPrefsHandler(call(me, { parentId, missed: "no", summary: true, quiet: true })),
    ).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(
      setNotifyPrefsHandler(call(id("x"), { parentId, missed: true, summary: true, quiet: true })),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });
});

describe("getCallHistory", () => {
  it("merges Ormma calls and family calls newest first with only time, outcome and duration", async () => {
    const parentId = await seedParent();
    const uid = id("m");
    await seedMember(parentId, uid, "viewer");
    await db().doc(`parents/${parentId}/callSessions/CA1`).set({
      callSid: "secret-sid",
      doseEventIds: ["e1"],
      status: "completed",
      dtmfInput: "1",
      rawTranscriptRef: "transcripts/secret",
      startedAt: ts(T0),
      endedAt: ts(T0 + 48_000),
    });
    await db().doc(`parents/${parentId}/callSessions/CA2`).set({
      callSid: "secret-2",
      doseEventIds: ["e1"],
      status: "no_answer",
      dtmfInput: null,
      startedAt: ts(T0 + 10 * 60_000),
      endedAt: null,
    });
    await db().doc(`parents/${parentId}/familyCalls/f1`).set({ byUid: "rahul", at: ts(T0 + 20 * 60_000) });

    const { entries } = await getCallHistoryHandler(call(uid, { parentId }), T0 + 3_600_000);
    expect(entries.map((e) => e.kind)).toEqual(["family", "ormma", "ormma"]);
    expect(entries[1]).toEqual({ kind: "ormma", atMs: T0 + 10 * 60_000, outcome: "no_answer" });
    expect(entries[2]).toEqual({ kind: "ormma", atMs: T0, outcome: "answered", durationSec: 48 });
    expect(JSON.stringify(entries)).not.toMatch(/secret|dtmf|transcript/i);
  });

  it("denies a non-member and hides calls outside a non-owner's visibility", async () => {
    const parentId = await seedParent({ consent: granted({ status: "revoked", revokedAt: ts(T0 - 1000) }) });
    const viewer = id("viewer");
    await seedMember(parentId, viewer, "viewer");
    await db().doc(`parents/${parentId}/familyCalls/f1`).set({ byUid: "rahul", at: ts(T0) });
    await expect(getCallHistoryHandler(call(id("x"), { parentId }))).rejects.toMatchObject({
      code: "permission-denied",
    });
    expect((await getCallHistoryHandler(call(viewer, { parentId }))).entries).toEqual([]);
  });
});

describe("sendEveningDigest", () => {
  // 20:10 IST on 2026-11-03
  const EVENING = Date.UTC(2026, 10, 3, 14, 40, 0);
  const sender = (): PushSender & { sendMulticast: jest.Mock } => ({
    sendMulticast: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0, invalidTokens: [] }),
  });

  async function seedFamily(notify?: Record<string, boolean>) {
    const parentId = await seedParent();
    await db().doc(`parents/${parentId}/medicines/m1`).set({ name: "Metformin", doseText: "500mg" });
    await seedMember(parentId, "digest-on", "owner");
    await seedMember(parentId, "digest-off", "editor", { notify: { missed: true, summary: false, quiet: false, ...notify } });
    await db().doc("users/digest-on").set({ fcmTokens: ["t-on"] });
    await db().doc("users/digest-off").set({ fcmTokens: ["t-off"] });
    await seedEvent(parentId, { status: "taken", resolvedAt: ts(T0 + 4 * 60_000) });
    return parentId;
  }

  it("sends one digest to members with the summary on, and only once per local day", async () => {
    const parentId = await seedFamily();
    const push = sender();
    await eveningDigestHandler({ db: db(), sender: push, nowMs: EVENING });
    await eveningDigestHandler({ db: db(), sender: push, nowMs: EVENING + 5 * 60_000 });
    const mine = push.sendMulticast.mock.calls.filter((c) => c[1].data.parentId === parentId);
    expect(mine).toHaveLength(1);
    expect(mine[0][0]).toEqual(["t-on"]);
    expect(mine[0][1].body).toContain("Amma is on track: 1 of 1 doses confirmed.");
    const parent = (await db().doc(`parents/${parentId}`).get()).data() as { lastDigestDate: string };
    expect(parent.lastDigestDate).toBe("2026-11-03");
  });

  it("does nothing outside the 20:00 hour", async () => {
    const parentId = await seedFamily();
    const push = sender();
    await eveningDigestHandler({ db: db(), sender: push, nowMs: Date.UTC(2026, 10, 3, 9, 0, 0) });
    expect(push.sendMulticast.mock.calls.filter((c) => c[1].data.parentId === parentId)).toHaveLength(0);
  });

  it("sends nothing when consent is not granted or there are no doses", async () => {
    const noConsent = await seedParent({ consent: granted({ status: "pending" }) });
    const noDoses = await seedParent();
    await seedMember(noDoses, "u-nodose", "owner");
    await db().doc("users/u-nodose").set({ fcmTokens: ["t-nodose"] });
    const push = sender();
    await eveningDigestHandler({ db: db(), sender: push, nowMs: EVENING });
    const ids = push.sendMulticast.mock.calls.map((c) => c[1].data.parentId);
    expect(ids).not.toContain(noConsent);
    expect(ids).not.toContain(noDoses);
  });
});
