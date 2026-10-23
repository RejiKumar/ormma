import { timingSafeEqual } from "node:crypto";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import type { CallSessionDoc, CallSessionStatus, ParentDoc } from "../../../shared/types";
import {
  DEFAULT_CALL_POLICY,
  toDoseEventState,
} from "../schedule/dispatch";
import { applyTransition, type DoseEventState } from "../schedule/stateMachine";

// Exotel callback handling. Pure helpers are exported for unit tests; the handler is exercised
// against the Firestore emulator. No PII or health data is ever logged or stored here.

const SID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const TERMINAL_SESSION: CallSessionStatus[] = ["completed", "failed", "no_answer"];
const TERMINAL_CALL_STATUS = new Set(["completed", "failed", "busy", "no-answer", "canceled"]);

export type DtmfAction = "taken" | "not_taken" | "revoke" | "unclear" | "empty";

export function normalizeValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

/** Constant-time shared-secret comparison; an unset expected token always fails closed. */
export function isAuthorized(provided: string | null, expected: string | null): boolean {
  if (!expected || !provided) return false;
  const providedBuffer = Buffer.from(provided, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function normalizeDigits(value: unknown): {
  digits: string | null;
  action: DtmfAction;
} {
  const raw = normalizeValue(value);
  if (raw === null) return { digits: null, action: "empty" };
  const trimmed = raw.replace(/^"+|"+$/g, "").trim();
  if (trimmed.length === 0) return { digits: null, action: "empty" };

  const first = trimmed[0];
  const action: DtmfAction =
    first === "1" ? "taken" : first === "2" ? "not_taken" : first === "9" ? "revoke" : "unclear";
  return { digits: first, action };
}

/** Maps an Exotel terminal status to a session outcome (completed / failed / no_answer). */
export function classifyTerminalStatus(
  status: string,
  answered: boolean,
  hasDtmf: boolean,
): CallSessionStatus | null {
  if (status === "completed") {
    if (hasDtmf) return "completed";
    return answered ? "failed" : "completed";
  }
  if (status === "failed") return "failed";
  if (status === "busy" || status === "no-answer" || status === "canceled") return "no_answer";
  return null;
}

export function isTerminalSession(status: CallSessionStatus): boolean {
  return TERMINAL_SESSION.includes(status);
}

export interface StatusPayload {
  callSid: string;
  parentId: string;
  status: string;
  eventType: string | null;
}

export function parseStatusPayload(body: unknown): StatusPayload | null {
  let payload = body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const callSid = normalizeValue(record.CallSid);
  const parentId = normalizeValue(record.CustomField);
  const status = normalizeValue(record.Status);
  const eventType = normalizeValue(record.EventType);
  if (!callSid || !SID_PATTERN.test(callSid)) return null;
  if (!parentId || !SID_PATTERN.test(parentId)) return null;
  if (!status) return null;
  // An answered notification can carry a non-terminal status such as "answered" or "in-progress".
  if (eventType !== "answered" && !TERMINAL_CALL_STATUS.has(status)) return null;
  return { callSid, parentId, status, eventType };
}

const toTimestamp = (ms: number | null): Timestamp | null =>
  ms === null ? null : Timestamp.fromMillis(ms);

function stateWrite(state: DoseEventState): Record<string, unknown> {
  return {
    status: state.status,
    attempts: state.attempts,
    lastCallSid: state.lastCallSid,
    missedAt: toTimestamp(state.missedAt),
    resolvedAt: toTimestamp(state.resolvedAt),
    resolvedBy: state.resolvedBy,
    resolvedByUid: state.resolvedByUid,
    alertSent: state.alertSent,
    groupConfirmed: state.groupConfirmed,
    lastCallAt: toTimestamp(state.lastCallAt),
    reminderAt: toTimestamp(state.reminderAt),
  };
}

const policyOf = (parent: ParentDoc | undefined): ParentDoc["callPolicy"] => ({
  retryCount:
    typeof parent?.callPolicy?.retryCount === "number"
      ? parent.callPolicy.retryCount
      : DEFAULT_CALL_POLICY.retryCount,
  retryGapMinutes:
    typeof parent?.callPolicy?.retryGapMinutes === "number"
      ? parent.callPolicy.retryGapMinutes
      : DEFAULT_CALL_POLICY.retryGapMinutes,
  missedAfterMinutes:
    typeof parent?.callPolicy?.missedAfterMinutes === "number"
      ? parent.callPolicy.missedAfterMinutes
      : DEFAULT_CALL_POLICY.missedAfterMinutes,
  quietHours: parent?.callPolicy?.quietHours ?? DEFAULT_CALL_POLICY.quietHours,
});

export interface WebhookRequest {
  method: string;
  query: Record<string, unknown>;
  body: unknown;
}

export interface WebhookResponse {
  status: number;
  body: Record<string, unknown>;
}

export interface WebhookDeps {
  db: Firestore;
  token: string;
  nowMs?: number;
}

const respond = (status: number, body: Record<string, unknown>): WebhookResponse => ({
  status,
  body,
});

/** Authenticated Exotel callback handler (status and gather share one endpoint). */
export async function exotelWebhookHandler(
  request: WebhookRequest,
  deps: WebhookDeps,
): Promise<WebhookResponse> {
  const token = normalizeValue(request.query.token);
  if (!isAuthorized(token, deps.token)) return respond(401, { error: "unauthorized" });

  const nowMs = deps.nowMs ?? Date.now();
  const kind = normalizeValue(request.query.kind);

  if (kind === "gather" || (kind === null && request.query.digits !== undefined)) {
    return handleGather(request, deps, nowMs);
  }
  if (kind === "status" || (kind === null && request.method === "POST")) {
    return handleStatus(request, deps, nowMs);
  }
  return respond(400, { error: "unknown_kind" });
}

async function handleGather(
  request: WebhookRequest,
  deps: WebhookDeps,
  nowMs: number,
): Promise<WebhookResponse> {
  const callSid = normalizeValue(request.query.CallSid);
  const parentId = normalizeValue(request.query.CustomField);
  if (!callSid || !SID_PATTERN.test(callSid) || !parentId || !SID_PATTERN.test(parentId)) {
    return respond(400, { error: "invalid_callback" });
  }

  const { digits, action } = normalizeDigits(request.query.digits);
  if (action === "empty") return respond(200, { ok: true, ignored: "empty_digits" });

  const sessionRef = deps.db.doc(`parents/${parentId}/callSessions/${callSid}`);
  const parentRef = deps.db.doc(`parents/${parentId}`);

  return deps.db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) return respond(200, { ok: true, ignored: "unknown_session" });
    const session = sessionSnap.data() as CallSessionDoc;

    if (isTerminalSession(session.status)) {
      return respond(200, { ok: true, ignored: "session_terminal" });
    }
    if (session.dtmfInput !== null) {
      return respond(200, { ok: true, ignored: "duplicate_dtmf" });
    }

    const parentSnap = await tx.get(parentRef);
    const parent = parentSnap.data() as ParentDoc | undefined;
    const policy = policyOf(parent);
    const grouped = session.doseEventIds.length > 1;
    const eventRefs = session.doseEventIds.map((id) =>
      deps.db.doc(`parents/${parentId}/doseEvents/${id}`),
    );
    const eventDocs = eventRefs.length > 0 ? await tx.getAll(...eventRefs) : [];

    for (const doc of eventDocs) {
      if (!doc.exists) continue;
      const state = toDoseEventState(doc.data() as Record<string, unknown>);
      if (state.status !== "calling") continue;

      const transition =
        action === "taken"
          ? ({ type: "answered_yes", at: nowMs, via: "dtmf", grouped } as const)
          : action === "not_taken"
            ? ({
                type: "answered_not_yet",
                at: nowMs,
                grouped,
                retryGapMinutes: policy.retryGapMinutes,
              } as const)
            : action === "revoke"
              ? ({ type: "no_answer", at: nowMs, retryCount: Number.MAX_SAFE_INTEGER } as const)
              : ({ type: "unclear", at: nowMs } as const);

      const result = applyTransition(state, transition);
      if (!result) continue;
      tx.set(doc.ref, stateWrite(result.state), { merge: true });
    }

    if (action === "revoke" && parentSnap.exists) {
      const revokedAt = parent?.consent?.revokedAt ?? Timestamp.fromMillis(nowMs);
      tx.update(parentRef, {
        "consent.status": "revoked",
        "consent.revokedAt": revokedAt,
        "consent.regrantedAt": null,
      });
    }

    tx.update(sessionRef, {
      dtmfInput: digits,
      status: session.status === "initiated" ? "answered" : session.status,
    });
    return respond(200, { ok: true });
  });
}

