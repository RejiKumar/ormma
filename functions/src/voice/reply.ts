import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import type { CallSessionDoc, Language, ParentDoc } from "../../../shared/types";
import type { PushSender } from "../alerts/fcm";
import { isAuthorized, isTerminalSession, normalizeValue } from "../exotel/webhook";
import type { ReplyModelClient } from "../reply/anthropicClient";
import { processReply } from "../reply/processReply";
import { STT_MAX_AUDIO_BYTES, SttError, type AudioFormat, type SttClient } from "./stt";

// The spoken reply endpoint (go-live-calls). Exotel records the parent's answer and calls this with
// the recording. The audio lives only in memory; nothing here logs or stores audio or a transcript,
// only status codes. 200 means the reply was applied (or already was); 422 means it was not usable,
// so the Exotel flow plays the keypad prompt.

export const VOICE_REPLY_BUDGET_MS = 8_000;
/** A claim older than this is treated as abandoned, so a retry may process the reply again. */
const CLAIM_STALE_MS = 30_000;
const SID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export interface VoiceReplyRequest {
  method: string;
  query: Record<string, unknown>;
  body?: unknown;
}

export interface VoiceReplyResponse {
  status: 200 | 400 | 401 | 405 | 422;
  body: Record<string, unknown>;
}

export interface VoiceReplyDeps {
  db: Firestore;
  token: string;
  /** Null when Speech-to-Text is not configured: every reply is then not usable (keypad). */
  stt: SttClient | null;
  /** Null when Claude is not configured: every reply is then not usable (keypad). */
  model: ReplyModelClient | null;
  sender: PushSender;
  fetchImpl?: typeof fetch;
  nowMs?: number;
  budgetMs?: number;
}

const respond = (status: VoiceReplyResponse["status"], body: Record<string, unknown>): VoiceReplyResponse => ({
  status,
  body,
});
const notUsable = (reason: string): VoiceReplyResponse => respond(422, { usable: false, reason });

class Budget extends Error {
  constructor() {
    super("budget_exceeded");
  }
}

function withBudget<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Budget()), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** https only, no credentials, and never a literal address or an internal host name. */
export function isSafeRecordingUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".internal") || host.endsWith(".local")) return false;
  if (host.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  return host.includes(".");
}

/** The recording format, from the response type first and the file name second. Null if unknown. */
export function detectAudioFormat(contentType: string | null, url: string): AudioFormat | null {
  const type = (contentType ?? "").toLowerCase();
  const path = new URL(url).pathname.toLowerCase();
  if (type.includes("wav") || type.includes("wave")) return "wav";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (path.endsWith(".wav")) return "wav";
  if (path.endsWith(".mp3")) return "mp3";
  return null;
}

const toMillis = (value: unknown): number | null =>
  value && typeof (value as { toMillis?: unknown }).toMillis === "function"
    ? (value as { toMillis: () => number }).toMillis()
    : null;

type Claim =
  | { kind: "done"; response: VoiceReplyResponse }
  | { kind: "proceed"; session: CallSessionDoc };

