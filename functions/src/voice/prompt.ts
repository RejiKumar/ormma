import type { Firestore } from "firebase-admin/firestore";
import type { CallSessionDoc, Language, MemberDoc, ParentDoc } from "../../../shared/types";
import { isAuthorized, normalizeValue } from "../exotel/webhook";
import { FALLBACK_TIME_ZONE, localMinuteOfDay } from "../schedule/time";
import { buildScript, type PromptKind, type TemplateValues } from "./templates";
import { AUDIO_ID_PATTERN, type PromptAudioService } from "./tts";

// Token-checked HTTP endpoints Exotel calls during a flow. Responses contain only audio URLs or
// bytes; no name, phone number or medicine text leaves in a URL or log line.

const SID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const PROMPT_KINDS = ["greeting", "question", "closing", "consent"] as const;
type PromptEndpointKind = (typeof PROMPT_KINDS)[number];

export interface VoiceHttpRequest {
  method: string;
  query: Record<string, unknown>;
}

export interface VoiceResponse {
  status: number;
  headers: Record<string, string>;
  body: string | Buffer;
}

export interface PromptDeps {
  db: Firestore;
  audio: PromptAudioService | null;
  token: string;
  audioBaseUrl: string;
}

export interface AudioDeps {
  audio: PromptAudioService | null;
  token: string;
}

const json = (status: number, error: string): VoiceResponse => ({
  status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ error }),
});

const isPromptKind = (value: string): value is PromptEndpointKind =>
  (PROMPT_KINDS as readonly string[]).includes(value);

const languageOf = (parent: ParentDoc): Language =>
  ["ml-IN", "ta-IN", "hi-IN", "en-IN"].includes(parent.language)
    ? (parent.language as Language)
    : "en-IN";

async function memberNames(db: Firestore, parentId: string): Promise<string[]> {
  const snap = await db.collection(`parents/${parentId}/members`).get();
  return snap.docs
    .map((doc) => (doc.data() as MemberDoc).displayName)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
}

async function scheduledHour(
  db: Firestore,
  parentId: string,
  session: CallSessionDoc,
  timeZone: string,
): Promise<number> {
  const first = session.doseEventIds[0];
  if (first) {
    const snap = await db.doc(`parents/${parentId}/doseEvents/${first}`).get();
    const scheduledFor = snap.data()?.scheduledFor;
    const millis = scheduledFor?.toMillis?.();
    if (typeof millis === "number") {
      return Math.floor(localMinuteOfDay(millis, timeZone) / 60);
    }
  }
  return Math.floor(localMinuteOfDay(session.startedAt.toMillis(), timeZone) / 60);
}

function scriptFor(
  kind: PromptEndpointKind,
  grouped: boolean,
  values: TemplateValues,
): { kind: PromptKind; values: TemplateValues } {
  if (kind !== "question") return { kind, values };
  return { kind: grouped ? "question_grouped" : "question_single", values };
}

/** Serves the audio URL for one fixed prompt line (`kind` is fixed per dashboard applet). */
export async function voicePromptHandler(
  request: VoiceHttpRequest,
  deps: PromptDeps,
): Promise<VoiceResponse> {
  if (request.method !== "GET" && request.method !== "HEAD") return json(405, "method_not_allowed");
  if (!isAuthorized(normalizeValue(request.query.token), deps.token)) return json(401, "unauthorized");
  if (!deps.audio || !deps.audioBaseUrl) return json(503, "tts_unconfigured");

  const kind = normalizeValue(request.query.kind);
  const callSid = normalizeValue(request.query.CallSid);
  const parentId = normalizeValue(request.query.CustomField);
  if (!kind || !isPromptKind(kind)) return json(404, "unknown_kind");
  if (!callSid || !SID_PATTERN.test(callSid) || !parentId || !SID_PATTERN.test(parentId)) {
    return json(404, "unknown_session");
  }

  const parentSnap = await deps.db.doc(`parents/${parentId}`).get();
  if (!parentSnap.exists) return json(404, "unknown_session");
  const parent = parentSnap.data() as ParentDoc;
  const timeZone = parent.timezone || FALLBACK_TIME_ZONE;

  let session: CallSessionDoc | null = null;
  if (kind !== "consent") {
    const sessionSnap = await deps.db.doc(`parents/${parentId}/callSessions/${callSid}`).get();
    if (!sessionSnap.exists) return json(404, "unknown_session");
    session = sessionSnap.data() as CallSessionDoc;
  }

  const values: TemplateValues = { name: parent.name };
  if (session) {
    values.hour = await scheduledHour(deps.db, parentId, session, timeZone);
  }
  if (kind === "consent") values.members = await memberNames(deps.db, parentId);

  const script = scriptFor(kind, (session?.doseEventIds.length ?? 1) > 1, values);
  const text = buildScript(languageOf(parent), script.kind, script.values);

  let id: string;
  try {
    id = await deps.audio.ensure(languageOf(parent), text);
  } catch {
    return json(502, "tts_failed");
  }

  const separator = deps.audioBaseUrl.includes("?") ? "&" : "?";
  const url = `${deps.audioBaseUrl}${separator}token=${encodeURIComponent(
    deps.token,
  )}&id=${id}\n`;
  return {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Length": String(Buffer.byteLength(url)),
      "Cache-Control": "no-store",
    },
    body: request.method === "HEAD" ? "" : url,
  };
}

/** Serves one cached MP3 by opaque id. Exotel issues GET and HEAD. */
export async function voiceAudioHandler(
  request: VoiceHttpRequest,
  deps: AudioDeps,
): Promise<VoiceResponse> {
  if (request.method !== "GET" && request.method !== "HEAD") return json(405, "method_not_allowed");
  if (!isAuthorized(normalizeValue(request.query.token), deps.token)) return json(401, "unauthorized");
  if (!deps.audio) return json(503, "tts_unconfigured");

  const id = normalizeValue(request.query.id);
  if (!id || !AUDIO_ID_PATTERN.test(id)) return json(404, "unknown_audio");

  const audio = await deps.audio.load(id);
  if (!audio) return json(404, "unknown_audio");

  return {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audio.length),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
    body: request.method === "HEAD" ? Buffer.alloc(0) : audio,
  };
}
