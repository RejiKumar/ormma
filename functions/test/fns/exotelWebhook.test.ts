import { initializeApp, getApps } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import type { ParentDoc } from "../../../shared/types";
import { exotelWebhookHandler, type WebhookRequest } from "../../src/exotel/webhook";

// Runs under `firebase emulators:exec --only firestore` (npm run test:fns from the repo root).
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: "demo-ormma" });
});

const db = () => getFirestore();
const TOKEN = "test-webhook-token";
const nowMs = Date.UTC(2026, 9, 23, 4, 30);
const at = nowMs;

let seq = 0;
const unique = (prefix: string): string =>
  `${prefix}_${(seq += 1)}${Math.random().toString(36).slice(2, 8)}`;

async function seedParent(overrides: Partial<ParentDoc> = {}): Promise<string> {
  const parentId = unique("parent");
  const parent: ParentDoc = {
    name: "Amma",
    phone: "+919812345678",
    language: "ml-IN",
    timezone: "Asia/Kolkata",
    createdBy: "seed",
    active: true,
    callPolicy: {
      retryCount: 2,
      retryGapMinutes: 10,
      missedAfterMinutes: 60,
      quietHours: { start: "22:00", end: "06:00" },
    },
    consent: {
      status: "granted",
      grantedAt: Timestamp.now(),
      revokedAt: null,
      regrantedAt: null,
      method: "family_attested",
      policyVersion: "v1",
      sharedWith: "all_members",
    },
    createdAt: Timestamp.now(),
    ...overrides,
  };
  await db().doc(`parents/${parentId}`).set(parent);
  return parentId;
}

async function seedEvent(parentId: string, eventId: string, overrides: Record<string, unknown> = {}) {
  await db()
    .doc(`parents/${parentId}/doseEvents/${eventId}`)
    .set({
      medicineId: unique("med"),
      scheduledFor: Timestamp.fromMillis(at),
      status: "calling",
      attempts: 1,
      lastCallSid: null,
      missedAt: null,
      resolvedAt: null,
      resolvedByUid: null,
      resolvedBy: null,
      alertSent: false,
      groupConfirmed: false,
      confirmationNote: null,
      lastCallAt: Timestamp.fromMillis(at),
      reminderAt: null,
      ...overrides,
    });
}

async function seedSession(
  parentId: string,
  callSid: string,
  doseEventIds: string[],
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await db()
    .doc(`parents/${parentId}/callSessions/${callSid}`)
    .set({
      callSid,
      doseEventIds,
      status: "initiated",
      dtmfInput: null,
      startedAt: Timestamp.fromMillis(at),
      endedAt: null,
      ...overrides,
    });
}

const gather = (
  parentId: string,
  callSid: string,
  digits: string,
  token = TOKEN,
): WebhookRequest => ({
  method: "GET",
  query: { token, kind: "gather", CallSid: callSid, CustomField: parentId, digits },
  body: {},
});

const status = (
  parentId: string,
  callSid: string,
  value: string,
  eventType = "terminal",
  token = TOKEN,
): WebhookRequest => ({
  method: "POST",
  query: { token, kind: "status" },
  body: { CallSid: callSid, CustomField: parentId, Status: value, EventType: eventType },
});

const call = (request: WebhookRequest) =>
  exotelWebhookHandler(request, { db: db(), token: TOKEN, nowMs });

const eventData = async (parentId: string, eventId: string) =>
  (await db().doc(`parents/${parentId}/doseEvents/${eventId}`).get()).data();
const sessionData = async (parentId: string, callSid: string) =>
  (await db().doc(`parents/${parentId}/callSessions/${callSid}`).get()).data();

