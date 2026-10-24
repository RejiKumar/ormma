import { Timestamp, type Firestore } from "firebase-admin/firestore";
import type { CallPolicy, ParentDoc } from "../../../shared/types";
import { notifyAlert, writeAlert } from "../alerts/createAlert";
import type { PushSender } from "../alerts/fcm";
import { buildMissedDoseMessage, type MissedDoseVariant } from "../alerts/templates";
import { getDb } from "../db";
import { DEFAULT_CALL_POLICY, toDoseEventState } from "./dispatch";
import { applyTransition, type DoseEventState } from "./stateMachine";

// Minute missed-dose checker. Pure planning is separated from the transaction so the once-only and
// grouping rules can be tested without Firestore.

export const MISSED_QUERY_LIMIT = 500;
export const MISSED_STATUSES = ["pending", "no_answer", "unclear", "not_taken"] as const;

export interface MissedParentInfo {
  name: string;
  timeZone: string;
  missedAfterMinutes: number;
}

export interface MissedCandidate {
  id: string;
  parentId: string;
  data: Record<string, unknown>;
}

export interface MissedMember {
  id: string;
  state: DoseEventState;
  /** The last provider attempt failed before the provider accepted the call. */
  dataFailure: boolean;
}

export interface PlannedMissedGroup {
  parentId: string;
  scheduledFor: number;
  parent: MissedParentInfo;
  members: MissedMember[];
  variant: MissedDoseVariant;
  lastAttemptAt: number;
}

const millis = (value: unknown): number | null => {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "object" && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis(): number }).toMillis();
  }
  if (typeof value === "number") return value;
  return null;
};

export function parentInfoOf(data: Partial<ParentDoc> | undefined): MissedParentInfo {
  const policy: Partial<CallPolicy> | undefined = data?.callPolicy;
  return {
    name: typeof data?.name === "string" ? data.name : "",
    timeZone:
      typeof data?.timezone === "string" && data.timezone.length > 0
        ? data.timezone
        : "Asia/Kolkata",
    missedAfterMinutes:
      typeof policy?.missedAfterMinutes === "number"
        ? policy.missedAfterMinutes
        : DEFAULT_CALL_POLICY.missedAfterMinutes,
  };
}

export function missedVariant(members: MissedMember[]): MissedDoseVariant {
  if (members.some((member) => member.dataFailure)) return "system_failure";
  if (members.length > 1 && members.some((member) => member.state.groupConfirmed)) {
    return "group_not_all";
  }
  return "standard";
}

export function planMissedGroups(
  events: MissedCandidate[],
  parents: ReadonlyMap<string, MissedParentInfo>,
  nowMs: number,
): PlannedMissedGroup[] {
  const groups = new Map<string, PlannedMissedGroup>();

  for (const event of events) {
    const parent = parents.get(event.parentId);
    if (!parent) continue;

    const state = toDoseEventState(event.data);
    const result = applyTransition(state, {
      type: "missed_check",
      at: nowMs,
      missedAfterMinutes: parent.missedAfterMinutes,
    });
    if (!result || !result.effect.missed) continue;

    const lastAttemptAt = state.lastCallAt ?? state.scheduledFor;
    const member: MissedMember = {
      id: event.id,
      state: result.state,
      dataFailure: event.data.lastDispatchFailure === true,
    };

    const key = `${event.parentId}|${state.scheduledFor}`;
    const existing = groups.get(key);
    if (existing) {
      existing.members.push(member);
      existing.lastAttemptAt = Math.max(existing.lastAttemptAt, lastAttemptAt);
    } else {
      groups.set(key, {
        parentId: event.parentId,
        scheduledFor: state.scheduledFor,
        parent,
        members: [member],
        variant: "standard",
        lastAttemptAt,
      });
    }
  }

  const planned = [...groups.values()];
  for (const group of planned) group.variant = missedVariant(group.members);
  return planned.sort(
    (a, b) => a.scheduledFor - b.scheduledFor || a.parentId.localeCompare(b.parentId),
  );
}

export interface MissedSummary {
  scanned: number;
  groups: number;
  missed: number;
  alerted: number;
  failed: number;
}

