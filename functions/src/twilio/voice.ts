import type { Firestore } from "firebase-admin/firestore";
import { applyDigits } from "../exotel/webhook";
import { normalizeValue } from "../exotel/webhook";
import { voicePromptHandler, type PromptDeps } from "../voice/prompt";
import { voiceReplyHandler, type VoiceReplyDeps } from "../voice/reply";
import { validateTwilioSignature, type TwilioParams } from "./signature";
import { voiceUrl } from "./twilioCallProvider";
import { gather, hangup, play, record, redirect, response } from "./twiml";

// The Twilio call script. Twilio fetches TwiML from `twilioVoice` one step at a time; this file only
// reads Twilio's request and writes TwiML. Everything that changes a dose or a call session is the
// provider-neutral logic Exotel uses too (applyDigits, voiceReplyHandler). No name, number, medicine,
// recording or transcript is ever logged, and nothing about the call is stored here.

const SID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const RECORDING_SID_PATTERN = /^RE[0-9a-fA-F]{32}$/;
const TWILIO_API_HOST = "api.twilio.com";
const GATHER_TIMEOUT_SECONDS = 5;
const RECORD_MAX_SECONDS = 8;
const RECORD_SILENCE_SECONDS = 3;
/** Twilio can serve a recording a moment after it posts the callback. */
const RECORDING_RETRY_MS = 700;
const DELETE_TIMEOUT_MS = 3_000;

export const VOICE_FUNCTION = "twilioVoice";

/** What the callbacks need from the Twilio settings (the number to call from is not needed here). */
export interface TwilioCallbackConfig {
  accountSid: string;
  authToken: string;
  publicBaseUrl: string;
  apiBaseUrl?: string;
}

export function twilioCallbackConfigFromEnv(env: NodeJS.ProcessEnv = process.env): TwilioCallbackConfig | null {
  const { TWILIO_ACCOUNT_SID: accountSid, TWILIO_AUTH_TOKEN: authToken, TWILIO_PUBLIC_BASE_URL: base } = env;
  if (!accountSid || !authToken || !base || !/^https:\/\/[^/\s]+/.test(base)) return null;
  return { accountSid, authToken, publicBaseUrl: base.replace(/\/+$/, ""), apiBaseUrl: env.TWILIO_API_BASE_URL };
}

export interface TwilioHttpRequest {
  method: string;
  /** The parsed query string, for the parent id and the step. */
  query: Record<string, unknown>;
  /** Twilio's form-encoded POST parameters. */
  body: unknown;
  /** The request's path and query as received (for example "/?step=question&parentId=p1"). */
  originalUrl: string;
  /** The `X-Twilio-Signature` header. */
  signature: string | null;
}

export interface TwilioHttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

const XML_HEADERS = { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" };
const xml = (body: string): TwilioHttpResponse => ({ status: 200, headers: XML_HEADERS, body });
const plain = (status: number, code: string): TwilioHttpResponse => ({
  status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ error: code }),
});

/** A quiet hangup: a failed step ends the call calmly instead of playing Twilio's "application error". */
const endCall = (): TwilioHttpResponse => xml(response(hangup()));

/** The POST parameters as Twilio signed them: every value a string (or a list of strings). */
export function toTwilioParams(body: unknown): TwilioParams {
  const out: TwilioParams = {};
  if (!body || typeof body !== "object" || Array.isArray(body)) return out;
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
    else if (Array.isArray(value) && value.every((v) => typeof v === "string")) out[key] = value as string[];
    else if (typeof value === "number") out[key] = String(value);
  }
  return out;
}

/**
 * The public address Twilio signed: the configured base, the function name, and the query string exactly
 * as received. It is never built from request headers, because the function sits behind Google's proxy.
 */
export function signedUrl(config: TwilioCallbackConfig, functionName: string, originalUrl: string): string {
  const at = originalUrl.indexOf("?");
  return `${config.publicBaseUrl}/${functionName}${at >= 0 ? originalUrl.slice(at) : ""}`;
}

