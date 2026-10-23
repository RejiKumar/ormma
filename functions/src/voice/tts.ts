import { createHash } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import type { Language } from "../../../shared/types";

// Google Cloud TTS plus a private Storage cache. The cache key is the content hash, so a repeated
// prompt never costs another synthesis. Generated prompt audio contains only template text.

export const TTS_ENCODING = "MP3";
export const TTS_SAMPLE_RATE_HZ = 8000;
export const TTS_SPEAKING_RATE = 0.9;
const CACHE_VERSION = "v1";

export const TTS_VOICES: Record<Language, string> = {
  "ml-IN": "ml-IN-Standard-A",
  "ta-IN": "ta-IN-Standard-A",
  "hi-IN": "hi-IN-Standard-A",
  "en-IN": "en-IN-Standard-A",
};

export type TtsErrorCode =
  | "network"
  | "timeout"
  | "invalid_json"
  | "missing_audio"
  | `http_${number}`;

export class TtsError extends Error {
  constructor(readonly code: TtsErrorCode) {
    super(`tts:${code}`);
    this.name = "TtsError";
  }
}

export interface TtsClient {
  synthesize(text: string, language: Language): Promise<Buffer>;
}

export class GoogleTtsClient implements TtsClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async synthesize(text: string, language: Language): Promise<Buffer> {
    const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(
      this.apiKey,
    )}`;
    const body = {
      input: { text },
      voice: { languageCode: language, name: TTS_VOICES[language] },
      audioConfig: {
        audioEncoding: TTS_ENCODING,
        sampleRateHertz: TTS_SAMPLE_RATE_HZ,
        speakingRate: TTS_SPEAKING_RATE,
        pitch: 0,
      },
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
      const code = (error as { name?: string } | null)?.name === "TimeoutError" ? "timeout" : "network";
      throw new TtsError(code);
    }

    if (!response.ok) throw new TtsError(`http_${response.status}`);

    let payload: { audioContent?: unknown };
    try {
      payload = (await response.json()) as { audioContent?: unknown };
    } catch {
      throw new TtsError("invalid_json");
    }
    if (typeof payload.audioContent !== "string" || payload.audioContent.length === 0) {
      throw new TtsError("missing_audio");
    }
    return Buffer.from(payload.audioContent, "base64");
  }
}

export interface AudioStore {
  exists(path: string): Promise<boolean>;
  save(path: string, data: Buffer): Promise<void>;
  load(path: string): Promise<Buffer | null>;
}

export class StorageAudioStore implements AudioStore {
  private readonly bucket = getStorage().bucket();

  async exists(path: string): Promise<boolean> {
    const [exists] = await this.bucket.file(path).exists();
    return exists;
  }

  async save(path: string, data: Buffer): Promise<void> {
    await this.bucket.file(path).save(data, {
      resumable: false,
      metadata: {
        contentType: "audio/mpeg",
        cacheControl: "private, max-age=31536000, immutable",
      },
    });
  }

  async load(path: string): Promise<Buffer | null> {
    try {
      const [data] = await this.bucket.file(path).download();
      return data;
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      if (code === 404 || code === "404" || code === "ENOENT") return null;
      throw error;
    }
  }
}

/** Object id for a prompt: stable across calls and languages because the language is hashed in. */
export function promptAudioId(language: Language, text: string): string {
  return createHash("sha256")
    .update(
      [CACHE_VERSION, language, TTS_VOICES[language], TTS_ENCODING, TTS_SAMPLE_RATE_HZ, text].join(
        "\n",
      ),
      "utf8",
    )
    .digest("hex");
}

export const AUDIO_ID_PATTERN = /^[a-f0-9]{64}$/;
export const audioObjectPath = (id: string): string => `tts/${id}.mp3`;

export class PromptAudioService {
  constructor(
    private readonly client: TtsClient,
    private readonly store: AudioStore,
  ) {}

  /** Returns the cached object id, synthesising only when the object is absent. */
  async ensure(language: Language, text: string): Promise<string> {
    const id = promptAudioId(language, text);
    const path = audioObjectPath(id);
    if (await this.store.exists(path)) return id;

    const audio = await this.client.synthesize(text, language);
    await this.store.save(path, audio);
    return id;
  }

  load(id: string): Promise<Buffer | null> {
    if (!AUDIO_ID_PATTERN.test(id)) return Promise.resolve(null);
    return this.store.load(audioObjectPath(id));
  }
}
