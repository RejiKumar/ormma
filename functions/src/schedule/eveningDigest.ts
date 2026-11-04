import type { Firestore } from "firebase-admin/firestore";
import type { DoseEventDoc, MedicineDoc, ParentDoc } from "../../../shared/types";
import { resolveMemberTokens, pruneInvalidTokens, type PushSender } from "../alerts/fcm";
import { buildDigestText, type DigestEvent } from "../digestText";
import { FALLBACK_TIME_ZONE, localDateKey, localWallClock, nextDateKey, zonedTimeToMs } from "./time";

// Evening summary (evening-digest spec): one push per member who has it on, once per parent per local
// day, in the 20:00 hour of the parent's timezone. Runs every 15 minutes; `lastDigestDate` makes it
// idempotent. Logs carry ids and counts only.

export const DIGEST_HOUR = 20;

export interface DigestRunResult {
  parents: number;
  sent: number;
  skipped: number;
}

export async function eveningDigestHandler(deps: {
  db: Firestore;
  sender: PushSender;
  nowMs?: number;
}): Promise<DigestRunResult> {
  const { db, sender } = deps;
  const nowMs = deps.nowMs ?? Date.now();
  const parentsSnap = await db.collection("parents").where("active", "==", true).get();
  const result: DigestRunResult = { parents: 0, sent: 0, skipped: 0 };

  for (const parentDoc of parentsSnap.docs) {
    const parent = parentDoc.data() as ParentDoc;
    const tz = parent.timezone || FALLBACK_TIME_ZONE;
    if (parent.consent?.status !== "granted") continue;
    if (localWallClock(nowMs, tz).hour !== DIGEST_HOUR) continue;
    result.parents += 1;
    const today = localDateKey(nowMs, tz);
    if (parent.lastDigestDate === today) {
      result.skipped += 1;
      continue;
    }

    const start = zonedTimeToMs(today, "00:00", tz);
    const end = (() => {
      const next = nextDateKey(today);
      return next ? zonedTimeToMs(next, "00:00", tz) : null;
    })();
    if (start === null || end === null) continue;

    const [eventsSnap, medicinesSnap] = await Promise.all([
      db
        .collection(`parents/${parentDoc.id}/doseEvents`)
        .where("scheduledFor", ">=", new Date(start))
        .where("scheduledFor", "<", new Date(end))
        .get(),
      db.collection(`parents/${parentDoc.id}/medicines`).get(),
    ]);
    const names = new Map<string, string>();
    for (const m of medicinesSnap.docs) {
      const med = m.data() as MedicineDoc;
      names.set(m.id, [med.name, med.doseText].filter((part) => part && part.length > 0).join(" "));
    }
    const events: DigestEvent[] = eventsSnap.docs.map((d) => {
      const e = d.data() as DoseEventDoc;
      return {
        scheduledForMs: e.scheduledFor.toMillis(),
        resolvedAtMs: e.resolvedAt ? e.resolvedAt.toMillis() : null,
        status: e.status,
        medicine: names.get(e.medicineId) ?? "",
      };
    });
    const text = buildDigestText({ name: parent.name, nowMs, timeZone: tz, events });

    // Mark the day first: a retry after a partial failure must not send twice.
    await parentDoc.ref.update({ lastDigestDate: today });
    if (text === null) continue;

    const { tokens, owners } = await resolveMemberTokens(db, parentDoc.id, (notify) => notify.summary);
    if (tokens.length === 0) continue;
    const push = await sender.sendMulticast(tokens, {
      title: "Ormma update",
      body: text,
      data: { type: "evening_digest", parentId: parentDoc.id },
    });
    await pruneInvalidTokens(db, push.invalidTokens, owners);
    result.sent += 1;
    console.info("digest: sent", { parentId: parentDoc.id, tokens: tokens.length, sent: push.successCount });
  }
  return result;
}
