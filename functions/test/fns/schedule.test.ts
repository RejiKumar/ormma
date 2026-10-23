import { initializeApp, getApps } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import type { MedicineDoc, ParentDoc } from "../../../shared/types";
import type { CallProvider, CallRequest } from "../../src/callProvider";
import { dispatchDueCallsHandler } from "../../src/schedule/dispatch";
import { generateDoseEventsHandler } from "../../src/schedule/generate";
import { zonedTimeToMs } from "../../src/schedule/time";

// Runs under `firebase emulators:exec --only firestore` (npm run test:fns from the repo root).
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: "demo-ormma" });
});

const db = () => getFirestore();
const IST = "Asia/Kolkata";
const at = (date: string, time: string): number => zonedTimeToMs(date, time, IST)!;

let seq = 0;
const unique = (prefix: string): string =>
  `${prefix}_${(seq += 1)}${Math.random().toString(36).slice(2, 8)}`;

async function seedParent(overrides: Partial<ParentDoc> = {}): Promise<string> {
  const parentId = unique("parent");
  const parent: ParentDoc = {
    name: "Amma",
    phone: "+919812345678",
    language: "ml-IN",
    timezone: IST,
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

async function seedMedicine(
  parentId: string,
  overrides: Partial<MedicineDoc> = {},
): Promise<string> {
  const medicineId = unique("med");
  const medicine: MedicineDoc = {
    name: "Metformin",
    doseText: "500 mg",
    times: ["10:00"],
    startDate: "2026-01-01",
    endDate: null,
    active: true,
    source: "manual",
    confirmedByHuman: true,
    prescriptionId: null,
    createdBy: "seed",
    createdAt: Timestamp.now(),
    ...overrides,
  };
  await db().doc(`parents/${parentId}/medicines/${medicineId}`).set(medicine);
  return medicineId;
}

async function seedEvent(
  parentId: string,
  eventId: string,
  medicineId: string,
  scheduledFor: number,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await db()
    .doc(`parents/${parentId}/doseEvents/${eventId}`)
    .set({
      medicineId,
      scheduledFor: Timestamp.fromMillis(scheduledFor),
      status: "pending",
      attempts: 0,
      lastCallSid: null,
      missedAt: null,
      resolvedAt: null,
      resolvedByUid: null,
      resolvedBy: null,
      alertSent: false,
      groupConfirmed: false,
      confirmationNote: null,
      lastCallAt: null,
      reminderAt: null,
      ...overrides,
    });
}

const fakeProvider = (): CallProvider & { startCall: jest.Mock } => ({
  name: "test",
  startCall: jest.fn().mockImplementation(async (request: CallRequest) => ({
    callSid: `CA_${request.doseEventIds.join("_")}`,
  })),
});

describe("generateDoseEventsHandler (emulator)", () => {
  const nowMs = at("2026-12-01", "00:30");

  it("creates deterministic pending events and reruns without duplicates", async () => {
    const parentId = await seedParent();
    const medicineId = await seedMedicine(parentId, { times: ["08:00", "21:00"] });

    const first = await generateDoseEventsHandler({ nowMs });
    expect(first.created).toBeGreaterThanOrEqual(2);

    const docs = await db().collection(`parents/${parentId}/doseEvents`).get();
    const mine = docs.docs.filter((doc) => doc.id.startsWith(medicineId));
    expect(mine.map((doc) => doc.id).sort()).toEqual([
      `${medicineId}_202612010800`,
      `${medicineId}_202612012100`,
    ]);
    for (const doc of mine) {
      const data = doc.data();
      expect(data.status).toBe("pending");
      expect(data.attempts).toBe(0);
      expect(data.lastCallAt).toBeNull();
      expect(data.reminderAt).toBeNull();
    }

    const second = await generateDoseEventsHandler({ nowMs });
    expect(second.created).toBe(0);
    expect(second.existing).toBeGreaterThanOrEqual(2);
  });

  it("never overwrites an existing event", async () => {
    const parentId = await seedParent();
    const medicineId = await seedMedicine(parentId, { times: ["08:00"] });
    const eventId = `${medicineId}_202612010800`;
    await seedEvent(parentId, eventId, medicineId, at("2026-12-01", "08:00"), {
      status: "taken",
      attempts: 2,
    });

    await generateDoseEventsHandler({ nowMs });
    const snap = await db().doc(`parents/${parentId}/doseEvents/${eventId}`).get();
    expect(snap.data()?.status).toBe("taken");
    expect(snap.data()?.attempts).toBe(2);
  });

  it("skips inactive parents and inactive or unconfirmed medicines", async () => {
    const inactiveParent = await seedParent({ active: false });
    await seedMedicine(inactiveParent, { times: ["08:00"] });

    const parentId = await seedParent();
    const inactive = await seedMedicine(parentId, { times: ["08:00"], active: false });
    const unconfirmed = await seedMedicine(parentId, { times: ["08:00"], confirmedByHuman: false });

    await generateDoseEventsHandler({ nowMs });
    expect((await db().collection(`parents/${inactiveParent}/doseEvents`).get()).size).toBe(0);
    expect((await db().collection(`parents/${parentId}/doseEvents`).get()).size).toBe(0);
    expect(inactive).not.toBe(unconfirmed);
  });
});

describe("dispatchDueCallsHandler (emulator)", () => {
  const nowMs = at("2026-10-23", "10:00");

  it("claims an eligible event, writes the call sid and never dials twice", async () => {
    const parentId = await seedParent();
    const medicineId = await seedMedicine(parentId);
    await seedEvent(parentId, "evt_claim", medicineId, nowMs);
    const provider = fakeProvider();

    const first = await dispatchDueCallsHandler({ nowMs, provider });
    expect(first.called).toBe(1);
    expect(first.eventsCalled).toBe(1);
    expect(provider.startCall).toHaveBeenCalledTimes(1);

    const snap = await db().doc(`parents/${parentId}/doseEvents/evt_claim`).get();
    expect(snap.data()?.status).toBe("calling");
    expect(snap.data()?.attempts).toBe(1);
    expect(snap.data()?.lastCallSid).toBe("CA_evt_claim");
    expect(snap.data()?.lastCallAt).toBeTruthy();

    const session = await db()
      .doc(`parents/${parentId}/callSessions/CA_evt_claim`)
      .get();
    expect(session.exists).toBe(true);
    expect(session.data()).toMatchObject({
      callSid: "CA_evt_claim",
      doseEventIds: ["evt_claim"],
      status: "initiated",
      dtmfInput: null,
      endedAt: null,
    });

    const second = await dispatchDueCallsHandler({ nowMs, provider });
    expect(second.called).toBe(0);
    expect(provider.startCall).toHaveBeenCalledTimes(1);
  });

  it("claims same-minute events for one parent as a single grouped call", async () => {
    const parentId = await seedParent();
    const m1 = await seedMedicine(parentId);
    const m2 = await seedMedicine(parentId);
    await seedEvent(parentId, "evt_group_a", m1, nowMs);
    await seedEvent(parentId, "evt_group_b", m2, nowMs);
    const provider = fakeProvider();

    const result = await dispatchDueCallsHandler({ nowMs, provider });
    expect(result.called).toBe(1);
    expect(result.eventsCalled).toBe(2);
    expect(provider.startCall).toHaveBeenCalledTimes(1);
    expect(provider.startCall.mock.calls[0][0].doseEventIds.sort()).toEqual([
      "evt_group_a",
      "evt_group_b",
    ]);

    for (const entry of ["evt_group_a", "evt_group_b"]) {
      const snap = await db().doc(`parents/${parentId}/doseEvents/${entry}`).get();
      expect(snap.data()?.status).toBe("calling");
      expect(snap.data()?.lastCallSid).toBe("CA_evt_group_a_evt_group_b");
    }
  });

  it("skips revoked consent and inactive medicines", async () => {
    const revoked = await seedParent();
    await db().doc(`parents/${revoked}`).update({ "consent.status": "revoked" });
    const revokedMed = await seedMedicine(revoked);
    await seedEvent(revoked, "evt_revoked", revokedMed, nowMs);

    const parentId = await seedParent();
    const inactive = await seedMedicine(parentId, { active: false });
    await seedEvent(parentId, "evt_inactive", inactive, nowMs);
    const provider = fakeProvider();

    const result = await dispatchDueCallsHandler({ nowMs, provider });
    expect(result.called).toBe(0);
    expect(provider.startCall).not.toHaveBeenCalled();
    expect((await db().doc(`parents/${revoked}/doseEvents/evt_revoked`).get()).data()?.status).toBe(
      "pending",
    );
    expect(
      (await db().doc(`parents/${parentId}/doseEvents/evt_inactive`).get()).data()?.status,
    ).toBe("pending");
  });

  it("defers inside quiet hours without touching the event", async () => {
    const quietNow = at("2026-10-23", "23:00");
    const parentId = await seedParent();
    const medicineId = await seedMedicine(parentId, { times: ["22:30"] });
    await seedEvent(parentId, "evt_quiet", medicineId, at("2026-10-23", "22:30"));
    const provider = fakeProvider();

    const result = await dispatchDueCallsHandler({ nowMs: quietNow, provider });
    expect(result.called).toBe(0);
    const snap = await db().doc(`parents/${parentId}/doseEvents/evt_quiet`).get();
    expect(snap.data()?.status).toBe("pending");
    expect(snap.data()?.attempts).toBe(0);
  });

  it("returns claimed events to pending when the provider fails, keeping attempts", async () => {
    const parentId = await seedParent();
    const medicineId = await seedMedicine(parentId);
    await seedEvent(parentId, "evt_fail", medicineId, nowMs);
    const provider: CallProvider = {
      name: "broken",
      startCall: jest.fn().mockRejectedValue({ code: "ECONN" }),
    };

    const result = await dispatchDueCallsHandler({ nowMs, provider });
    expect(result.called).toBe(0);
    expect(result.failed).toBe(1);

    const snap = await db().doc(`parents/${parentId}/doseEvents/evt_fail`).get();
    expect(snap.data()?.status).toBe("pending");
    expect(snap.data()?.attempts).toBe(1);
    expect(snap.data()?.lastCallSid).toBeNull();
    expect((await db().collection(`parents/${parentId}/callSessions`).get()).size).toBe(0);

    const retry = await dispatchDueCallsHandler({ nowMs: nowMs + 60_000, provider });
    expect(retry.called).toBe(0);
    expect(provider.startCall).toHaveBeenCalledTimes(1);
  });
});
