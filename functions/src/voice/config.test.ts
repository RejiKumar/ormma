import { readFileSync } from "node:fs";
import { join } from "node:path";

jest.mock("../db", () => ({ ensureAdminApp: jest.fn() }));

const download = jest.fn();
jest.mock("firebase-admin/storage", () => ({
  getStorage: () => ({ bucket: () => ({ file: () => ({ download, exists: async () => [false] }) }) }),
}));

import { createAudioLoader, createPromptAudioService } from "./config";

describe("createAudioLoader", () => {
  const original = process.env.GOOGLE_TTS_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.GOOGLE_TTS_API_KEY;
    else process.env.GOOGLE_TTS_API_KEY = original;
    download.mockReset();
  });

  it("serves stored audio without a Text-to-Speech key, which the audio endpoint is deployed without", async () => {
    delete process.env.GOOGLE_TTS_API_KEY;
    // The old wiring: no key means no service at all, so every audio request was refused with a 503.
    expect(createPromptAudioService()).toBeNull();

    download.mockResolvedValue([Buffer.from("mp3-bytes")]);
    const loader = createAudioLoader();
    expect(loader).not.toBeNull();
    const id = "a".repeat(64);
    await expect(loader.load(id)).resolves.toEqual(Buffer.from("mp3-bytes"));
  });

  it("answers null for an id that is not a stored audio id, and never synthesises", async () => {
    const loader = createAudioLoader();
    await expect(loader.load("../etc/passwd")).resolves.toBeNull();
    expect(download).not.toHaveBeenCalled();
    await expect(loader.ensure("en-IN", "hello")).rejects.toThrow("tts_not_available");
  });

  it("is what the voiceAudio function is built with", () => {
    const index = readFileSync(join(__dirname, "..", "index.ts"), "utf8");
    const block = index.slice(index.indexOf("export const voiceAudio"), index.indexOf("export const voiceReply"));
    expect(block).toContain("createAudioLoader()");
    expect(block).not.toContain("createPromptAudioService()");
  });
});
