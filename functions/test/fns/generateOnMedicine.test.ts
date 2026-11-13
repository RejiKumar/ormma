import { initializeApp, getApps } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import type { CallActivation } from "../../src/exotel/config";
import { generateDoseEventsHandler } from "../../src/schedule/generate";
import { generateOnMedicineChangeHandler } from "../../src/schedule/generateOnMedicine";
import { localEventIdSuffix, zonedTimeToMs } from "../../src/schedule/time";

// Runs against the Firestore emulator (npm run test:fns). No real service is called.
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: "demo-ormma" });
});

const db = () => getFirestore();
const IST = "Asia/Kolkata";
const ON: CallActivation = { mode: "log", liveFromMs: null };
const OFF: CallActivation = { mode: "off", liveFromMs: null };
// 19:27 IST on 2026-11-13, the moment of the real test.
const NOW = zonedTimeToMs("2026-11-13", "19:27", IST)!;

let seq = 0;
const unique = (prefix: string): string => `${prefix}_${(seq += 1)}${Math.random().toString(36).slice(2, 8)}`;

const baseMedicine = {
  name: "Vitamin",
  doseText: "1",
  times: ["20:18"],
  startDate: "2026-11-13",
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
    expect(all[0]).toMatchObject({ id: eventId(medicineId, "2026-11-13", "20:18"), medicineId, status: "pending", attempts: 0 });
  });

  it("the same write twice leaves one event, untouched", async () => {
    const parentId = await seedParent();
    const medicineId = unique("med");
    const after = await saveMedicine(parentId, medicineId);
    await run(parentId, medicineId, undefined, after);

    // The dispatcher has since worked on the event.
    const id = eventId(medicineId, "2026-11-13", "20:18");
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
    const first = eventId(medicineId, "2026-11-13", "20:18");
    await db().doc(`parents/${parentId}/doseEvents/${first}`).update({ status: "taken" });

    const after = await saveMedicine(parentId, medicineId, { times: ["20:18", "21:30"] });
    const outcome = await run(parentId, medicineId, before, after);
    expect(outcome).toMatchObject({ status: "generated", result: { created: 1, existing: 1 } });

    const all = await events(parentId);
    expect(all.map((e) => e.id).sort()).toEqual([first, eventId(medicineId, "2026-11-13", "21:30")].sort());
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
    expect(all.map((e) => e.id)).toEqual([eventId(medicineId, "2026-11-14", "09:00")]);
  });

  it("a medicine that starts tomorrow, or has ended, gets nothing today", async () => {
    const parentId = await seedParent();
    const later = unique("med");
    const ended = unique("med");
    const laterDoc = await saveMedicine(parentId, later, { startDate: "2026-11-20", times: ["20:18"] });
    const endedDoc = await saveMedicine(parentId, ended, { endDate: "2026-11-12", times: ["20:18"] });
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

  it("the daily run after the trigger creates nothing new, and the trigger after the daily run creates nothing new", async () => {
    const parentId = await seedParent();
    const medicineId = unique("med");
    const after = await saveMedicine(parentId, medicineId);
    await run(parentId, medicineId, undefined, after);
    const before = await events(parentId);

    const daily = await generateDoseEventsHandler({ nowMs: NOW, activation: ON });
    expect(daily.failed).toBe(0);
    const afterDaily = await events(parentId);
    expect(afterDaily.map((e) => e.id).sort()).toEqual(before.map((e) => e.id).sort());

    const other = await seedParent();
    const m2 = unique("med");
    const doc2 = await saveMedicine(other, m2);
    await generateDoseEventsHandler({ nowMs: NOW, activation: ON });
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
