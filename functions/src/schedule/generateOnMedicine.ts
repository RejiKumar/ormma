import type { MedicineDoc, ParentDoc } from "../../../shared/types";
import { getDb } from "../db";
import { callActivation, callsEnabled, type CallActivation } from "../exotel/config";
import { generateForMedicines, toPlannable, type CreateResult } from "./generate";
import { FALLBACK_TIME_ZONE } from "./time";

// Creates the dose events for one medicine the moment it is saved or its schedule changes, instead of
// waiting for the daily 00:30 run (call-flow: "Generation when a medicine changes"). It reuses the daily
// run's planning and its create-if-absent write, so repeating it, or running it beside the daily run, is
// harmless. It never overwrites or removes an event. Logs carry ids, counts and statuses only.

/** The fields that decide a medicine's events. A change to anything else (name, dose, notes) does nothing. */
export const SCHEDULE_FIELDS = ["times", "startDate", "endDate", "active", "confirmedByHuman"] as const;

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** True when a medicine was created, or one of the fields that decide its events changed. Never for a deletion. */
export function scheduleChanged(before: Partial<MedicineDoc> | undefined, after: Partial<MedicineDoc> | undefined): boolean {
  if (!after) return false;
  if (!before) return true;
  return SCHEDULE_FIELDS.some((field) => !same(before[field], after[field]));
}

export type MedicineTriggerOutcome =
  | { status: "ignored"; reason: "not_schedule_change" | "calling_off" | "parent_inactive" | "medicine_missing" | "not_eligible" }
  | { status: "generated"; result: CreateResult };

export interface MedicineChange {
  parentId: string;
  medicineId: string;
  before: Partial<MedicineDoc> | undefined;
  after: Partial<MedicineDoc> | undefined;
}

/**
 * Handles one medicine write. The decision is made from the document as it is now, not from the event
 * payload, so a delayed or repeated delivery cannot create events for an outdated schedule.
 */
export async function generateOnMedicineChangeHandler(
  change: MedicineChange,
  options: { nowMs?: number; activation?: CallActivation } = {},
): Promise<MedicineTriggerOutcome> {
  if (!scheduleChanged(change.before, change.after)) return { status: "ignored", reason: "not_schedule_change" };

  // Calling off creates no events (go-live-calls), exactly as in the daily run.
  if (!callsEnabled(options.activation ?? callActivation())) {
    console.info("generateOnMedicine: calling is off", { status: "calling_off" });
    return { status: "ignored", reason: "calling_off" };
  }

  const db = getDb();
  const parentRef = db.doc(`parents/${change.parentId}`);
  const parentSnap = await parentRef.get();
  const parent = parentSnap.data() as ParentDoc | undefined;
  if (!parentSnap.exists || parent?.active !== true) return { status: "ignored", reason: "parent_inactive" };

  const medicineSnap = await parentRef.collection("medicines").doc(change.medicineId).get();
  if (!medicineSnap.exists) return { status: "ignored", reason: "medicine_missing" };
  const medicine = toPlannable(change.medicineId, medicineSnap.data() as MedicineDoc);
  if (!medicine.active || !medicine.confirmedByHuman) return { status: "ignored", reason: "not_eligible" };

  const timeZone = parent.timezone && typeof parent.timezone === "string" ? parent.timezone : FALLBACK_TIME_ZONE;
  const result = await generateForMedicines(parentRef, timeZone, [medicine], options.nowMs ?? Date.now());

  console.info("generateOnMedicine: done", {
    parentId: change.parentId,
    medicineId: change.medicineId,
    planned: result.planned,
    created: result.created,
    existing: result.existing,
    failed: result.failed,
  });
  return { status: "generated", result };
}
