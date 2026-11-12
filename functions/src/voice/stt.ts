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

/** What the recording is. Exotel can deliver either; anything else is not usable. */
export type AudioFormat = "mp3" | "wav";

export interface WavInfo {
  sampleRate: number;
  channels: number;
  /** The raw 16-bit PCM samples, without the WAV header. */
  pcm: Buffer;
}

/**
 * Reads a PCM 16-bit WAV file: the sample rate and channel count come from its header, and the
 * samples are returned without it. Returns null for anything else (other encodings, a damaged file).
 */
export function parseWav(buffer: Buffer): WavInfo | null {
  if (buffer.length < 44) return null;
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") return null;
  let offset = 12;
  let fmt: { format: number; channels: number; sampleRate: number; bits: number } | null = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt " && body + 16 <= buffer.length) {
      fmt = {
        format: buffer.readUInt16LE(body),
        channels: buffer.readUInt16LE(body + 2),
        sampleRate: buffer.readUInt32LE(body + 4),
        bits: buffer.readUInt16LE(body + 14),
      };
    } else if (id === "data") {
      if (!fmt || fmt.format !== 1 || fmt.bits !== 16 || fmt.channels < 1 || fmt.sampleRate < 8000) return null;
      const end = Math.min(buffer.length, body + size);
      return { sampleRate: fmt.sampleRate, channels: fmt.channels, pcm: buffer.subarray(body, end) };
    }
    offset = body + size + (size % 2);
  }
  return null;
}

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
  | "unsupported_audio"
  | `http_${number}`;

export class SttError extends Error {
  constructor(readonly code: SttErrorCode) {
    super(`stt:${code}`);
    this.name = "SttError";
  }
}

export interface SttClient {
  transcribe(audio: Buffer, language: Language, format?: AudioFormat): Promise<SttResult>;
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

  async transcribe(audio: Buffer, language: Language, format: AudioFormat = "mp3"): Promise<SttResult> {
    if (audio.length === 0) return emptyResult();
    if (audio.length > STT_MAX_AUDIO_BYTES) throw new SttError("audio_too_large");

    // MP3 is sent as is at 8 kHz. WAV is read for its rate and channels and sent as raw 16-bit samples.
    let content = audio;
    let encoding: string = STT_ENCODING;
    let sampleRateHertz: number = STT_SAMPLE_RATE_HZ;
    let audioChannelCount = 1;
    if (format === "wav") {
      const wav = parseWav(audio);
      if (!wav) throw new SttError("unsupported_audio");
      if (wav.pcm.length === 0) return emptyResult();
      content = wav.pcm;
      encoding = "LINEAR16";
      sampleRateHertz = wav.sampleRate;
      audioChannelCount = wav.channels;
    }

    const endpoint = `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(
      this.apiKey,
    )}`;
    const body = {
      config: {
        encoding,
        sampleRateHertz,
        languageCode: language,
        model: STT_MODELS[language],
        audioChannelCount,
        maxAlternatives: 1,
        enableAutomaticPunctuation: false,
      },
      audio: { content: content.toString("base64") },
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