/** Checks method, configuration and signature. Returns the parameters, or the response to send. */
export function authenticate(
  request: TwilioHttpRequest,
  config: TwilioCallbackConfig | null,
  functionName: string,
): { params: TwilioParams } | { reject: TwilioHttpResponse } {
  if (request.method !== "POST") return { reject: plain(405, "method_not_allowed") };
  // Fails closed: without the auth token the signature cannot be checked, so nothing is read or written.
  if (!config) return { reject: plain(503, "not_configured") };
  const params = toTwilioParams(request.body);
  if (!validateTwilioSignature(config.authToken, request.signature, signedUrl(config, functionName, request.originalUrl), params)) {
    return { reject: plain(403, "forbidden") };
  }
  return { params };
}

export interface TwilioVoiceDeps {
  db: Firestore;
  config: TwilioCallbackConfig | null;
  /** The existing prompt endpoint's dependencies: the same templates, languages, consent rules and audio. */
  prompt: PromptDeps;
  /** The existing spoken-reply dependencies. The token is replaced by an internal one. */
  reply: Omit<VoiceReplyDeps, "fetchImpl" | "token">;
  fetchImpl?: typeof fetch;
  nowMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const param = (params: TwilioParams, name: string): string | null => {
  const value = params[name];
  return typeof value === "string" ? value : Array.isArray(value) && value[0] ? value[0] : null;
};

/** The audio URL of one spoken prompt, from the existing prompt endpoint, or null if it cannot be made. */
async function promptAudioUrl(deps: TwilioVoiceDeps, kind: string, callSid: string, parentId: string): Promise<string | null> {
  try {
    const result = await voicePromptHandler(
      { method: "GET", query: { kind, token: deps.prompt.token, CallSid: callSid, CustomField: parentId } },
      deps.prompt,
    );
    if (result.status !== 200) return null;
    const url = String(result.body).trim();
    return /^https?:\/\//.test(url) ? url : null;
  } catch (error) {
    // A prompt that cannot be built (for example a consent script with no member to name) ends the call
    // calmly. Only a code is logged, never a name or text.
    console.warn("twilioVoice: prompt failed", { kind, code: (error as { code?: unknown } | null)?.code ?? "unknown" });
    return null;
  }
}

/** The Twilio-authenticated download of a recording: credentials go to Twilio's host only. */
export function twilioDownloadFetch(
  config: TwilioCallbackConfig,
  base: typeof fetch = fetch,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): typeof fetch {
  const authorization = `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const isTwilio = new URL(url).hostname.toLowerCase() === TWILIO_API_HOST;
    const withAuth: RequestInit = isTwilio
      ? { ...init, headers: { ...((init?.headers as Record<string, string> | undefined) ?? {}), Authorization: authorization } }
      : { ...init };
    const first = await base(input, withAuth);
    if (isTwilio && first.status === 404) {
      await sleep(RECORDING_RETRY_MS);
      return base(input, withAuth);
    }
    return first;
  }) as typeof fetch;
}

/** Deletes a recording at Twilio so no audio stays at the provider. Only a status code is ever logged. */
export async function deleteTwilioRecording(
  config: TwilioCallbackConfig,
  recordingSid: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!RECORDING_SID_PATTERN.test(recordingSid)) return;
  const base = (config.apiBaseUrl ?? `https://${TWILIO_API_HOST}`).replace(/\/+$/, "");
  const url = `${base}/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Recordings/${recordingSid}.json`;
  try {
    const result = await fetchImpl(url, {
      method: "DELETE",
      headers: { Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}` },
      signal: AbortSignal.timeout(DELETE_TIMEOUT_MS),
    });
    if (!result.ok && result.status !== 404) console.warn("twilioVoice: recording delete failed", { status: result.status });
  } catch {
    console.warn("twilioVoice: recording delete failed", { status: "network" });
  }
}

const mp3Of = (recordingUrl: string): string => (/\.(mp3|wav)$/i.test(recordingUrl) ? recordingUrl : `${recordingUrl}.mp3`);

/** Plays the closing and hangs up. */
async function closing(deps: TwilioVoiceDeps, callSid: string, parentId: string): Promise<TwilioHttpResponse> {
  const url = await promptAudioUrl(deps, "closing", callSid, parentId);
  return url ? xml(response(play(url), hangup())) : endCall();
}

/** One TwiML step of the call. */
export async function twilioVoiceHandler(request: TwilioHttpRequest, deps: TwilioVoiceDeps): Promise<TwilioHttpResponse> {
  const auth = authenticate(request, deps.config, VOICE_FUNCTION);
  if ("reject" in auth) return auth.reject;
  const config = deps.config as TwilioCallbackConfig;
  const { params } = auth;

  const step = normalizeValue(request.query.step);
  const parentId = normalizeValue(request.query.parentId);
  const callSid = param(params, "CallSid");
  if (!step || !parentId || !SID_PATTERN.test(parentId) || !callSid || !SID_PATTERN.test(callSid)) {
    return plain(400, "invalid_callback");
  }
  const nowMs = deps.nowMs ?? Date.now();
  const next = (to: string) => voiceUrl(config.publicBaseUrl, to, parentId);

  switch (step) {
    case "greeting": {
      const url = await promptAudioUrl(deps, "greeting", callSid, parentId);
      return url ? xml(response(play(url), redirect(next("question")))) : endCall();
    }

    case "question": {
      const url = await promptAudioUrl(deps, "question", callSid, parentId);
      if (!url) return endCall();
      // A key press interrupts the question; with no key, a short recording of the spoken answer.
      return xml(
        response(
          gather({ action: next("gather"), timeout: GATHER_TIMEOUT_SECONDS }, play(url)),
          record({ action: next("record"), maxLength: RECORD_MAX_SECONDS, timeout: RECORD_SILENCE_SECONDS }),
        ),
      );
    }

    case "keypad": {
      // The question once more with a keypad only, after a spoken reply that could not be used.
      const url = await promptAudioUrl(deps, "question", callSid, parentId);
      if (!url) return endCall();
      return xml(response(gather({ action: next("gather"), timeout: GATHER_TIMEOUT_SECONDS }, play(url)), redirect(next("closing"))));
    }

    case "gather": {
      await applyDigits(deps.db, { callSid, parentId, rawDigits: param(params, "Digits") }, nowMs);
      return closing(deps, callSid, parentId);
    }

    case "record": {
      const recordingUrl = param(params, "RecordingUrl");
      const recordingSid = param(params, "RecordingSid");
      let usable = false;
      if (recordingUrl) {
        const fetchImpl = twilioDownloadFetch(config, deps.fetchImpl ?? fetch, deps.sleep);
        const outcome = await voiceReplyHandler(
          {
            method: "POST",
            query: {},
            body: { CallSid: callSid, CustomField: parentId, RecordingUrl: mp3Of(recordingUrl), token: config.authToken },
          },
          { ...deps.reply, token: config.authToken, fetchImpl, nowMs },
        );
        usable = outcome.status === 200;
      }
      // The audio is never kept: delete it at Twilio whether or not the reply could be used.
      if (recordingSid) await deleteTwilioRecording(config, recordingSid, deps.fetchImpl ?? fetch);
      if (usable) return closing(deps, callSid, parentId);
      // Nothing is guessed. Ask once more with the keypad, then close.
      const url = await promptAudioUrl(deps, "question", callSid, parentId);
      if (!url) return endCall();
      return xml(response(gather({ action: next("gather"), timeout: GATHER_TIMEOUT_SECONDS }, play(url)), redirect(next("closing"))));
    }

    case "closing":
      return closing(deps, callSid, parentId);

    case "consent": {
      // Only the consent script and a keypad answer. Nothing is recorded and no health data is touched.
      const url = await promptAudioUrl(deps, "consent", callSid, parentId);
      if (!url) return endCall();
      return xml(response(gather({ action: next("gather"), timeout: GATHER_TIMEOUT_SECONDS }, play(url)), hangup()));
    }

    default:
      return plain(404, "unknown_step");
  }
}