describe("exotelWebhookHandler auth and validation (emulator)", () => {
  it("rejects a bad or missing token before touching any document", async () => {
    const parentId = await seedParent();
    await seedEvent(parentId, "evt_auth");
    await seedSession(parentId, "CA_auth", ["evt_auth"]);

    await expect(call(gather(parentId, "CA_auth", "1", "wrong"))).resolves.toMatchObject({
      status: 401,
    });
    const missing: WebhookRequest = {
      method: "GET",
      query: { kind: "gather", CallSid: "CA_auth", CustomField: parentId, digits: "1" },
      body: {},
    };
    await expect(call(missing)).resolves.toMatchObject({ status: 401 });

    expect((await sessionData(parentId, "CA_auth"))?.dtmfInput).toBeNull();
    expect((await eventData(parentId, "evt_auth"))?.status).toBe("calling");
  });

  it("rejects malformed callbacks and unknown kinds", async () => {
    const parentId = await seedParent();
    await seedSession(parentId, "CA_bad", []);

    await expect(
      call({
        method: "POST",
        query: { token: TOKEN, kind: "status" },
        body: { CallSid: "has space", CustomField: parentId, Status: "completed" },
      }),
    ).resolves.toMatchObject({ status: 400 });

    await expect(
      call({ method: "POST", query: { token: TOKEN, kind: "nope" }, body: {} }),
    ).resolves.toMatchObject({ status: 400 });

    await expect(call(gather(parentId, "CA_bad", "1"))).resolves.toMatchObject({ status: 200 });
  });

  it("ignores callbacks for unknown sessions and empty digits", async () => {
    const parentId = await seedParent();

    await expect(call(gather(parentId, "CA_missing", "1"))).resolves.toMatchObject({
      status: 200,
      body: { ok: true, ignored: "unknown_session" },
    });
    await expect(call(status(parentId, "CA_missing", "completed"))).resolves.toMatchObject({
      status: 200,
      body: { ok: true, ignored: "unknown_session" },
    });

    await seedEvent(parentId, "evt_empty");
    await seedSession(parentId, "CA_empty", ["evt_empty"]);
    await expect(call(gather(parentId, "CA_empty", ""))).resolves.toMatchObject({
      status: 200,
      body: { ok: true, ignored: "empty_digits" },
    });
    expect((await eventData(parentId, "evt_empty"))?.status).toBe("calling");
    expect((await sessionData(parentId, "CA_empty"))?.dtmfInput).toBeNull();
  });
});

describe("exotelWebhookHandler DTMF (emulator)", () => {
  it("marks a single event taken on 1 and records the input", async () => {
    const parentId = await seedParent();
    await seedEvent(parentId, "evt_one");
    await seedSession(parentId, "CA_one", ["evt_one"]);

    await expect(call(gather(parentId, "CA_one", "1"))).resolves.toMatchObject({
      status: 200,
      body: { ok: true },
    });

    const event = await eventData(parentId, "evt_one");
    expect(event).toMatchObject({
      status: "taken",
      resolvedBy: "dtmf",
      resolvedByUid: null,
      groupConfirmed: false,
    });
    expect(event?.resolvedAt).toBeTruthy();

    const session = await sessionData(parentId, "CA_one");
    expect(session).toMatchObject({ dtmfInput: "1", status: "answered" });
  });

  it("marks a grouped call not taken on 2 with one reminder after the retry gap", async () => {
    const parentId = await seedParent();
    await seedEvent(parentId, "evt_two_a");
    await seedEvent(parentId, "evt_two_b");
    await seedSession(parentId, "CA_two", ["evt_two_a", "evt_two_b"]);

    await call(gather(parentId, "CA_two", "2"));

    for (const id of ["evt_two_a", "evt_two_b"]) {
      const event = await eventData(parentId, id);
      expect(event?.status).toBe("not_taken");
      expect(event?.groupConfirmed).toBe(true);
      expect(event?.reminderAt.toMillis()).toBe(nowMs + 10 * 60_000);
    }
    expect((await sessionData(parentId, "CA_two"))?.dtmfInput).toBe("2");
  });

  it("revokes consent on 9 and stops the calling events", async () => {
    const parentId = await seedParent();
    await seedEvent(parentId, "evt_nine");
    await seedSession(parentId, "CA_nine", ["evt_nine"]);

    await call(gather(parentId, "CA_nine", "9"));

    const parent = (await db().doc(`parents/${parentId}`).get()).data() as ParentDoc;
    expect(parent.consent.status).toBe("revoked");
    expect(parent.consent.revokedAt).toBeTruthy();
    expect(parent.consent.regrantedAt).toBeNull();
    expect((await eventData(parentId, "evt_nine"))?.status).toBe("pending");
    expect((await sessionData(parentId, "CA_nine"))?.dtmfInput).toBe("9");
  });

  it("treats any other key as unclear and schedules a reminder", async () => {
    const parentId = await seedParent();
    await seedEvent(parentId, "evt_five");
    await seedSession(parentId, "CA_five", ["evt_five"]);

    await call(gather(parentId, "CA_five", "5"));

    const event = await eventData(parentId, "evt_five");
    expect(event?.status).toBe("unclear");
    expect(event?.reminderAt.toMillis()).toBe(nowMs);
    expect((await sessionData(parentId, "CA_five"))?.dtmfInput).toBe("5");
  });

  it("is idempotent for duplicate DTMF and closed sessions", async () => {
    const parentId = await seedParent();
    await seedEvent(parentId, "evt_dup");
    await seedSession(parentId, "CA_dup", ["evt_dup"]);

    await call(gather(parentId, "CA_dup", "1"));
    const first = await eventData(parentId, "evt_dup");

    await expect(call(gather(parentId, "CA_dup", "2"))).resolves.toMatchObject({
      status: 200,
      body: { ok: true, ignored: "duplicate_dtmf" },
    });
    expect((await eventData(parentId, "evt_dup"))?.status).toBe(first?.status);
    expect((await sessionData(parentId, "CA_dup"))?.dtmfInput).toBe("1");

    await seedEvent(parentId, "evt_closed");
    await seedSession(parentId, "CA_closed", ["evt_closed"], { status: "completed" });
    await expect(call(gather(parentId, "CA_closed", "1"))).resolves.toMatchObject({
      status: 200,
      body: { ok: true, ignored: "session_terminal" },
    });
    expect((await eventData(parentId, "evt_closed"))?.status).toBe("calling");
  });
});

