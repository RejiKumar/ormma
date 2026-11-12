import { Timestamp, type Firestore } from "firebase-admin/firestore";

// One-off go-live helper: removes dose events scheduled before the go-live instant, so nothing made
// while testing can ever be called or alerted. A dry run unless `apply` is true. Counts only; it
// never prints names, numbers or medicine details.

export interface ClearPreLiveResult {
  parents: number;
  found: number;
  deleted: number;
  byStatus: Record<string, number>;
}

const BATCH = 400;

export async function clearPreLiveEvents(options: {
  db: Firestore;
  beforeMs: number;
  apply: boolean;
}): Promise<ClearPreLiveResult> {
  const { db, beforeMs, apply } = options;
  const result: ClearPreLiveResult = { parents: 0, found: 0, deleted: 0, byStatus: {} };
  const cutoff = Timestamp.fromMillis(beforeMs);

  const parents = await db.collection("parents").select().get();
  for (const parent of parents.docs) {
    result.parents += 1;
    // Per parent, so the single-field index every collection already has is enough.
    const snap = await parent.ref.collection("doseEvents").where("scheduledFor", "<", cutoff).get();
    for (const doc of snap.docs) {
      result.found += 1;
      const status = String(doc.get("status") ?? "unknown");
      result.byStatus[status] = (result.byStatus[status] ?? 0) + 1;
    }
    if (!apply) continue;
    for (let i = 0; i < snap.docs.length; i += BATCH) {
      const batch = db.batch();
      for (const doc of snap.docs.slice(i, i + BATCH)) batch.delete(doc.ref);
      await batch.commit();
      result.deleted += Math.min(BATCH, snap.docs.length - i);
    }
  }
  return result;
}
