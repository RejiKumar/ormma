import type { Language } from "../../../shared/types";

// Google Cloud Speech-to-Text for short phone answers. Call audio is passed in as a Buffer and is
// never written anywhere; only the transcript and confidence leave this module.

export const STT_ENCODING = "MP3";
export const STT_SAMPLE_RATE_HZ = 8000;
export const STT_MIN_CONFIDENCE = 0.6;
export const STT_MAX_AUDIO_BYTES = 6 * 1024 * 1024;

// Verified against the Google Cloud STT v1 supported-languages table on 2026-10-23. The telephony
// models are not offered for Malayalam or Tamil, so those use the short-utterance model.
export const STT_MODELS: Record<Language, string> = {
  "ml-IN": "latest_short",
  "ta-IN": "latest_short",
  "hi-IN": "telephony_short",
  "en-IN": "telephony_short",
};

export type SttStatus = "ok" | "low_confidence" | "empty";

export type SttResult =
  | { status: "ok"; transcript: string; confidence: number }
  | { status: "low_confidence"; transcript: string; confidence: number | null }
  | { status: "empty"; transcript: null; confidence: null };

export type SttErrorCode =
  | "network"
  | "timeout"
  | "invalid_json"
  | "invalid_response"
  | "audio_too_large"
  | `http_${number}`;

export class SttError extends Error {
  constructor(readonly code: SttErrorCode) {
    super(`stt:${code}`);
    this.name = "SttError";
  }
}

export interface SttClient {
  transcribe(audio: Buffer, language: Language): Promise<SttResult>;
}

function emptyResult(): SttResult {
  return { status: "empty", transcript: null, confidence: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Reduces a Google recognize response to one result. Missing `results` means no speech (Google
 * returns `{}`), so it is empty rather than an error. Confidence is the minimum across results, and
 * a missing confidence is treated as low confidence: never guess.
 */
export function interpretRecognition(payload: unknown): SttResult {
  if (!isRecord(payload)) throw new SttError("invalid_response");

  const results = payload.results;
  if (results === undefined || results === null) return emptyResult();
  if (!Array.isArray(results)) throw new SttError("invalid_response");

  const transcripts: string[] = [];
  let lowestConfidence: number | null = null;
  let confidenceMissing = false;

  for (const result of results) {
    if (!isRecord(result)) throw new SttError("invalid_response");
    const alternatives = result.alternatives;
    if (!Array.isArray(alternatives) || alternatives.length === 0) continue;
    const alternative = alternatives[0];
    if (!isRecord(alternative)) throw new SttError("invalid_response");

    const transcript =
      typeof alternative.transcript === "string" ? alternative.transcript.trim() : "";
    if (transcript.length === 0) continue;
    transcripts.push(transcript);

    const confidence = alternative.confidence;
    if (typeof confidence === "number" && Number.isFinite(confidence)) {
      const clamped = Math.min(1, Math.max(0, confidence));
      lowestConfidence = lowestConfidence === null ? clamped : Math.min(lowestConfidence, clamped);
    } else {
      confidenceMissing = true;
    }
  }

  if (transcripts.length === 0) return emptyResult();

  const confidence = confidenceMissing ? null : lowestConfidence;
  const transcript = transcripts.join(" ");
  if (confidence !== null && confidence >= STT_MIN_CONFIDENCE) {
    return { status: "ok", transcript, confidence };
  }
  return { status: "low_confidence", transcript, confidence };
}

export class GoogleSttClient implements SttClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async transcribe(audio: Buffer, language: Language): Promise<SttResult> {
    if (audio.length === 0) return emptyResult();
    if (audio.length > STT_MAX_AUDIO_BYTES) throw new SttError("audio_too_large");

    const endpoint = `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(
      this.apiKey,
    )}`;
    const body = {
      config: {
        encoding: STT_ENCODING,
        sampleRateHertz: STT_SAMPLE_RATE_HZ,
        languageCode: language,
        model: STT_MODELS[language],
        audioChannelCount: 1,
        maxAlternatives: 1,
        enableAutomaticPunctuation: false,
      },
      audio: { content: audio.toString("base64") },
    };

    let response: Response;
    try {
      response = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      const code =
        (error as { name?: string } | null)?.name === "TimeoutError" ? "timeout" : "network";
      throw new SttError(code);
    }

    if (!response.ok) throw new SttError(`http_${response.status}`);

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new SttError("invalid_json");
    }
    return interpretRecognition(payload);
  }
}