describe("exotelWebhookHandler status callbacks (emulator)", () => {
  it("records answered, then a completed call with DTMF as completed without touching events", async () => {
    const parentId = await seedParent();
    await seedEvent(parentId, "evt_status_ok");
    await seedSession(parentId, "CA_status_ok", ["evt_status_ok"]);

    await call(status(parentId, "CA_status_ok", "answered", "answered"));
    expect((await sessionData(parentId, "CA_status_ok"))?.status).toBe("answered");

    await call(gather(parentId, "CA_status_ok", "1"));
    await call(status(parentId, "CA_status_ok", "completed"));

    const event = await eventData(parentId, "evt_status_ok");
    expect(event?.status).toBe("taken");

    const session = await sessionData(parentId, "CA_status_ok");
    expect(session?.status).toBe("completed");
    expect(session?.endedAt).toBeTruthy();
  });

  it("marks a dropped script failed and returns unanswered events to pending", async () => {
    const parentId = await seedParent();
    await seedEvent(parentId, "evt_dropped");
    await seedSession(parentId, "CA_dropped", ["evt_dropped"], { status: "answered" });

    await call(status(parentId, "CA_dropped", "completed"));

    expect((await sessionData(parentId, "CA_dropped"))?.status).toBe("failed");
    const event = await eventData(parentId, "evt_dropped");
    expect(event?.status).toBe("pending");
  });

  it("records a never-answered call as completed with a pending event", async () => {
    const parentId = await seedParent();
    await seedEvent(parentId, "evt_unanswered");
    await seedSession(parentId, "CA_unanswered", ["evt_unanswered"]);

    await call(status(parentId, "CA_unanswered", "no-answer"));

    expect((await sessionData(parentId, "CA_unanswered"))?.status).toBe("no_answer");
    expect((await eventData(parentId, "evt_unanswered"))?.status).toBe("pending");
  });

  it("records busy and failed callbacks and ignores duplicate terminal callbacks", async () => {
    const parentId = await seedParent();
    await seedEvent(parentId, "evt_busy");
    await seedSession(parentId, "CA_busy", ["evt_busy"]);

    await call(status(parentId, "CA_busy", "busy"));
    const firstEnd = await sessionData(parentId, "CA_busy");
    expect(firstEnd?.status).toBe("no_answer");

    await expect(call(status(parentId, "CA_busy", "failed"))).resolves.toMatchObject({
      status: 200,
      body: { ok: true, ignored: "duplicate_status" },
    });
    expect((await sessionData(parentId, "CA_busy"))?.status).toBe("no_answer");
    expect((await sessionData(parentId, "CA_busy"))?.endedAt).toEqual(firstEnd?.endedAt);

    await seedSession(parentId, "CA_failed", []);
    await call(status(parentId, "CA_failed", "failed"));
    expect((await sessionData(parentId, "CA_failed"))?.status).toBe("failed");
  });
});
