import type { Firestore } from "firebase-admin/firestore";
import { applyStatus, normalizeValue } from "../exotel/webhook";
import { authenticate, type TwilioCallbackConfig, type TwilioHttpRequest, type TwilioHttpResponse } from "./voice";

const SID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
export const STATUS_FUNCTION = "twilioStatus";

/** Twilio's terminal call statuses. They carry the same names the existing classifier already knows. */
const TERMINAL = new Set(["completed", "busy", "no-answer", "failed", "canceled"]);

export interface TwilioStatusDeps {
  db: Firestore;
  config: TwilioCallbackConfig | null;
  nowMs?: number;
}

const json = (status: number, body: Record<string, unknown>): TwilioHttpResponse => ({
  status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/**
 * Twilio's status callback. `in-progress` means the call was answered; the terminal statuses end it.
 * `queued`, `initiated` and `ringing` change nothing. The rest is the provider-neutral logic, which is
 * idempotent per call: the same callback twice, or a late one, leaves the same state.
 */
export async function twilioStatusHandler(request: TwilioHttpRequest, deps: TwilioStatusDeps): Promise<TwilioHttpResponse> {
  const auth = authenticate(request, deps.config, STATUS_FUNCTION);
  if ("reject" in auth) return auth.reject;

  const parentId = normalizeValue(request.query.parentId);
  const callSid = typeof auth.params.CallSid === "string" ? auth.params.CallSid : null;
  const status = typeof auth.params.CallStatus === "string" ? auth.params.CallStatus : null;
  if (!parentId || !SID_PATTERN.test(parentId) || !callSid || !SID_PATTERN.test(callSid) || !status) {
    return json(400, { error: "invalid_callback" });
  }

  const answered = status === "in-progress";
  if (!answered && !TERMINAL.has(status)) return json(200, { ok: true, ignored: "non_terminal" });

  const result = await applyStatus(
    deps.db,
    { callSid, parentId, status, eventType: answered ? "answered" : null },
    deps.nowMs ?? Date.now(),
  );
  return json(result.status, result.body);
}
