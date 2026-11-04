import { initializeApp, getApps } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import type { CallableRequest } from "firebase-functions/v2/https";
import type { Consent, Role } from "../../../shared/types";
import {
  PRESENCE_THROTTLE_MS,
  familyCallId,
  getDoseEscalationHandler,
  logFamilyCallHandler,
  touchPresenceHandler,
} from "../../src/companion";
import { deleteParentHandler, exportParentDataHandler } from "../../src/data/exportDelete";

// Runs under `firebase emulators:exec --only firestore` (npm run test:fns from the repo root).
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: "demo-ormma" });
});

const db = () => getFirestore();

let seq = 0;
const id = (prefix: string): string => `${prefix}_${(seq += 1)}${Math.random().toString(36).slice(2, 7)}`;

function call<T>(uid: string | null, data: T): CallableRequest<T> {
  return { data, auth: uid ? { uid, token: {} } : null } as unknown as CallableRequest<T>;
}

const consentGranted = (over: Partial<Consent> = {}): Consent => ({
  status: "granted",
  grantedAt: Timestamp.fromMillis(0),
  revokedAt: null,
  regrantedAt: null,
  method: "family_attested",
  policyVersion: "v1",
  sharedWith: "all_members",
  ...over,
});

const T0 = Date.UTC(2026, 10, 3, 3, 0, 0); // 2026-11-03 08:30 IST
const ts = (ms: number) => Timestamp.fromMillis(ms);

async function seedParent(consent: Consent = consentGranted()): Promise<string> {
  const parentId = id("p");
  await db().doc(`parents/${parentId}`).set({ name: "Amma", consent, timezone: "Asia/Kolkata" });
  return parentId;
}

async function seedMember(parentId: string, uid: string, role: Role): Promise<void> {
  await db()
    .doc(`parents/${parentId}/members/${uid}`)
    .set({ role, addedBy: "x", addedAt: ts(0), displayName: uid });
}

async function seedEvent(parentId: string, over: Record<string, unknown> = {}): Promise<string> {
  const eventId = id("e");
  await db()
    .doc(`parents/${parentId}/doseEvents/${eventId}`)
    .set({ status: "missed", attempts: 3, scheduledFor: ts(T0), ...over });
  return eventId;
}

async function seedSession(
  parentId: string,
  eventId: string,
  status: string,
  startedAtMs: number,
): Promise<void> {
  await db()
    .doc(`parents/${parentId}/callSessions/${id("CA")}`)
    .set({
      callSid: "secret-sid",
      doseEventIds: [eventId],
      status,
      dtmfInput: "9",
      rawTranscriptRef: "transcripts/secret",
      startedAt: ts(startedAtMs),
      endedAt: null,
    });
}

