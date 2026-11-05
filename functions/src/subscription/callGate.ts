// Free-tier gate for the dispatcher. Decides which due events get no call because of the plan, and
// flags them callSkipped "plan". Skipped events stay pending: they are not reported missed, because no
// call was placed for them (see the missed-dose-alerts spec). The decision is re-made every run, so a
// purchase during the day starts calls at the next minute.
import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import type { ParentDoc } from "../../../shared/types";
import { nextDateKey, localDateKey, zonedTimeToMs } from "../schedule/time";
import { readEntitlement } from "./entitlement";
import { allowedCallTimes, limitsFor } from "./plan";

export interface GateEvent {
  id: string;
  parentId: string;
  scheduledFor: number;
}

/** Keys ("parentId/eventId") of due events that get no call under the owner's plan. */
export const gateKey = (e: { parentId: string; id: string }): string => `${e.parentId}/${e.id}`;

export async function planSkippedEvents(
  db: Firestore,
  events: readonly GateEvent[],
  parents: ReadonlyMap<string, ParentDoc>,
  nowMs: number,
): Promise<Set<string>> {
  const skipped = new Set<string>();
  const planByOwner = new Map<string, ReturnType<typeof limitsFor>>();
  const keptParents = new Map<string, Set<string>>();
  const dayTimes = new Map<string, number[]>();

  const limitsOf = async (owner: string) => {
    const cached = planByOwner.get(owner);
    if (cached) return cached;
    const limits = limitsFor(await readEntitlement(owner), nowMs);
    planByOwner.set(owner, limits);
    return limits;
  };

  for (const event of events) {
    const parent = parents.get(event.parentId);
    if (!parent) continue;
    const owner = parent.createdBy;
    const limits = await limitsOf(owner);

    // Parents above the plan's parent limit are paused: the owner's oldest parents keep their calls.
    if (!keptParents.has(owner)) {
      const oldest = await db
        .collection("parents")
        .where("createdBy", "==", owner)
        .orderBy("createdAt", "asc")
        .limit(limits.parents)
        .get();
      keptParents.set(owner, new Set(oldest.docs.map((d) => d.id)));
    }
    if (!keptParents.get(owner)?.has(event.parentId)) {
      skipped.add(gateKey(event));
      continue;
    }

    if (limits.callTimesPerDay === Number.POSITIVE_INFINITY) continue;
    const day = localDateKey(event.scheduledFor, parent.timezone);
    const key = `${event.parentId}|${day}`;
    if (!dayTimes.has(key)) {
      const start = zonedTimeToMs(day, "00:00", parent.timezone);
      const next = nextDateKey(day);
      const end = next ? zonedTimeToMs(next, "00:00", parent.timezone) : null;
      if (start === null || end === null) {
        dayTimes.set(key, []);
      } else {
        const snap = await db
          .collection(`parents/${event.parentId}/doseEvents`)
          .where("scheduledFor", ">=", Timestamp.fromMillis(start))
          .where("scheduledFor", "<", Timestamp.fromMillis(end))
          .get();
        dayTimes.set(
          key,
          snap.docs.map((d) => (d.data().scheduledFor as Timestamp).toMillis()),
        );
      }
    }
    const allowed = allowedCallTimes(dayTimes.get(key) ?? [], parent.timezone, limits.callTimesPerDay);
    if (!allowed.has(event.scheduledFor)) skipped.add(gateKey(event));
  }
  return skipped;
}

/** Flags events callSkipped "plan"; writes only when the flag is not already set. */
export async function flagSkippedEvents(
  db: Firestore,
  events: ReadonlyArray<GateEvent & { alreadyFlagged: boolean }>,
): Promise<void> {
  const batch = db.batch();
  let writes = 0;
  for (const event of events) {
    if (event.alreadyFlagged) continue;
    batch.update(db.doc(`parents/${event.parentId}/doseEvents/${event.id}`), { callSkipped: "plan" });
    writes += 1;
  }
  if (writes > 0) await batch.commit();
}
