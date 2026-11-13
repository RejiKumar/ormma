import { initializeApp, getApps } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import type { CallActivation } from "../../src/exotel/config";
import { generateForMedicines, toPlannable } from "../../src/schedule/generate";
import { generateOnMedicineChangeHandler } from "../../src/schedule/generateOnMedicine";
import { missedDoseCheckerHandler } from "../../src/schedule/missedDose";
import type { PushSender } from "../../src/alerts/fcm";
import { localEventIdSuffix, zonedTimeToMs } from "../../src/schedule/time";

// Runs against the Firestore emulator (npm run test:fns). No real service is called.
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: "demo-ormma" });
});

const db = () => getFirestore();
const IST = "Asia/Kolkata";
const ON: CallActivation = { mode: "log", liveFromMs: null };
const OFF: CallActivation = { mode: "off", liveFromMs: null };
// 19:27 IST on 2027-03-15, the moment of the real test.
const NOW = zonedTimeToMs("2027-03-15", "19:27", IST)!;

let seq = 0;
const unique = (prefix: string): string => `${prefix}_${(seq += 1)}${Math.random().toString(36).slice(2, 8)}`;

const baseMedicine = {
  name: "Vitamin",
  doseText: "1",
  times: ["20:18"],
  startDate: "2027-03-15",
  endDate: null as string | null,
  active: true,
  source: "manual" as const,
  confirmedByHuman: true,
  prescriptionId: null,
  createdBy: "seed",
  createdAt: Timestamp.now(),
};
type Medicine = typeof baseMedicine;

async function seedParent(over: Record<string, unknown> = {}): Promise<string> {
  const parentId = unique("parent");
  await db().doc(`parents/${parentId}`).set({
    name: "Amma",
    phone: "+919812345678",
    language: "en-IN",
    timezone: IST,
    createdBy: "seed",
    active: true,
    callPolicy: { retryCount: 2, retryGapMinutes: 10, missedAfterMinutes: 60, quietHours: { start: "22:00", end: "06:00" } },
    consent: { status: "granted", grantedAt: Timestamp.now(), revokedAt: null, regrantedAt: null, method: "family_attested", policyVersion: "v1", sharedWith: "all_members" },
    createdAt: Timestamp.now(),
    ...over,
  });
  return parentId;
}

async function saveMedicine(parentId: string, medicineId: string, over: Partial<Medicine> = {}): Promise<Medicine> {
  const doc = { ...baseMedicine, ...over };
  await db().doc(`parents/${parentId}/medicines/${medicineId}`).set(doc);
  return doc;
}

const eventId = (medicineId: string, date: string, time: string) =>
  `${medicineId}_${localEventIdSuffix(zonedTimeToMs(date, time, IST)!, IST)}`;
type EventRow = { id: string; status?: string; attempts?: number; lastCallSid?: string | null; medicineId?: string };
const events = async (parentId: string): Promise<EventRow[]> =>
  (await db().collection(`parents/${parentId}/doseEvents`).get()).docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventRow, "id">) }));

const run = (
  parentId: string,
  medicineId: string,
  before: Partial<Medicine> | undefined,
  after: Partial<Medicine> | undefined,
  activation: CallActivation = ON,
) => generateOnMedicineChangeHandler({ parentId, medicineId, before, after }, { nowMs: NOW, activation });

