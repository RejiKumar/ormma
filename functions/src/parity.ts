import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import type { CallSessionDoc, Consent, DoseEventDoc, FamilyCallDoc } from "../../shared/types";
import { attemptOutcome, memberRole, requireAuth, requireId, visibleToMember } from "./companion";
import { getDb } from "./db";

// prototype-full-parity: read receipts, member profile, notification preferences and call history.
// Logs carry ids, counts and statuses only (hard rule 6): no names, cities or activity times.

export const MAX_SEEN_EVENTS = 30;
export const MAX_RELATIONSHIP = 30;
export const MAX_CITY = 40;
export const HISTORY_LIMIT = 10;

interface ParentScoped {
  parentId?: unknown;
}

// ---------------------------------------------------------------- read receipts

export interface MarkSeenPayload extends ParentScoped {
  eventIds?: unknown;
}

/** Records `seenBy.<uid>` for events the member may read and has not seen yet. Never overwrites. */
export async function markDosesSeenHandler(
  request: CallableRequest<MarkSeenPayload>,
  nowMs: number = Date.now(),
): Promise<{ marked: number }> {
  const uid = requireAuth(request);
  const parentId = requireId(request.data?.parentId, "parentId");
  const ids = request.data?.eventIds;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_SEEN_EVENTS) {
    throw new HttpsError("invalid-argument", "eventIds must hold 1 to 30 ids.");
  }
  const eventIds = ids.map((id) => requireId(id, "eventId"));
  const db = getDb();
  const role = await memberRole(db, parentId, uid);
  const parentSnap = await db.doc(`parents/${parentId}`).get();
  const consent = (parentSnap.data() as { consent?: Consent } | undefined)?.consent;

  const refs = [...new Set(eventIds)].map((id) => db.doc(`parents/${parentId}/doseEvents/${id}`));
  const snaps = await db.getAll(...refs);
  const batch = db.batch();
  let marked = 0;
  snaps.forEach((snap, index) => {
    if (!snap.exists) return;
    const event = snap.data() as DoseEventDoc;
    if (!visibleToMember(role, consent, event.scheduledFor.toMillis())) return;
    if (event.seenBy?.[uid]) return;
    batch.update(refs[index], new FieldPath("seenBy", uid), Timestamp.fromMillis(nowMs));
    marked += 1;
  });
  if (marked > 0) await batch.commit();
  console.info("receipts: marked", { parentId, marked });
  return { marked };
}

// ---------------------------------------------------------------- profile and preferences

export interface ProfilePayload extends ParentScoped {
  relationship?: unknown;
  city?: unknown;
}

function optionalText(value: unknown, field: string, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new HttpsError("invalid-argument", `${field} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new HttpsError("invalid-argument", `${field} is too long.`);
  return trimmed.length === 0 ? null : trimmed;
}

/** Updates the caller's own relationship and city. Another member's document is never touched. */
export async function setMemberProfileHandler(
  request: CallableRequest<ProfilePayload>,
): Promise<{ ok: true }> {
  const uid = requireAuth(request);
  const parentId = requireId(request.data?.parentId, "parentId");
  const relationship = optionalText(request.data?.relationship, "relationship", MAX_RELATIONSHIP);
  const city = optionalText(request.data?.city, "city", MAX_CITY);
  const db = getDb();
  await memberRole(db, parentId, uid);

  const update: Record<string, unknown> = {};
  if (relationship !== undefined) update.relationship = relationship === null ? FieldValue.delete() : relationship;
  if (city !== undefined) update.city = city === null ? FieldValue.delete() : city;
  if (Object.keys(update).length > 0) {
    await db.doc(`parents/${parentId}/members/${uid}`).update(update);
  }
  console.info("profile: updated", { parentId });
  return { ok: true };
}

export interface NotifyPayload extends ParentScoped {
  missed?: unknown;
  summary?: unknown;
  quiet?: unknown;
}

/** Saves the caller's own three notification preferences. */
export async function setNotifyPrefsHandler(request: CallableRequest<NotifyPayload>): Promise<{ ok: true }> {
  const uid = requireAuth(request);
  const parentId = requireId(request.data?.parentId, "parentId");
  const { missed, summary, quiet } = request.data ?? {};
  if (typeof missed !== "boolean" || typeof summary !== "boolean" || typeof quiet !== "boolean") {
    throw new HttpsError("invalid-argument", "missed, summary and quiet must be true or false.");
  }
  const db = getDb();
  await memberRole(db, parentId, uid);
  await db.doc(`parents/${parentId}/members/${uid}`).update({ notify: { missed, summary, quiet } });
  console.info("notify: saved", { parentId });
  return { ok: true };
}

// ---------------------------------------------------------------- call history

export interface HistoryEntry {
  kind: "ormma" | "family";
  atMs: number;
  /** Ormma calls only. */
  outcome?: "answered" | "no_answer" | "failed" | "calling";
  durationSec?: number;
  /** Family calls only. */
  byUid?: string;
}

/** The last calls for a parent, newest first: time, outcome, duration and member uid only. */
export async function getCallHistoryHandler(
  request: CallableRequest<ParentScoped>,
  nowMs: number = Date.now(),
): Promise<{ entries: HistoryEntry[] }> {
  const uid = requireAuth(request);
  const parentId = requireId(request.data?.parentId, "parentId");
  const db = getDb();
  const role = await memberRole(db, parentId, uid);
  const parentSnap = await db.doc(`parents/${parentId}`).get();
  const consent = (parentSnap.data() as { consent?: Consent } | undefined)?.consent;

  const [sessions, family] = await Promise.all([
    db.collection(`parents/${parentId}/callSessions`).orderBy("startedAt", "desc").limit(HISTORY_LIMIT).get(),
    db.collection(`parents/${parentId}/familyCalls`).orderBy("at", "desc").limit(HISTORY_LIMIT).get(),
  ]);

  const entries: HistoryEntry[] = [];
  for (const doc of sessions.docs) {
    const s = doc.data() as CallSessionDoc;
    const atMs = s.startedAt.toMillis();
    if (!visibleToMember(role, consent, atMs)) continue;
    const outcome = attemptOutcome(s, nowMs);
    const entry: HistoryEntry = { kind: "ormma", atMs, outcome };
    if (outcome === "answered" && s.endedAt) {
      entry.durationSec = Math.max(0, Math.round((s.endedAt.toMillis() - atMs) / 1000));
    }
    entries.push(entry);
  }
  for (const doc of family.docs) {
    const f = doc.data() as FamilyCallDoc;
    const atMs = f.at.toMillis();
    if (!visibleToMember(role, consent, atMs)) continue;
    entries.push({ kind: "family", atMs, byUid: f.byUid });
  }
  entries.sort((a, b) => b.atMs - a.atMs);
  console.info("history: read", { parentId, entries: entries.length });
  return { entries: entries.slice(0, HISTORY_LIMIT) };
}
