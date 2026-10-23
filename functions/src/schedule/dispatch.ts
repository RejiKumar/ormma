import { Timestamp, type Firestore } from "firebase-admin/firestore";
import type {
  CallPolicy,
  CallSessionDoc,
  ConsentStatus,
  DoseStatus,
  Language,
  MedicineDoc,
  ParentDoc,
  QuietHours,
  ResolvedBy,
} from "../../../shared/types";
import { LoggingCallProvider, type CallProvider } from "../callProvider";
import { getDb } from "../db";
import { isQuietNow } from "./quietHours";
import { applyTransition, type DoseEventState } from "./stateMachine";
import { localClock } from "./time";

// Every dispatcher run may start at most one call per (parent, scheduledFor) group, and never a new
// attempt for the same event sooner than this. Exported for tests and the design note.
export const MIN_ATTEMPT_SPACING_MS = 10 * 60 * 1000;
export const DISPATCH_QUERY_LIMIT = 200;

export const DEFAULT_CALL_POLICY: CallPolicy = {
  retryCount: 2,
  retryGapMinutes: 10,
  missedAfterMinutes: 60,
  quietHours: { start: "22:00", end: "06:00" },
};

export interface DispatchParent {
  id: string;
  active: boolean;
  consentStatus: ConsentStatus;
  timezone: string;
  callPolicy: CallPolicy;
}

export interface DispatchEvent {
  id: string;
  parentId: string;
  medicineId: string;
  scheduledFor: number;
  attempts: number;
  lastCallAt: number | null;
}

export interface DispatchMedicine {
  id: string;
  active: boolean;
  confirmedByHuman: boolean;
  times: string[];
}

export interface PlannedCall {
  parentId: string;
  parent: DispatchParent;
  scheduledFor: number;
  eventIds: string[];
}

export type SkipReason =
  | "missing_parent"
  | "parent_inactive"
  | "consent_not_granted"
  | "attempts_exhausted"
  | "attempt_too_soon"
  | "quiet_hours"
  | "medicine_missing"
  | "medicine_inactive"
  | "medicine_unconfirmed"
  | "time_removed";

export interface SkippedEvent {
  eventId: string;
  reason: SkipReason;
}

export interface PlanCallsInput {
  events: DispatchEvent[];
  parents: ReadonlyMap<string, DispatchParent>;
  medicines: ReadonlyMap<string, readonly DispatchMedicine[]>;
  now: number;
  minAttemptSpacingMs?: number;
}

export interface PlanCallsResult {
  calls: PlannedCall[];
  skipped: SkippedEvent[];
}

function eligibilityReason(
  event: DispatchEvent,
  parents: ReadonlyMap<string, DispatchParent>,
  medicines: ReadonlyMap<string, readonly DispatchMedicine[]>,
  now: number,
  minSpacing: number,
): SkipReason | null {
  const parent = parents.get(event.parentId);
  if (!parent) return "missing_parent";
  if (!parent.active) return "parent_inactive";
  if (parent.consentStatus !== "granted") return "consent_not_granted";

  if (event.attempts >= 1 + parent.callPolicy.retryCount) return "attempts_exhausted";
  if (event.lastCallAt !== null && now - event.lastCallAt < minSpacing) {
    return "attempt_too_soon";
  }
  if (isQuietNow(now, parent.timezone, parent.callPolicy.quietHours)) return "quiet_hours";

  const medicine = (medicines.get(event.parentId) ?? []).find((m) => m.id === event.medicineId);
  if (!medicine) return "medicine_missing";
  if (!medicine.active) return "medicine_inactive";
  if (!medicine.confirmedByHuman) return "medicine_unconfirmed";
  if (!medicine.times.includes(localClock(event.scheduledFor, parent.timezone))) {
    return "time_removed";
  }
  return null;
}

/** Pure eligibility + grouping pass. Every gate is evaluated before a group is formed. */
export function planCallGroups(input: PlanCallsInput): PlanCallsResult {
  const minSpacing = input.minAttemptSpacingMs ?? MIN_ATTEMPT_SPACING_MS;
  const groups = new Map<string, PlannedCall>();
  const skipped: SkippedEvent[] = [];

  for (const event of input.events) {
    const reason = eligibilityReason(event, input.parents, input.medicines, input.now, minSpacing);
    if (reason) {
      skipped.push({ eventId: event.id, reason });
      continue;
    }

    const parent = input.parents.get(event.parentId)!;
    const key = `${event.parentId}|${event.scheduledFor}`;
    const existing = groups.get(key);
    if (existing) {
      existing.eventIds.push(event.id);
    } else {
      groups.set(key, {
        parentId: event.parentId,
        parent,
        scheduledFor: event.scheduledFor,
        eventIds: [event.id],
      });
    }
  }

  const calls = [...groups.values()]
    .map((call) => ({ ...call, eventIds: [...call.eventIds].sort() }))
    .sort(
      (a, b) => a.scheduledFor - b.scheduledFor || a.parentId.localeCompare(b.parentId),
    );
  return { calls, skipped };
}