describe("getDoseEscalation", () => {
  it("returns ordered attempts with outcomes, and the alert time", async () => {
    const parentId = await seedParent();
    const owner = id("owner");
    await seedMember(parentId, owner, "owner");
    const eventId = await seedEvent(parentId);
    await seedSession(parentId, eventId, "no_answer", T0 + 20 * 60_000);
    await seedSession(parentId, eventId, "no_answer", T0);
    await seedSession(parentId, eventId, "completed", T0 + 10 * 60_000);
    await db()
      .doc(`parents/${parentId}/alerts/a1`)
      .set({ type: "missed_dose", message: "m", relatedEventId: eventId, createdAt: ts(T0 + 60 * 60_000), readBy: [] });

    const result = await getDoseEscalationHandler(call(owner, { parentId, doseEventId: eventId }), T0 + 3_600_000);
    expect(result.attempts).toEqual([
      { ordinal: 1, startedAtMs: T0, outcome: "no_answer" },
      { ordinal: 2, startedAtMs: T0 + 10 * 60_000, outcome: "answered" },
      { ordinal: 3, startedAtMs: T0 + 20 * 60_000, outcome: "no_answer" },
    ]);
    expect(result.alertAtMs).toBe(T0 + 60 * 60_000);
    expect(result.unplaced).toBe(0);
  });

  it("returns only ordinal, start time and outcome for each attempt (no session fields)", async () => {
    const parentId = await seedParent();
    const viewer = id("viewer");
    await seedMember(parentId, viewer, "viewer");
    const eventId = await seedEvent(parentId);
    await seedSession(parentId, eventId, "no_answer", T0);
    const result = await getDoseEscalationHandler(call(viewer, { parentId, doseEventId: eventId }), T0);
    expect(Object.keys(result.attempts[0]).sort()).toEqual(["ordinal", "outcome", "startedAtMs"]);
    expect(JSON.stringify(result)).not.toMatch(/secret|dtmf|transcript/i);
  });

  it("maps stale initiated sessions to failed, fresh ones to calling, and counts unplaced attempts", async () => {
    const parentId = await seedParent();
    const owner = id("owner");
    await seedMember(parentId, owner, "owner");
    const eventId = await seedEvent(parentId, { attempts: 4 });
    await seedSession(parentId, eventId, "initiated", T0);
    await seedSession(parentId, eventId, "initiated", T0 + 30 * 60_000);
    const result = await getDoseEscalationHandler(call(owner, { parentId, doseEventId: eventId }), T0 + 35 * 60_000);
    expect(result.attempts.map((a) => a.outcome)).toEqual(["failed", "calling"]);
    expect(result.unplaced).toBe(2);
  });

  it("denies a non-member and an unauthenticated caller", async () => {
    const parentId = await seedParent();
    const eventId = await seedEvent(parentId);
    await expect(
      getDoseEscalationHandler(call(id("stranger"), { parentId, doseEventId: eventId })),
    ).rejects.toMatchObject({ code: "permission-denied" });
    await expect(
      getDoseEscalationHandler(call(null, { parentId, doseEventId: eventId })),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("validates the payload and reports a missing event", async () => {
    const parentId = await seedParent();
    const owner = id("owner");
    await seedMember(parentId, owner, "owner");
    await expect(getDoseEscalationHandler(call(owner, { parentId }))).rejects.toMatchObject({
      code: "invalid-argument",
    });
    await expect(
      getDoseEscalationHandler(call(owner, { parentId, doseEventId: "nope" })),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("returns nothing to a non-owner when the event falls in the revoked window; owners still see it", async () => {
    const parentId = await seedParent(
      consentGranted({ status: "revoked", revokedAt: ts(T0 - 1000), regrantedAt: null }),
    );
    const owner = id("owner");
    const viewer = id("viewer");
    await seedMember(parentId, owner, "owner");
    await seedMember(parentId, viewer, "viewer");
    const eventId = await seedEvent(parentId);
    await seedSession(parentId, eventId, "no_answer", T0);
    const hidden = await getDoseEscalationHandler(call(viewer, { parentId, doseEventId: eventId }), T0);
    expect(hidden.attempts).toEqual([]);
    const seen = await getDoseEscalationHandler(call(owner, { parentId, doseEventId: eventId }), T0);
    expect(seen.attempts).toHaveLength(1);
  });
});

describe("touchPresence", () => {
  it("writes lastSeenAt once per throttle window", async () => {
    const parentId = await seedParent();
    const uid = id("m");
    await seedMember(parentId, uid, "editor");
    const first = await touchPresenceHandler(call(uid, { parentId }), T0);
    const second = await touchPresenceHandler(call(uid, { parentId }), T0 + 60_000);
    const third = await touchPresenceHandler(call(uid, { parentId }), T0 + PRESENCE_THROTTLE_MS + 1);
    expect([first.updated, second.updated, third.updated]).toEqual([true, false, true]);
    const stored = (await db().doc(`parents/${parentId}/members/${uid}`).get()).data() as {
      lastSeenAt: Timestamp;
    };
    expect(stored.lastSeenAt.toMillis()).toBe(T0 + PRESENCE_THROTTLE_MS + 1);
  });

  it("denies a non-member and writes nothing", async () => {
    const parentId = await seedParent();
    const stranger = id("stranger");
    await expect(touchPresenceHandler(call(stranger, { parentId }), T0)).rejects.toMatchObject({
      code: "permission-denied",
    });
    expect((await db().doc(`parents/${parentId}/members/${stranger}`).get()).exists).toBe(false);
  });
});

describe("logFamilyCall", () => {
  it("creates one entry per member per minute, for any role", async () => {
    const parentId = await seedParent();
    const viewer = id("viewer");
    await seedMember(parentId, viewer, "viewer");
    const a = await logFamilyCallHandler(call(viewer, { parentId }), T0);
    const b = await logFamilyCallHandler(call(viewer, { parentId }), T0 + 30_000);
    const c = await logFamilyCallHandler(call(viewer, { parentId }), T0 + 61_000);
    expect(a.id).toBe(b.id);
    expect(c.id).not.toBe(a.id);
    expect(a.id).toBe(familyCallId(viewer, T0));
    const snap = await db().collection(`parents/${parentId}/familyCalls`).get();
    expect(snap.size).toBe(2);
    expect((snap.docs[0].data() as { byUid: string }).byUid).toBe(viewer);
  });

  it("changes no dose event or alert", async () => {
    const parentId = await seedParent();
    const owner = id("owner");
    await seedMember(parentId, owner, "owner");
    const eventId = await seedEvent(parentId);
    await logFamilyCallHandler(call(owner, { parentId }), T0);
    const event = (await db().doc(`parents/${parentId}/doseEvents/${eventId}`).get()).data() as { status: string };
    expect(event.status).toBe("missed");
    expect((await db().collection(`parents/${parentId}/alerts`).get()).size).toBe(0);
  });

  it("denies a non-member", async () => {
    const parentId = await seedParent();
    await expect(logFamilyCallHandler(call(id("x"), { parentId }), T0)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });
});

describe("export and delete include the new data", () => {
  it("exports familyCalls and the parent's emergencyContacts, and deletes familyCalls", async () => {
    const parentId = await seedParent();
    const owner = id("owner");
    await seedMember(parentId, owner, "owner");
    await db()
      .doc(`parents/${parentId}`)
      .update({ emergencyContacts: [{ label: "Sreeja", kind: "neighbour", phone: "+919876500001" }] });
    await logFamilyCallHandler(call(owner, { parentId }), T0);

    const exported = (await exportParentDataHandler(call(owner, { parentId }))) as {
      parent: { emergencyContacts: unknown[] };
      familyCalls: unknown[];
    };
    expect(exported.familyCalls).toHaveLength(1);
    expect(exported.parent.emergencyContacts).toHaveLength(1);

    await deleteParentHandler(call(owner, { parentId }));
    expect((await db().collection(`parents/${parentId}/familyCalls`).get()).size).toBe(0);
    expect((await db().doc(`parents/${parentId}`).get()).exists).toBe(false);
  });
});