async function handleStatus(
  request: WebhookRequest,
  deps: WebhookDeps,
  nowMs: number,
): Promise<WebhookResponse> {
  const payload = parseStatusPayload(request.body);
  if (!payload) return respond(400, { error: "invalid_callback" });

  const sessionRef = deps.db.doc(
    `parents/${payload.parentId}/callSessions/${payload.callSid}`,
  );
  const parentRef = deps.db.doc(`parents/${payload.parentId}`);

  return deps.db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) return respond(200, { ok: true, ignored: "unknown_session" });
    const session = sessionSnap.data() as CallSessionDoc;

    if (isTerminalSession(session.status)) {
      return respond(200, { ok: true, ignored: "duplicate_status" });
    }

    if (payload.eventType === "answered") {
      if (session.status === "initiated") {
        tx.update(sessionRef, { status: "answered" });
      }
      return respond(200, { ok: true });
    }

    const parentSnap = await tx.get(parentRef);
    const parent = parentSnap.data() as ParentDoc | undefined;
    const outcome = classifyTerminalStatus(
      payload.status,
      session.status === "answered",
      session.dtmfInput !== null,
    );
    if (outcome === null) return respond(200, { ok: true, ignored: "unknown_status" });

    if (session.dtmfInput === null) {
      const policy = policyOf(parent);
      const eventRefs = session.doseEventIds.map((id) =>
        deps.db.doc(`parents/${payload.parentId}/doseEvents/${id}`),
      );
      const eventDocs = eventRefs.length > 0 ? await tx.getAll(...eventRefs) : [];

      for (const doc of eventDocs) {
        if (!doc.exists) continue;
        const state = toDoseEventState(doc.data() as Record<string, unknown>);
        if (state.status !== "calling") continue;
        const result = applyTransition(state, {
          type: "no_answer",
          at: nowMs,
          retryCount: policy.retryCount,
        });
        if (!result) continue;
        tx.set(doc.ref, stateWrite(result.state), { merge: true });
      }
    }

    tx.update(sessionRef, {
      status: outcome,
      endedAt: Timestamp.fromMillis(nowMs),
    });
    return respond(200, { ok: true });
  });
}