// ---------- Firestore handler ----------

const toMillis = (value: unknown): number | null => {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "object" && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis(): number }).toMillis();
  }
  if (typeof value === "number") return value;
  return null;
};

export const toDoseEventState = (data: Record<string, unknown>): DoseEventState => ({
  status: (data.status as DoseStatus) ?? "pending",
  attempts: Number(data.attempts ?? 0),
  scheduledFor: toMillis(data.scheduledFor) ?? 0,
  lastCallSid: (data.lastCallSid as string | null) ?? null,
  missedAt: toMillis(data.missedAt),
  resolvedAt: toMillis(data.resolvedAt),
  resolvedBy: (data.resolvedBy as ResolvedBy | null) ?? null,
  resolvedByUid: (data.resolvedByUid as string | null) ?? null,
  alertSent: data.alertSent === true,
  groupConfirmed: data.groupConfirmed === true,
  lastCallAt: toMillis(data.lastCallAt),
  reminderAt: toMillis(data.reminderAt),
});

const policyOf = (parent: ParentDoc): CallPolicy => {
  const policy = parent.callPolicy as Partial<CallPolicy> | undefined;
  const quiet: Partial<QuietHours> | undefined = policy?.quietHours;
  return {
    retryCount: typeof policy?.retryCount === "number" ? policy.retryCount : DEFAULT_CALL_POLICY.retryCount,
    retryGapMinutes:
      typeof policy?.retryGapMinutes === "number"
        ? policy.retryGapMinutes
        : DEFAULT_CALL_POLICY.retryGapMinutes,
    missedAfterMinutes:
      typeof policy?.missedAfterMinutes === "number"
        ? policy.missedAfterMinutes
        : DEFAULT_CALL_POLICY.missedAfterMinutes,
    quietHours: {
      start: typeof quiet?.start === "string" ? quiet.start : DEFAULT_CALL_POLICY.quietHours.start,
      end: typeof quiet?.end === "string" ? quiet.end : DEFAULT_CALL_POLICY.quietHours.end,
    },
  };
};

export interface DispatchSummary {
  due: number;
  called: number;
  eventsCalled: number;
  skipped: number;
  failed: number;
}

export interface DispatchOptions {
  nowMs?: number;
  provider?: CallProvider;
  limit?: number;
}

async function loadParentAndMedicines(
  db: Firestore,
  parentId: string,
): Promise<{ parent: DispatchParent | null; raw: ParentDoc | null; medicines: DispatchMedicine[] }> {
  const parentSnap = await db.doc(`parents/${parentId}`).get();
  if (!parentSnap.exists) return { parent: null, raw: null, medicines: [] };
  const data = parentSnap.data() as ParentDoc;

  const medsSnap = await db
    .collection(`parents/${parentId}/medicines`)
    .where("active", "==", true)
    .get();
  const medicines: DispatchMedicine[] = medsSnap.docs.map((doc) => {
    const medicine = doc.data() as MedicineDoc;
    return {
      id: doc.id,
      active: medicine.active === true,
      confirmedByHuman: medicine.confirmedByHuman === true,
      times: Array.isArray(medicine.times) ? medicine.times : [],
    };
  });

  return {
    raw: data,
    parent: {
      id: parentId,
      active: data.active === true,
      consentStatus: (data.consent?.status as ConsentStatus | undefined) ?? "pending",
      timezone:
        typeof data.timezone === "string" && data.timezone.length > 0
          ? data.timezone
          : "Asia/Kolkata",
      callPolicy: policyOf(data),
    },
    medicines,
  };
}

async function claimGroup(
  db: Firestore,
  parentId: string,
  eventIds: string[],
  nowMs: number,
): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const refs = eventIds.map((id) => db.doc(`parents/${parentId}/doseEvents/${id}`));
    const docs = await tx.getAll(...refs);

    for (const doc of docs) {
      if (!doc.exists) return false;
      if (toDoseEventState(doc.data() as Record<string, unknown>).status !== "pending") {
        return false;
      }
    }

    for (const doc of docs) {
      const result = applyTransition(toDoseEventState(doc.data() as Record<string, unknown>), {
        type: "call_started",
        at: nowMs,
      });
      if (!result) return false;
      tx.set(
        doc.ref,
        {
          status: result.state.status,
          attempts: result.state.attempts,
          lastCallAt: Timestamp.fromMillis(nowMs),
        },
        { merge: true },
      );
    }
    return true;
  });
}