describe("generateOnMedicineChangeHandler (emulator)", () => {
  it("creates the pending event for a medicine saved today with a dose later today", async () => {
    const parentId = await seedParent();
    const medicineId = unique("med");
    const after = await saveMedicine(parentId, medicineId);

    const outcome = await run(parentId, medicineId, undefined, after);
    expect(outcome).toMatchObject({ status: "generated", result: { planned: 1, created: 1, existing: 0, failed: 0 } });

    const all = await events(parentId);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: eventId(medicineId, "2027-03-15", "20:18"), medicineId, status: "pending", attempts: 0 });
  });

  it("the same write twice leaves one event, untouched", async () => {
    const parentId = await seedParent();
    const medicineId = unique("med");
    const after = await saveMedicine(parentId, medicineId);
    await run(parentId, medicineId, undefined, after);

    // The dispatcher has since worked on the event.
    const id = eventId(medicineId, "2027-03-15", "20:18");
    await db().doc(`parents/${parentId}/doseEvents/${id}`).update({ status: "calling", attempts: 1, lastCallSid: "CA123" });

    const again = await run(parentId, medicineId, undefined, after);
    expect(again).toMatchObject({ status: "generated", result: { created: 0, existing: 1 } });
    const all = await events(parentId);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ status: "calling", attempts: 1, lastCallSid: "CA123" });
  });

  it("a second dose time creates only the new event and leaves the first alone", async () => {
    const parentId = await seedParent();
    const medicineId = unique("med");
    const before = await saveMedicine(parentId, medicineId);
    await run(parentId, medicineId, undefined, before);
    const first = eventId(medicineId, "2027-03-15", "20:18");
    await db().doc(`parents/${parentId}/doseEvents/${first}`).update({ status: "taken" });

    const after = await saveMedicine(parentId, medicineId, { times: ["20:18", "21:30"] });
    const outcome = await run(parentId, medicineId, before, after);
    expect(outcome).toMatchObject({ status: "generated", result: { created: 1, existing: 1 } });

    const all = await events(parentId);
    expect(all.map((e) => e.id).sort()).toEqual([first, eventId(medicineId, "2027-03-15", "21:30")].sort());
    expect(all.find((e) => e.id === first)?.status).toBe("taken");
  });

  it("a removed time or a deactivated medicine creates nothing and removes nothing", async () => {
    const parentId = await seedParent();
    const medicineId = unique("med");
    const both = await saveMedicine(parentId, medicineId, { times: ["20:18", "21:30"] });
    await run(parentId, medicineId, undefined, both);
    expect(await events(parentId)).toHaveLength(2);

    const fewer = await saveMedicine(parentId, medicineId, { times: ["20:18"] });
    expect(await run(parentId, medicineId, both, fewer)).toMatchObject({ status: "generated", result: { created: 0, existing: 1 } });
    expect(await events(parentId)).toHaveLength(2);

    const off = await saveMedicine(parentId, medicineId, { times: ["20:18"], active: false });
    expect(await run(parentId, medicineId, fewer, off)).toEqual({ status: "ignored", reason: "not_eligible" });
    expect(await events(parentId)).toHaveLength(2);
  });

  it("a dose time already past today gives no event for today, only the next occurrence within 24 hours", async () => {
    const parentId = await seedParent();
    const medicineId = unique("med");
    const after = await saveMedicine(parentId, medicineId, { times: ["09:00"] });
    await run(parentId, medicineId, undefined, after);

    const all = await events(parentId);
    expect(all.map((e) => e.id)).toEqual([eventId(medicineId, "2027-03-16", "09:00")]);
  });

  it("a medicine that starts tomorrow, or has ended, gets nothing today", async () => {
    const parentId = await seedParent();
    const later = unique("med");
    const ended = unique("med");
    const laterDoc = await saveMedicine(parentId, later, { startDate: "2027-03-22", times: ["20:18"] });
    const endedDoc = await saveMedicine(parentId, ended, { endDate: "2027-03-14", times: ["20:18"] });
    await run(parentId, later, undefined, laterDoc);
    await run(parentId, ended, undefined, endedDoc);
    expect(await events(parentId)).toHaveLength(0);
  });

  it("creates nothing while calling is off, for an inactive or missing parent, or an unconfirmed medicine", async () => {
    const parentId = await seedParent();
    const medicineId = unique("med");
    const after = await saveMedicine(parentId, medicineId);
    expect(await run(parentId, medicineId, undefined, after, OFF)).toEqual({ status: "ignored", reason: "calling_off" });

    const inactive = await seedParent({ active: false });
    const m2 = unique("med");
    const doc2 = await saveMedicine(inactive, m2);
    expect(await run(inactive, m2, undefined, doc2)).toEqual({ status: "ignored", reason: "parent_inactive" });

    const m3 = unique("med");
    const doc3 = await saveMedicine(parentId, m3, { confirmedByHuman: false });
    expect(await run(parentId, m3, undefined, doc3)).toEqual({ status: "ignored", reason: "not_eligible" });

    expect(await run("no_such_parent", "x", undefined, after)).toEqual({ status: "ignored", reason: "parent_inactive" });
    expect(await events(parentId)).toHaveLength(0);
    expect(await events(inactive)).toHaveLength(0);
  });

  it("ignores a display-only edit and a deletion", async () => {
    const parentId = await seedParent();
    const medicineId = unique("med");
    const before = await saveMedicine(parentId, medicineId);
    const renamed = { ...before, name: "Vitamin D" };
    expect(await run(parentId, medicineId, before, renamed)).toEqual({ status: "ignored", reason: "not_schedule_change" });
    expect(await run(parentId, medicineId, before, undefined)).toEqual({ status: "ignored", reason: "not_schedule_change" });
    expect(await events(parentId)).toHaveLength(0);
  });

  it("decides from the stored medicine, not the event payload: a stale delivery for a medicine now deleted creates nothing", async () => {
    const parentId = await seedParent();
    const medicineId = unique("med");
    const payload = { ...baseMedicine };
    expect(await run(parentId, medicineId, undefined, payload)).toEqual({ status: "ignored", reason: "medicine_missing" });
    expect(await events(parentId)).toHaveLength(0);
  });

  it("the daily run's own step after the trigger creates nothing new, and the trigger after it creates nothing new", async () => {
    // The daily run is generateForMedicines applied to every parent's medicines. It is called for one parent
    // here so this test cannot touch the other suites' data in the shared emulator.
    const dailyStep = (parentId: string, medicineId: string, doc: Medicine) =>
      generateForMedicines(db().doc(`parents/${parentId}`), IST, [toPlannable(medicineId, doc as never)], NOW);

    const parentId = await seedParent();
    const medicineId = unique("med");
    const after = await saveMedicine(parentId, medicineId);
    await run(parentId, medicineId, undefined, after);
    const before = await events(parentId);

    expect(await dailyStep(parentId, medicineId, after)).toMatchObject({ created: 0, existing: 1, failed: 0 });
    expect((await events(parentId)).map((e) => e.id).sort()).toEqual(before.map((e) => e.id).sort());

    const other = await seedParent();
    const m2 = unique("med");
    const doc2 = await saveMedicine(other, m2);
    expect(await dailyStep(other, m2, doc2)).toMatchObject({ created: 1, existing: 0 });
    expect(await run(other, m2, undefined, doc2)).toMatchObject({ result: { created: 0, existing: 1 } });
    expect(await events(other)).toHaveLength(1);
  });

  it("logs ids and counts only", async () => {
    const info = jest.spyOn(console, "info").mockImplementation(() => undefined);
    const parentId = await seedParent();
    const medicineId = unique("med");
    const after = await saveMedicine(parentId, medicineId, { name: "SECRETNAME", doseText: "SECRETDOSE" });
    await run(parentId, medicineId, undefined, after);
    const logged = JSON.stringify(info.mock.calls);
    expect(logged).not.toMatch(/SECRETNAME|SECRETDOSE|Amma|919812345678|20:18/);
    expect(logged).toContain(medicineId);
    info.mockRestore();
  });
});

