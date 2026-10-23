import {
  GoogleSttClient,
  STT_ENCODING,
  STT_MAX_AUDIO_BYTES,
  STT_MIN_CONFIDENCE,
  STT_MODELS,
  STT_SAMPLE_RATE_HZ,
  interpretRecognition,
} from "./stt";

const ok = (payload: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => payload,
  }) as unknown as Response;

const answer = (transcript: string, confidence?: number) => ({
  results: [{ alternatives: [{ transcript, ...(confidence === undefined ? {} : { confidence }) }] }],
});

describe("interpretRecognition", () => {
  it("returns a usable answer with a trimmed transcript and confidence", () => {
    expect(interpretRecognition(answer("  haan, le liya  ", 0.91))).toEqual({
      status: "ok",
      transcript: "haan, le liya",
      confidence: 0.91,
    });
  });

  it("treats the 0.6 threshold as usable", () => {
    expect(interpretRecognition(answer("took it", STT_MIN_CONFIDENCE))).toMatchObject({
      status: "ok",
      confidence: STT_MIN_CONFIDENCE,
    });
  });

  it("joins multiple results and reports the lowest confidence", () => {
    const payload = {
      results: [
        { alternatives: [{ transcript: "I took", confidence: 0.9 }] },
        { alternatives: [{ transcript: "the tablet", confidence: 0.7 }] },
      ],
    };
    expect(interpretRecognition(payload)).toEqual({
      status: "ok",
      transcript: "I took the tablet",
      confidence: 0.7,
    });
  });

  it("marks low confidence as not usable", () => {
    expect(interpretRecognition(answer("maybe something", 0.42))).toEqual({
      status: "low_confidence",
      transcript: "maybe something",
      confidence: 0.42,
    });
  });

  it("treats a wrong-language answer as low confidence", () => {
    expect(interpretRecognition(answer("different language", 0.18))).toMatchObject({
      status: "low_confidence",
      confidence: 0.18,
    });
  });

  it("never guesses when confidence is missing", () => {
    expect(interpretRecognition(answer("unscored answer"))).toEqual({
      status: "low_confidence",
      transcript: "unscored answer",
      confidence: null,
    });
  });

  it("treats no results, empty results and blank transcripts as empty", () => {
    const empty = { status: "empty", transcript: null, confidence: null };
    expect(interpretRecognition({})).toEqual(empty);
    expect(interpretRecognition({ results: [] })).toEqual(empty);
    expect(interpretRecognition({ results: [{ alternatives: [] }] })).toEqual(empty);
    expect(interpretRecognition(answer("   ", 0.99))).toEqual(empty);
  });

  it("rejects malformed responses", () => {
    expect(() => interpretRecognition(null)).toThrow("stt:invalid_response");
    expect(() => interpretRecognition({ results: "nope" })).toThrow("stt:invalid_response");
    expect(() => interpretRecognition({ results: [null] })).toThrow("stt:invalid_response");
  });
});

describe("GoogleSttClient", () => {
  const audio = Buffer.from("phone audio");

  it("posts the documented recognition request per language", async () => {
    const fetchMock = jest.fn().mockResolvedValue(ok(answer("le liya", 0.9)));
    const client = new GoogleSttClient("stt-key", fetchMock as unknown as typeof fetch);

    await expect(client.transcribe(audio, "ml-IN")).resolves.toEqual({
      status: "ok",
      transcript: "le liya",
      confidence: 0.9,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://speech.googleapis.com/v1/speech:recognize?key=stt-key");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      config: {
        encoding: STT_ENCODING,
        sampleRateHertz: STT_SAMPLE_RATE_HZ,
        languageCode: "ml-IN",
        model: STT_MODELS["ml-IN"],
        audioChannelCount: 1,
        maxAlternatives: 1,
        enableAutomaticPunctuation: false,
      },
      audio: { content: audio.toString("base64") },
    });
  });

  it("uses a phone model where available and short-utterance otherwise", () => {
    expect(STT_MODELS).toEqual({
      "en-IN": "telephony_short",
      "hi-IN": "telephony_short",
      "ml-IN": "latest_short",
      "ta-IN": "latest_short",
    });
  });

  it("returns empty for silence without calling Google", async () => {
    const payload = ok({ results: [] });
    const emptyAudio = jest.fn().mockResolvedValue(payload);
    const client = new GoogleSttClient("k", emptyAudio as unknown as typeof fetch);

    await expect(client.transcribe(Buffer.alloc(0), "en-IN")).resolves.toEqual({
      status: "empty",
      transcript: null,
      confidence: null,
    });
    expect(emptyAudio).not.toHaveBeenCalled();

    const silence = jest.fn().mockResolvedValue(ok({}));
    await expect(
      new GoogleSttClient("k", silence as unknown as typeof fetch).transcribe(audio, "ta-IN"),
    ).resolves.toMatchObject({ status: "empty", transcript: null });
  });

  it("rejects oversized audio before upload", async () => {
    const fetchMock = jest.fn();
    const client = new GoogleSttClient("k", fetchMock as unknown as typeof fetch);

    await expect(
      client.transcribe(Buffer.alloc(STT_MAX_AUDIO_BYTES + 1), "hi-IN"),
    ).rejects.toMatchObject({ code: "audio_too_large" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps failures to codes only", async () => {
    const nonOk = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
    } as unknown as Response);
    await expect(
      new GoogleSttClient("k", nonOk as unknown as typeof fetch).transcribe(audio, "en-IN"),
    ).rejects.toMatchObject({ code: "http_400" });

    const badJson = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad");
      },
    } as unknown as Response);
    await expect(
      new GoogleSttClient("k", badJson as unknown as typeof fetch).transcribe(audio, "en-IN"),
    ).rejects.toMatchObject({ code: "invalid_json" });

    const offline = jest.fn().mockRejectedValue(new TypeError("failed"));
    await expect(
      new GoogleSttClient("k", offline as unknown as typeof fetch).transcribe(audio, "en-IN"),
    ).rejects.toMatchObject({ code: "network" });

    const timeout = jest.fn().mockRejectedValue(Object.assign(new Error(), { name: "TimeoutError" }));
    await expect(
      new GoogleSttClient("k", timeout as unknown as typeof fetch).transcribe(audio, "en-IN"),
    ).rejects.toMatchObject({ code: "timeout" });
  });

  it("does not put transcripts or audio in error messages", async () => {
    const failure = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: "secret transcript" } }),
    } as unknown as Response);
    try {
      await new GoogleSttClient("k", failure as unknown as typeof fetch).transcribe(
        Buffer.from("private audio"),
        "en-IN",
      );
      throw new Error("expected rejection");
    } catch (error) {
      expect((error as Error).message).toBe("stt:http_500");
      expect((error as Error).message).not.toContain("secret transcript");
      expect((error as Error).message).not.toContain("private audio");
    }
  });
});