async function revertGroup(
  db: Firestore,
  parentId: string,
  eventIds: string[],
  nowMs: number,
): Promise<void> {
  await db.runTransaction(async (tx) => {
    const refs = eventIds.map((id) => db.doc(`parents/${parentId}/doseEvents/${id}`));
    const docs = await tx.getAll(...refs);
    for (const doc of docs) {
      if (!doc.exists) continue;
      const state = toDoseEventState(doc.data() as Record<string, unknown>);
      if (state.status !== "calling" || state.lastCallAt !== nowMs) continue;
      tx.set(doc.ref, { status: "pending" }, { merge: true });
    }
  });
}

/**
 * Minute dispatcher. Claims eligible groups transactionally and hands them to the provider.
 * The default provider is log-only; nothing dials in this stage.
 */
export async function dispatchDueCallsHandler(
  options: DispatchOptions = {},
): Promise<DispatchSummary> {
  const nowMs = options.nowMs ?? Date.now();
  const provider = options.provider ?? new LoggingCallProvider();
  const limit = options.limit ?? DISPATCH_QUERY_LIMIT;
  const db = getDb();

  const dueSnap = await db
    .collectionGroup("doseEvents")
    .where("status", "==", "pending")
    .where("scheduledFor", "<=", Timestamp.fromMillis(nowMs))
    .limit(limit)
    .get();

  const summary: DispatchSummary = {
    due: dueSnap.size,
    called: 0,
    eventsCalled: 0,
    skipped: 0,
    failed: 0,
  };
  if (dueSnap.empty) return summary;

  const events: DispatchEvent[] = [];
  for (const doc of dueSnap.docs) {
    const parentId = doc.ref.parent.parent?.id;
    if (!parentId) continue;
    const data = doc.data();
    events.push({
      id: doc.id,
      parentId,
      medicineId: String(data.medicineId ?? ""),
      scheduledFor: toMillis(data.scheduledFor) ?? 0,
      attempts: Number(data.attempts ?? 0),
      lastCallAt: toMillis(data.lastCallAt),
    });
  }

  const parentIds = [...new Set(events.map((event) => event.parentId))];
  const parents = new Map<string, DispatchParent>();
  const medicines = new Map<string, DispatchMedicine[]>();
  const parentDocs = new Map<string, ParentDoc>();

  for (const parentId of parentIds) {
    const loaded = await loadParentAndMedicines(db, parentId);
    if (loaded.parent) parents.set(parentId, loaded.parent);
    if (loaded.raw) parentDocs.set(parentId, loaded.raw);
    medicines.set(parentId, loaded.medicines);
  }

  const { calls, skipped } = planCallGroups({ events, parents, medicines, now: nowMs });
  summary.skipped += skipped.length;

  for (const call of calls) {
    const claimed = await claimGroup(db, call.parentId, call.eventIds, nowMs);
    if (!claimed) {
      summary.skipped += call.eventIds.length;
      continue;
    }

    const parentDoc = parentDocs.get(call.parentId);
    if (!parentDoc) {
      await revertGroup(db, call.parentId, call.eventIds, nowMs);
      summary.failed += call.eventIds.length;
      continue;
    }

    try {
      const handle = await provider.startCall({
        parentId: call.parentId,
        parentName: parentDoc.name,
        phone: parentDoc.phone,
        language: parentDoc.language as Language,
        timezone: call.parent.timezone,
        scheduledFor: call.scheduledFor,
        doseEventIds: call.eventIds,
      });

      const batch = db.batch();
      for (const id of call.eventIds) {
        batch.update(db.doc(`parents/${call.parentId}/doseEvents/${id}`), {
          lastCallSid: handle.callSid,
        });
      }
      // The session is created only after the provider accepted the call; the webhook routes
      // callbacks by CallSid and CustomField (parentId).
      batch.set(db.doc(`parents/${call.parentId}/callSessions/${handle.callSid}`), {
        callSid: handle.callSid,
        doseEventIds: call.eventIds,
        status: "initiated",
        dtmfInput: null,
        startedAt: Timestamp.fromMillis(nowMs),
        endedAt: null,
      } satisfies CallSessionDoc);
      await batch.commit();
      summary.called += 1;
      summary.eventsCalled += call.eventIds.length;
    } catch (error) {
      await revertGroup(db, call.parentId, call.eventIds, nowMs);
      summary.failed += call.eventIds.length;
      const code = (error as { code?: unknown } | null)?.code ?? "unknown";
      console.error("dispatchDueCalls: provider failed", {
        parentId: call.parentId,
        eventIds: call.eventIds,
        code,
      });
    }
  }

  console.info("dispatchDueCalls: run complete", {
    due: summary.due,
    called: summary.called,
    eventsCalled: summary.eventsCalled,
    skipped: summary.skipped,
    failed: summary.failed,
  });
  return summary;
}