describe("an event left behind by an edit is not a missed dose (emulator)", () => {
  const sender = (): PushSender => ({ sendMulticast: jest.fn().mockResolvedValue({ successCount: 0, failureCount: 0, invalidTokens: [] }) });
  // 23:30 IST: well past a 20:18 or 21:30 dose and the 60 minute missed window.
  const LATE = zonedTimeToMs("2027-03-15", "23:30", IST)!;

  async function seedPendingEvent(parentId: string, medicineId: string, time: string): Promise<string> {
    const id = eventId(medicineId, "2027-03-15", time);
    await db().doc(`parents/${parentId}/doseEvents/${id}`).set({
      medicineId,
      scheduledFor: Timestamp.fromMillis(zonedTimeToMs("2027-03-15", time, IST)!),
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
      lastDispatchFailure: false,
    });
    return id;
  }
  const statusOf = async (parentId: string, id: string) => (await db().doc(`parents/${parentId}/doseEvents/${id}`).get()).data()?.status;
  const alertsOf = async (parentId: string) => (await db().collection(`parents/${parentId}/alerts`).get()).size;

  it("does not alert for a time that was removed, but still alerts for a time that is listed", async () => {
    const parentId = await seedParent();
    const medicineId = unique("med");
    await saveMedicine(parentId, medicineId, { times: ["20:18"] }); // 21:30 was removed
    const removed = await seedPendingEvent(parentId, medicineId, "21:30");
    const listed = await seedPendingEvent(parentId, medicineId, "20:18");

    await missedDoseCheckerHandler({ nowMs: LATE, sender: sender(), activation: ON });

    expect(await statusOf(parentId, removed)).toBe("pending");
    expect(await statusOf(parentId, listed)).toBe("missed");
    expect(await alertsOf(parentId)).toBe(1);
  });

  it("does not alert for a deactivated or unconfirmed medicine", async () => {
    const parentId = await seedParent();
    const off = unique("med");
    const unconfirmed = unique("med");
    await saveMedicine(parentId, off, { active: false });
    await saveMedicine(parentId, unconfirmed, { confirmedByHuman: false });
    const a = await seedPendingEvent(parentId, off, "20:18");
    const b = await seedPendingEvent(parentId, unconfirmed, "20:18");

    await missedDoseCheckerHandler({ nowMs: LATE, sender: sender(), activation: ON });

    expect(await statusOf(parentId, a)).toBe("pending");
    expect(await statusOf(parentId, b)).toBe("pending");
    expect(await alertsOf(parentId)).toBe(0);
  });
});
