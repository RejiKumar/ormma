import { Timestamp, type DocumentReference } from "firebase-admin/firestore";
import type { MedicineDoc, ParentDoc } from "../../../shared/types";
import { getDb } from "../db";
import { callActivation, callsEnabled, type CallActivation } from "../exotel/config";
import {
  localDateKey,
  localEventIdSuffix,
  nextDateKey,
  zonedTimeToMs,
  FALLBACK_TIME_ZONE,
} from "./time";

export const GENERATION_HORIZON_MS = 24 * 60 * 60 * 1000;

export interface PlannableMedicine {
  id: string;
  active: boolean;
  confirmedByHuman: boolean;
  times: string[];
  startDate: string;
  endDate: string | null;
}

export interface PlannedEvent {
  id: string;
  medicineId: string;
  scheduledFor: number;
}

/**
 * Plans the dose events whose instants fall in [windowStart, windowEnd) from the medicines that are
 * active, human-confirmed and inside their local date range. Deterministic ids make reruns safe.
 */
export function planDoseEvents(
  medicines: PlannableMedicine[],
  windowStart: number,
  windowEnd: number,
  timeZone: string,
): PlannedEvent[] {
  const planned = new Map<string, PlannedEvent>();
  const lastDate = localDateKey(windowEnd, timeZone);
  let dateKey: string | null = localDateKey(windowStart, timeZone);

  while (dateKey !== null && dateKey <= lastDate) {
    for (const medicine of medicines) {
      if (!medicine.active || !medicine.confirmedByHuman) continue;
      if (dateKey < medicine.startDate) continue;
      if (medicine.endDate !== null && dateKey > medicine.endDate) continue;

      for (const time of medicine.times) {
        const scheduledFor = zonedTimeToMs(dateKey, time, timeZone);
        if (scheduledFor === null) continue;
        if (scheduledFor < windowStart || scheduledFor >= windowEnd) continue;

        const id = `${medicine.id}_${localEventIdSuffix(scheduledFor, timeZone)}`;
        if (!planned.has(id)) {
          planned.set(id, { id, medicineId: medicine.id, scheduledFor });
        }
      }
    }
    dateKey = nextDateKey(dateKey);
  }

  return [...planned.values()].sort(
    (a, b) => a.scheduledFor - b.scheduledFor || a.id.localeCompare(b.id),
  );
}

export interface GenerationSummary {
  parents: number;
  planned: number;
  created: number;
  existing: number;
  failed: number;
}

const isAlreadyExists = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 6 || code === "6" || code === "already-exists" || code === "ALREADY_EXISTS";
};

const timeZoneOf = (parent: ParentDoc | undefined): string =>
  parent?.timezone && typeof parent.timezone === "string" ? parent.timezone : FALLBACK_TIME_ZONE;

/** The planning view of a stored medicine. */
export function toPlannable(id: string, medicine: MedicineDoc): PlannableMedicine {
  return {
    id,
    active: medicine.active === true,
    confirmedByHuman: medicine.confirmedByHuman === true,
    times: Array.isArray(medicine.times) ? medicine.times : [],
    startDate: String(medicine.startDate ?? ""),
    endDate: medicine.endDate ?? null,
  };
}

export interface CreateResult {
  planned: number;
  created: number;
  existing: number;
  failed: number;
}

/**
 * Plans the events of these medicines for the next 24 hours in the parent's time zone and creates the
 * missing ones as pending. `create` never overwrites, so an event that exists keeps its id, status,
 * attempts and resolution fields: repeating this, or running it beside another run, is harmless. Shared
 * by the daily run (all of a parent's medicines) and the trigger that runs when one medicine changes.
 */
export async function generateForMedicines(
  parentRef: DocumentReference,
  timeZone: string,
  medicines: PlannableMedicine[],
  nowMs: number,
): Promise<CreateResult> {
  const result: CreateResult = { planned: 0, created: 0, existing: 0, failed: 0 };
  const planned = planDoseEvents(medicines, nowMs, nowMs + GENERATION_HORIZON_MS, timeZone);
  result.planned = planned.length;

  for (const event of planned) {
    const payload = {
      medicineId: event.medicineId,
      scheduledFor: Timestamp.fromMillis(event.scheduledFor),
      status: "pending" as const,
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
    };

    try {
      await parentRef.collection("doseEvents").doc(event.id).create(payload);
      result.created += 1;
    } catch (error) {
      if (isAlreadyExists(error)) {
        result.existing += 1;
      } else {
        result.failed += 1;
        const code = (error as { code?: unknown } | null)?.code ?? "unknown";
        console.error("generateDoseEvents: create failed", { parentId: parentRef.id, eventId: event.id, code });
      }
    }
  }
  return result;
}

/**
 * Daily generation run. Reads active parents and their active medicines, plans the next 24 hours in
 * each parent's timezone and creates events with `create` so an existing id is never overwritten.
 */
export async function generateDoseEventsHandler(
  options: { nowMs?: number; activation?: CallActivation } = {},
): Promise<GenerationSummary> {
  const nowMs = options.nowMs ?? Date.now();
  const db = getDb();
  const summary: GenerationSummary = { parents: 0, planned: 0, created: 0, existing: 0, failed: 0 };

  // Calling is off: create no dose events, so nothing can later look missed (go-live-calls).
  if (!callsEnabled(options.activation ?? callActivation())) {
    console.info("generateDoseEvents: calling is off", { status: "calling_off" });
    return summary;
  }

  const parentsSnap = await db.collection("parents").where("active", "==", true).get();

  for (const parentDoc of parentsSnap.docs) {
    summary.parents += 1;
    const timeZone = timeZoneOf(parentDoc.data() as ParentDoc);

    const medicinesSnap = await parentDoc.ref.collection("medicines").where("active", "==", true).get();
    const medicines = medicinesSnap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as MedicineDoc) }))
      .filter((medicine) => medicine.confirmedByHuman)
      .map((medicine) => toPlannable(medicine.id, medicine));

    const result = await generateForMedicines(parentDoc.ref, timeZone, medicines, nowMs);
    summary.planned += result.planned;
    summary.created += result.created;
    summary.existing += result.existing;
    summary.failed += result.failed;
  }

  console.info("generateDoseEvents: run complete", {
    parents: summary.parents,
    planned: summary.planned,
    created: summary.created,
    existing: summary.existing,
    failed: summary.failed,
  });
  return summary;
}
