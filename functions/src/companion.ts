import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import type { CallSessionDoc, Consent, DoseEventDoc, MemberDoc } from "../../shared/types";
import { getDb } from "./db";

// family-companion-parity: the escalation view, member presence and the family call log.
// Logs carry ids and statuses only (hard rule 6): no phone numbers, no activity times.

/** A member must be seen within this window to count as "viewing" (app side); throttle below. */
export const PRESENCE_THROTTLE_MS = 5 * 60 * 1000;
/** A call session still "initiated" after this long is treated as failed. */
const STALE_INITIATED_MS = 15 * 60 * 1000;

export type AttemptOutcome = "answered" | "no_answer" | "failed" | "calling";

export interface EscalationAttempt {
  ordinal: number;
  startedAtMs: number;
  outcome: AttemptOutcome;
}

export interface EscalationResult {
  status: string;
  attempts: EscalationAttempt[];
  /** Attempts the dispatcher counted that never produced a call session (for example a dispatch failure). */
  unplaced: number;
  alertAtMs: number | null;
}

interface ParentScoped {
  parentId?: unknown;
}

function requireAuth(request: CallableRequest<unknown>): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  return uid;
}

function requireId(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0 || value.includes("/")) {
    throw new HttpsError("invalid-argument", `${field} is required.`);
  }
  return value;
}

async function memberRole(
  db: ReturnType<typeof getDb>,
  parentId: string,
  uid: string,
): Promise<MemberDoc["role"]> {
  const snap = await db.doc(`parents/${parentId}/members/${uid}`).get();
  if (!snap.exists) throw new HttpsError("permission-denied", "permission-denied");
  return (snap.data() as MemberDoc).role;
}

/**
 * The access-control consent visibility rule: owners read everything; other members read data dated
 * `ts` only when consent was never revoked, or ts is before revokedAt, or ts is at or after regrantedAt.
 * A parent without a consent map fails closed.
 */
export function visibleToMember(
  role: MemberDoc["role"],
  consent: Consent | undefined,
  tsMs: number,
): boolean {
  if (role === "owner") return true;
  if (!consent) return false;
  const revokedAt = consent.revokedAt?.toMillis() ?? null;
  const regrantedAt = consent.regrantedAt?.toMillis() ?? null;
  return revokedAt === null || tsMs < revokedAt || (regrantedAt !== null && tsMs >= regrantedAt);
}

export function attemptOutcome(session: CallSessionDoc, nowMs: number): AttemptOutcome {
  switch (session.status) {
    case "answered":
    case "completed":
      return "answered";
    case "no_answer":
      return "no_answer";
    case "failed":
      return "failed";
    default:
      return nowMs - session.startedAt.toMillis() > STALE_INITIATED_MS ? "failed" : "calling";
  }
}

export interface DoseEscalationPayload extends ParentScoped {
  doseEventId?: unknown;
}

/** Read-only: returns attempt order, start time and outcome only. No SID, DTMF or transcript fields. */
export async function getDoseEscalationHandler(
  request: CallableRequest<DoseEscalationPayload>,
  nowMs: number = Date.now(),
): Promise<EscalationResult> {
  const uid = requireAuth(request);
  const parentId = requireId(request.data?.parentId, "parentId");
  const doseEventId = requireId(request.data?.doseEventId, "doseEventId");
  const db = getDb();
  const role = await memberRole(db, parentId, uid);

  const [parentSnap, eventSnap] = await Promise.all([
    db.doc(`parents/${parentId}`).get(),
    db.doc(`parents/${parentId}/doseEvents/${doseEventId}`).get(),
  ]);
  if (!parentSnap.exists || !eventSnap.exists) throw new HttpsError("not-found", "not-found");
  const consent = (parentSnap.data() as { consent?: Consent }).consent;
  const event = eventSnap.data() as DoseEventDoc;

  const empty: EscalationResult = { status: event.status, attempts: [], unplaced: 0, alertAtMs: null };
  if (!visibleToMember(role, consent, event.scheduledFor.toMillis())) return empty;

  const [sessions, alerts] = await Promise.all([
    db
      .collection(`parents/${parentId}/callSessions`)
      .where("doseEventIds", "array-contains", doseEventId)
      .get(),
    db.collection(`parents/${parentId}/alerts`).where("relatedEventId", "==", doseEventId).get(),
  ]);

  const attempts = sessions.docs
    .map((d) => d.data() as CallSessionDoc)
    .sort((a, b) => a.startedAt.toMillis() - b.startedAt.toMillis())
    .map((s, index) => ({
      ordinal: index + 1,
      startedAtMs: s.startedAt.toMillis(),
      outcome: attemptOutcome(s, nowMs),
    }));

  const alertTimes = alerts.docs
    .map((d) => (d.data() as { createdAt?: Timestamp }).createdAt?.toMillis())
    .filter((v): v is number => typeof v === "number");

  console.info("escalation: read", { parentId, doseEventId, attempts: attempts.length });
  return {
    status: event.status,
    attempts,
    unplaced: Math.max(0, (event.attempts ?? 0) - attempts.length),
    alertAtMs: alertTimes.length > 0 ? Math.min(...alertTimes) : null,
  };
}

/** Writes members/{uid}.lastSeenAt at most once per throttle window. */
export async function touchPresenceHandler(
  request: CallableRequest<ParentScoped>,
  nowMs: number = Date.now(),
): Promise<{ updated: boolean }> {
  const uid = requireAuth(request);
  const parentId = requireId(request.data?.parentId, "parentId");
  const db = getDb();
  await memberRole(db, parentId, uid);

  const ref = db.doc(`parents/${parentId}/members/${uid}`);
  const updated = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const last = (snap.data() as MemberDoc | undefined)?.lastSeenAt?.toMillis();
    if (last !== undefined && nowMs - last < PRESENCE_THROTTLE_MS) return false;
    tx.update(ref, { lastSeenAt: Timestamp.fromMillis(nowMs) });
    return true;
  });
  console.info("presence: touch", { parentId, updated });
  return { updated };
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** Deterministic id: member uid plus the UTC minute, so a repeat within the minute is one entry. */
export function familyCallId(uid: string, ms: number): string {
  const d = new Date(ms);
  return `${uid}_${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

/** Records that a member called the parent. Any role may log it: it changes no dose, alert or policy. */
export async function logFamilyCallHandler(
  request: CallableRequest<ParentScoped>,
  nowMs: number = Date.now(),
): Promise<{ id: string }> {
  const uid = requireAuth(request);
  const parentId = requireId(request.data?.parentId, "parentId");
  const db = getDb();
  await memberRole(db, parentId, uid);

  const id = familyCallId(uid, nowMs);
  await db.doc(`parents/${parentId}/familyCalls/${id}`).set({
    byUid: uid,
    at: Timestamp.fromMillis(nowMs),
  });
  console.info("familyCall: logged", { parentId, id });
  return { id };
}
