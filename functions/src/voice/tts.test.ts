import {
  GoogleTtsClient,
  PromptAudioService,
  TTS_ENCODING,
  TTS_SAMPLE_RATE_HZ,
  TTS_VOICES,
  TtsError,
  audioObjectPath,
  promptAudioId,
  type AudioStore,
  type TtsClient,
} from "./tts";

class MemoryStore implements AudioStore {
  readonly objects = new Map<string, Buffer>();
  exists(path: string): Promise<boolean> {
    return Promise.resolve(this.objects.has(path));
  }
  save(path: string, data: Buffer): Promise<void> {
    this.objects.set(path, data);
    return Promise.resolve();
  }
  load(path: string): Promise<Buffer | null> {
    return Promise.resolve(this.objects.get(path) ?? null);
  }
}

const fakeClient = (): TtsClient & { synthesize: jest.Mock } => ({
  synthesize: jest.fn().mockResolvedValue(Buffer.from("mp3")),
});

describe("promptAudioId", () => {
  it("is a stable 64-hex hash that separates language and text", () => {
    const a = promptAudioId("en-IN", "hello");
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(promptAudioId("en-IN", "hello")).toBe(a);
    expect(promptAudioId("ml-IN", "hello")).not.toBe(a);
    expect(promptAudioId("en-IN", "hello!")).not.toBe(a);
    expect(audioObjectPath(a)).toBe(`tts/${a}.mp3`);
  });
});

describe("PromptAudioService", () => {
  it("synthesises once and then serves from the cache", async () => {
    const client = fakeClient();
    const store = new MemoryStore();
    const service = new PromptAudioService(client, store);

    const first = await service.ensure("en-IN", "Hello");
    const second = await service.ensure("en-IN", "Hello");

    expect(first).toBe(second);
    expect(client.synthesize).toHaveBeenCalledTimes(1);
    expect(store.objects.get(audioObjectPath(first))?.toString()).toBe("mp3");
    await expect(service.load(first)).resolves.toEqual(Buffer.from("mp3"));
  });

  it("synthesises separately per language", async () => {
    const client = fakeClient();
    const service = new PromptAudioService(client, new MemoryStore());

    const en = await service.ensure("en-IN", "Hello");
    const ml = await service.ensure("ml-IN", "Hello");
    expect(en).not.toBe(ml);
    expect(client.synthesize).toHaveBeenCalledTimes(2);
  });

  it("rejects unsafe ids and missing objects", async () => {
    const service = new PromptAudioService(fakeClient(), new MemoryStore());
    await expect(service.load("../secret")).resolves.toBeNull();
    await expect(service.load("a".repeat(64))).resolves.toBeNull();
  });

  it("propagates coded synthesis errors without prompt text", async () => {
    const client: TtsClient = {
      synthesize: jest.fn().mockRejectedValue(new TtsError("http_429")),
    };
    const service = new PromptAudioService(client, new MemoryStore());
    try {
      await service.ensure("en-IN", "Private prompt text");
      throw new Error("expected rejection");
    } catch (error) {
      expect((error as TtsError).code).toBe("http_429");
      expect((error as Error).message).not.toContain("Private prompt text");
    }
  });
});

describe("GoogleTtsClient", () => {
  const ok = (audioContent = Buffer.from("sound").toString("base64")): Response =>
    ({
      ok: true,
      status: 200,
      json: async () => ({ audioContent }),
    }) as unknown as Response;

  it("posts the documented synthesis request", async () => {
    const fetchMock = jest.fn().mockResolvedValue(ok());
    const client = new GoogleTtsClient("tts-key", fetchMock as unknown as typeof fetch);

    await expect(client.synthesize("Namaste", "hi-IN")).resolves.toEqual(Buffer.from("sound"));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://texttospeech.googleapis.com/v1/text:synthesize?key=tts-key");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      input: { text: "Namaste" },
      voice: { languageCode: "hi-IN", name: TTS_VOICES["hi-IN"] },
      audioConfig: {
        audioEncoding: TTS_ENCODING,
        sampleRateHertz: TTS_SAMPLE_RATE_HZ,
        speakingRate: 0.9,
        pitch: 0,
      },
    });
  });

  it("maps failures to codes only", async () => {
    const nonOk = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as unknown as Response);
    await expect(
      new GoogleTtsClient("k", nonOk as unknown as typeof fetch).synthesize("secret", "en-IN"),
    ).rejects.toMatchObject({ code: "http_429" });

    const badJson = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad");
      },
    } as unknown as Response);
    await expect(
      new GoogleTtsClient("k", badJson as unknown as typeof fetch).synthesize("x", "en-IN"),
    ).rejects.toMatchObject({ code: "invalid_json" });

    const noAudio = jest.fn().mockResolvedValue(ok(""));
    await expect(
      new GoogleTtsClient("k", noAudio as unknown as typeof fetch).synthesize("x", "en-IN"),
    ).rejects.toMatchObject({ code: "missing_audio" });

    const offline = jest.fn().mockRejectedValue(new TypeError("failed"));
    await expect(
      new GoogleTtsClient("k", offline as unknown as typeof fetch).synthesize("x", "en-IN"),
    ).rejects.toMatchObject({ code: "network" });

    const timeout = jest.fn().mockRejectedValue(Object.assign(new Error(), { name: "TimeoutError" }));
    await expect(
      new GoogleTtsClient("k", timeout as unknown as typeof fetch).synthesize("x", "en-IN"),
    ).rejects.toMatchObject({ code: "timeout" });
  });
});