/** Takes the reply for this call exactly once: a repeat or a concurrent delivery gets a quiet 200. */
async function claimReply(
  db: Firestore,
  parentId: string,
  callSid: string,
  nowMs: number,
): Promise<Claim> {
  const ref = db.doc(`parents/${parentId}/callSessions/${callSid}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { kind: "done", response: notUsable("unknown_session") } as const;
    const session = snap.data() as CallSessionDoc & { voiceReplyState?: string; voiceReplyAt?: unknown };
    if (session.voiceReplyState === "applied") {
      return { kind: "done", response: respond(200, { ok: true, ignored: "duplicate_reply" }) } as const;
    }
    const claimedAt = toMillis(session.voiceReplyAt);
    if (session.voiceReplyState === "processing" && claimedAt !== null && nowMs - claimedAt < CLAIM_STALE_MS) {
      return { kind: "done", response: respond(200, { ok: true, ignored: "in_progress" }) } as const;
    }
    if (isTerminalSession(session.status)) {
      return { kind: "done", response: respond(200, { ok: true, ignored: "session_terminal" }) } as const;
    }
    if (session.dtmfInput !== null) {
      return { kind: "done", response: respond(200, { ok: true, ignored: "keypad_answered" }) } as const;
    }
    tx.update(ref, { voiceReplyState: "processing", voiceReplyAt: Timestamp.fromMillis(nowMs) });
    return { kind: "proceed", session } as const;
  });
}

async function download(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number,
): Promise<{ audio: Buffer; format: AudioFormat } | null> {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(Math.max(1, timeoutMs)) });
  if (!response.ok) throw new SttError(`http_${response.status}`);
  const declared = Number(response.headers?.get?.("content-length") ?? 0);
  if (declared > STT_MAX_AUDIO_BYTES) throw new SttError("audio_too_large");
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length > STT_MAX_AUDIO_BYTES) throw new SttError("audio_too_large");
  const format = detectAudioFormat(response.headers?.get?.("content-type") ?? null, url);
  return format === null ? null : { audio, format };
}

/**
 * Exotel callback with the parent's recorded answer. Token-checked like the webhook; fails closed
 * when the token is not configured.
 */
export async function voiceReplyHandler(
  request: VoiceReplyRequest,
  deps: VoiceReplyDeps,
): Promise<VoiceReplyResponse> {
  if (request.method !== "GET" && request.method !== "POST") return respond(405, { error: "method_not_allowed" });

  const bodyParams =
    request.body && typeof request.body === "object" && !Array.isArray(request.body)
      ? (request.body as Record<string, unknown>)
      : {};
  const param = (name: string) => normalizeValue(request.query[name]) ?? normalizeValue(bodyParams[name]);

  if (!isAuthorized(param("token"), deps.token)) return respond(401, { error: "unauthorized" });

  const callSid = param("CallSid");
  const parentId = param("CustomField");
  const recordingUrl = param("RecordingUrl");
  if (!callSid || !SID_PATTERN.test(callSid) || !parentId || !SID_PATTERN.test(parentId)) {
    return respond(400, { error: "invalid_callback" });
  }
  if (!recordingUrl || !isSafeRecordingUrl(recordingUrl)) return respond(400, { error: "invalid_recording_url" });

  if (!deps.stt || !deps.model) {
    console.warn("voiceReply: not configured", { status: "not_configured" });
    return notUsable("not_configured");
  }
  const { stt, model } = deps;

  const nowMs = deps.nowMs ?? Date.now();
  const budgetMs = deps.budgetMs ?? VOICE_REPLY_BUDGET_MS;
  const sessionRef = deps.db.doc(`parents/${parentId}/callSessions/${callSid}`);

  const claim = await claimReply(deps.db, parentId, callSid, nowMs);
  if (claim.kind === "done") return claim.response;
  const session = claim.session;

  const release = (patch: Record<string, unknown>) =>
    sessionRef.update(patch).catch(() => undefined);

  try {
    const outcome = await withBudget(
      (async (): Promise<VoiceReplyResponse> => {
        const parentSnap = await deps.db.doc(`parents/${parentId}`).get();
        const parent = parentSnap.data() as ParentDoc | undefined;
        if (!parent) return notUsable("unknown_parent");

        const recording = await download(deps.fetchImpl ?? fetch, recordingUrl, budgetMs);
        if (recording === null) return notUsable("unsupported_audio");

        const transcribed = await stt.transcribe(recording.audio, parent.language as Language, recording.format);
        if (transcribed.status !== "ok") return notUsable(transcribed.status);

        const result = await processReply({
          db: deps.db,
          parentId,
          parentName: parent.name,
          language: parent.language as Language,
          question: "dose_confirmation",
          eventIds: session.doseEventIds,
          transcript: transcribed.transcript,
          sender: deps.sender,
          client: model,
          nowMs,
        });

        if (result.doseChanged || result.structured.urgent) {
          await sessionRef.update({
            voiceReplyState: "applied",
            voiceReplyAt: Timestamp.fromMillis(Date.now()),
            ...(session.status === "initiated" ? { status: "answered" } : {}),
          });
          return respond(200, { ok: true });
        }
        // Not usable: keep only the reason codes for review, never the transcript.
        await sessionRef.update({
          voiceReplyState: "review",
          voiceReplyAt: Timestamp.fromMillis(Date.now()),
          voiceReplyReasons: result.structured.reviewReasons,
        });
        return notUsable("review");
      })(),
      budgetMs,
    );
    if (outcome.status === 422 && outcome.body.reason !== "review") {
      // Nothing was applied and nothing needs review: let a later delivery try again.
      await release({ voiceReplyState: FieldValue.delete(), voiceReplyAt: FieldValue.delete() });
    }
    return outcome;
  } catch (error) {
    const code =
      error instanceof Budget
        ? "budget_exceeded"
        : ((error as { code?: unknown } | null)?.code ?? "unknown");
    console.error("voiceReply: failed", { status: "failed", code });
    await release({ voiceReplyState: FieldValue.delete(), voiceReplyAt: FieldValue.delete() });
    return notUsable(typeof code === "string" ? code : "unknown");
  }
}