export interface MissedOptions {
  nowMs?: number;
  sender: PushSender;
  limit?: number;
}

export async function missedDoseCheckerHandler(options: MissedOptions): Promise<MissedSummary> {
  const nowMs = options.nowMs ?? Date.now();
  const limit = options.limit ?? MISSED_QUERY_LIMIT;
  const db = getDb();
  const summary: MissedSummary = { scanned: 0, groups: 0, missed: 0, alerted: 0, failed: 0 };

  const dueSnap = await db
    .collectionGroup("doseEvents")
    .where("status", "in", [...MISSED_STATUSES])
    .limit(limit)
    .get();

  const events: MissedCandidate[] = [];
  for (const doc of dueSnap.docs) {
    const parentId = doc.ref.parent.parent?.id;
    if (!parentId) continue;
    events.push({ id: doc.id, parentId, data: doc.data() as Record<string, unknown> });
  }
  summary.scanned = events.length;
  if (events.length === 0) return summary;

  const parentIds = [...new Set(events.map((event) => event.parentId))];
  const parents = new Map<string, MissedParentInfo>();
  for (const parentId of parentIds) {
    const snap = await db.doc(`parents/${parentId}`).get();
    if (snap.exists) parents.set(parentId, parentInfoOf(snap.data() as ParentDoc));
  }

  const groups = planMissedGroups(events, parents, nowMs);
  summary.groups = groups.length;

  for (const group of groups) {
    const message = buildMissedDoseMessage({
      parentName: group.parent.name,
      scheduledFor: group.scheduledFor,
      lastAttemptAt: group.lastAttemptAt,
      timeZone: group.parent.timeZone,
      variant: group.variant,
    });

    let alertId: string | null = null;
    let alertDoc: ReturnType<typeof writeAlert>["doc"] | null = null;

    try {
      const outcome = await db.runTransaction(async (tx) => {
        const refs = group.members.map((member) =>
          db.doc(`parents/${group.parentId}/doseEvents/${member.id}`),
        );
        const docs = await tx.getAll(...refs);
        let anyMissed = false;
        let anyAlertSent = false;
        const writes: Array<{ ref: (typeof refs)[number]; state: DoseEventState }> = [];

        for (const doc of docs) {
          if (!doc.exists) continue;
          const state = toDoseEventState(doc.data() as Record<string, unknown>);
          const result = applyTransition(state, {
            type: "missed_check",
            at: nowMs,
            missedAfterMinutes: group.parent.missedAfterMinutes,
          });
          if (!result || !result.effect.missed) continue;
          anyMissed = true;
          anyAlertSent = anyAlertSent || state.alertSent;
          writes.push({ ref: doc.ref, state: result.state });
        }

        if (!anyMissed) return { alertId: null as string | null, doc: null as null };

        for (const write of writes) {
          tx.set(
            write.ref,
            {
              status: "missed",
              missedAt: Timestamp.fromMillis(write.state.missedAt ?? nowMs),
              alertSent: true,
            },
            { merge: true },
          );
        }

        if (anyAlertSent) return { alertId: null as string | null, doc: null as null };

        const written = writeAlert(tx, db, group.parentId, {
          type: "missed_dose",
          message,
          relatedEventId: group.members[0]?.id ?? null,
          createdAt: Timestamp.fromMillis(nowMs),
        });
        return { alertId: written.alertId, doc: written.doc };
      });

      alertId = outcome.alertId;
      alertDoc = outcome.doc;
      summary.missed += group.members.length;
      if (alertId && alertDoc) {
        summary.alerted += 1;
        await notifyAlert(db, group.parentId, alertId, alertDoc, options.sender);
      }
    } catch (error) {
      summary.failed += 1;
      const code = (error as { code?: unknown } | null)?.code ?? "unknown";
      console.error("missedDoseChecker: group failed", {
        parentId: group.parentId,
        eventIds: group.members.map((member) => member.id),
        code,
      });
    }
  }

  console.info("missedDoseChecker: run complete", {
    scanned: summary.scanned,
    groups: summary.groups,
    missed: summary.missed,
    alerted: summary.alerted,
    failed: summary.failed,
  });
  return summary;
}
