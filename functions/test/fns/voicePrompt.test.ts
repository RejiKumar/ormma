import { initializeApp, getApps } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import type { ParentDoc } from "../../../shared/types";
import { zonedTimeToMs } from "../../src/schedule/time";
import {
  voiceAudioHandler,
  voicePromptHandler,
  type AudioDeps,
  type PromptDeps,
} from "../../src/voice/prompt";
import { PromptAudioService, type AudioStore, type TtsClient } from "../../src/voice/tts";

// Runs under `firebase emulators:exec --only firestore` (npm run test:fns from the repo root).
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: "demo-ormma" });
});

const db = () => getFirestore();
const TOKEN = "voice-token";
const BASE = "https://example.test/voiceAudio";
const IST = "Asia/Kolkata";
const at = (time: string): number => zonedTimeToMs("2026-10-23", time, IST)!;

let seq = 0;
const unique = (prefix: string): string =>
  `${prefix}_${(seq += 1)}${Math.random().toString(36).slice(2, 8)}`;

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

function fakeAudio() {
  const store = new MemoryStore();
  const synthesize = jest.fn().mockResolvedValue(Buffer.from("fake-mp3"));
  const client: TtsClient = { synthesize };
  return { store, synthesize, service: new PromptAudioService(client, store) };
}

async function seedParent(overrides: Partial<ParentDoc> = {}, members: string[] = []): Promise<string> {
  const parentId = unique("parent");
  const parent: ParentDoc = {
    name: "Amma",
    phone: "+919812345678",
    language: "en-IN",
    timezone: IST,
    createdBy: "seed",
    active: true,
    callPolicy: {
      retryCount: 2,
      retryGapMinutes: 10,
      missedAfterMinutes: 60,
      quietHours: { start: "22:00", end: "06:00" },
    },
    consent: {
      status: "granted",
      grantedAt: Timestamp.now(),
      revokedAt: null,
      regrantedAt: null,
      method: "family_attested",
      policyVersion: "v1",
      sharedWith: "all_members",
    },
    createdAt: Timestamp.now(),
    ...overrides,
  };
  await db().doc(`parents/${parentId}`).set(parent);
  for (const name of members) {
    await db().doc(`parents/${parentId}/members/${unique("uid")}`).set({
      role: "editor",
      addedBy: "seed",
      addedAt: Timestamp.now(),
      displayName: name,
    });
  }
  return parentId;
}

async function seedEvent(parentId: string, scheduledFor: number): Promise<string> {
  const eventId = unique("evt");
  await db()
    .doc(`parents/${parentId}/doseEvents/${eventId}`)
    .set({
      medicineId: unique("med"),
      scheduledFor: Timestamp.fromMillis(scheduledFor),
      status: "calling",
      attempts: 1,
      lastCallSid: null,
      missedAt: null,
      resolvedAt: null,
      resolvedByUid: null,
      resolvedBy: null,
      alertSent: false,
      groupConfirmed: false,
      confirmationNote: null,
      lastCallAt: Timestamp.fromMillis(scheduledFor),
      reminderAt: null,
    });
  return eventId;
}

async function seedSession(parentId: string, eventIds: string[]): Promise<string> {
  const callSid = unique("CA");
  await db()
    .doc(`parents/${parentId}/callSessions/${callSid}`)
    .set({
      callSid,
      doseEventIds: eventIds,
      status: "initiated",
      dtmfInput: null,
      startedAt: Timestamp.fromMillis(at("08:00")),
      endedAt: null,
    });
  return callSid;
}

const prompt = (
  parentId: string,
  callSid: string,
  kind: string,
  deps: Partial<PromptDeps> = {},
  method = "GET",
) =>
  voicePromptHandler(
    { method, query: { token: TOKEN, kind, CallSid: callSid, CustomField: parentId } },
    {
      db: db(),
      audio: fakeAudio().service,
      token: TOKEN,
      audioBaseUrl: BASE,
      ...deps,
    },
  );

const audioUrlFrom = (body: string | Buffer): string => String(body).trim();

describe("voicePromptHandler (emulator)", () => {
  it("returns the cached greeting audio URL with no PII in it", async () => {
    const parentId = await seedParent();
    const event = await seedEvent(parentId, at("08:00"));
    const callSid = await seedSession(parentId, [event]);
    const audio = fakeAudio();

    const first = await voicePromptHandler(
      { method: "GET", query: { token: TOKEN, kind: "greeting", CallSid: callSid, CustomField: parentId } },
      { db: db(), audio: audio.service, token: TOKEN, audioBaseUrl: BASE },
    );
    expect(first.status).toBe(200);
    expect(first.headers["Content-Type"]).toContain("text/plain");
    const url = audioUrlFrom(first.body);
    expect(url).toMatch(/^https:\/\/example\.test\/voiceAudio\?token=voice-token&id=[a-f0-9]{64}$/);
    expect(url).not.toContain("Amma");
    expect(url).not.toContain("9812345678");
    expect(audio.synthesize).toHaveBeenCalledTimes(1);
    expect(audio.synthesize.mock.calls[0][0]).toContain("Amma");
    expect(audio.synthesize.mock.calls[0][0]).toContain("morning");

    const head = await voicePromptHandler(
      { method: "HEAD", query: { token: TOKEN, kind: "greeting", CallSid: callSid, CustomField: parentId } },
      { db: db(), audio: audio.service, token: TOKEN, audioBaseUrl: BASE },
    );
    expect(head.status).toBe(200);
    expect(head.body).toBe("");
    expect(head.headers["Content-Length"]).toBe(first.headers["Content-Length"]);
    expect(audio.synthesize).toHaveBeenCalledTimes(1);
  });

  it("uses the grouped question for a grouped session and the single one otherwise", async () => {
    const groupedParent = await seedParent();
    const first = await seedEvent(groupedParent, at("08:00"));
    const second = await seedEvent(groupedParent, at("08:00"));
    const groupedSid = await seedSession(groupedParent, [first, second]);
    const groupedAudio = fakeAudio();
    await voicePromptHandler(
      { method: "GET", query: { token: TOKEN, kind: "question", CallSid: groupedSid, CustomField: groupedParent } },
      { db: db(), audio: groupedAudio.service, token: TOKEN, audioBaseUrl: BASE },
    );
    expect(groupedAudio.synthesize.mock.calls[0][0]).toContain("ALL of your morning tablets");

    const singleParent = await seedParent();
    const single = await seedEvent(singleParent, at("18:00"));
    const singleSid = await seedSession(singleParent, [single]);
    const singleAudio = fakeAudio();
    await voicePromptHandler(
      { method: "GET", query: { token: TOKEN, kind: "question", CallSid: singleSid, CustomField: singleParent } },
      { db: db(), audio: singleAudio.service, token: TOKEN, audioBaseUrl: BASE },
    );
    expect(singleAudio.synthesize.mock.calls[0][0]).toContain("Did you take your tablet?");
    expect(singleAudio.synthesize.mock.calls[0][0]).not.toContain("ALL");
  });

  it("serves closing and consent scripts", async () => {
    const parentId = await seedParent({}, ["Ravi", "Meera"]);
    const event = await seedEvent(parentId, at("08:00"));
    const callSid = await seedSession(parentId, [event]);

    const closingAudio = fakeAudio();
    await voicePromptHandler(
      { method: "GET", query: { token: TOKEN, kind: "closing", CallSid: callSid, CustomField: parentId } },
      { db: db(), audio: closingAudio.service, token: TOKEN, audioBaseUrl: BASE },
    );
    expect(closingAudio.synthesize.mock.calls[0][0]).toContain("Thank you, Amma");

    const consentAudio = fakeAudio();
    const consent = await voicePromptHandler(
      { method: "GET", query: { token: TOKEN, kind: "consent", CallSid: callSid, CustomField: parentId } },
      { db: db(), audio: consentAudio.service, token: TOKEN, audioBaseUrl: BASE },
    );
    expect(consent.status).toBe(200);
    expect(consentAudio.synthesize.mock.calls[0][0]).toContain("Ravi");
    expect(consentAudio.synthesize.mock.calls[0][0]).toContain("Meera");
  });

  it("rejects bad tokens, kinds and sessions with codes", async () => {
    const parentId = await seedParent();
    const event = await seedEvent(parentId, at("08:00"));
    const callSid = await seedSession(parentId, [event]);
    const audio = fakeAudio();

    const badToken = await voicePromptHandler(
      { method: "GET", query: { token: "wrong", kind: "greeting", CallSid: callSid, CustomField: parentId } },
      { db: db(), audio: audio.service, token: TOKEN, audioBaseUrl: BASE },
    );
    expect(badToken.status).toBe(401);

    const badKind = await voicePromptHandler(
      { method: "GET", query: { token: TOKEN, kind: "poem", CallSid: callSid, CustomField: parentId } },
      { db: db(), audio: audio.service, token: TOKEN, audioBaseUrl: BASE },
    );
    expect(badKind.status).toBe(404);

    const unknownSession = await prompt(parentId, "CA_missing", "greeting", { audio: audio.service });
    expect(unknownSession.status).toBe(404);

    const unconfigured = await prompt(parentId, callSid, "greeting", { audio: null });
    expect(unconfigured.status).toBe(503);

    const noBase = await prompt(parentId, callSid, "greeting", { audio: audio.service, audioBaseUrl: "" });
    expect(noBase.status).toBe(503);

    const badMethod = await prompt(parentId, callSid, "greeting", { audio: audio.service }, "POST");
    expect(badMethod.status).toBe(405);
    expect(audio.synthesize).not.toHaveBeenCalled();
  });

  it("maps a TTS failure to a code without leaking the prompt", async () => {
    const parentId = await seedParent();
    const event = await seedEvent(parentId, at("08:00"));
    const callSid = await seedSession(parentId, [event]);
    const failing = new PromptAudioService(
      { synthesize: jest.fn().mockRejectedValue(new Error("private prompt")) },
      new MemoryStore(),
    );

    const result = await prompt(parentId, callSid, "greeting", { audio: failing });
    expect(result.status).toBe(502);
    expect(String(result.body)).toContain("tts_failed");
    expect(String(result.body)).not.toContain("Amma");
  });
});

describe("voiceAudioHandler (emulator)", () => {
  const deps = (audio: PromptAudioService | null, token = TOKEN): AudioDeps => ({ audio, token });

  it("serves MP3 bytes for a cached id, including HEAD", async () => {
    const { service } = fakeAudio();
    const id = await service.ensure("en-IN", "Hello");

    const response = await voiceAudioHandler(
      { method: "GET", query: { token: TOKEN, id } },
      deps(service),
    );
    expect(response.status).toBe(200);
    expect(response.headers["Content-Type"]).toBe("audio/mpeg");
    expect(response.headers["Cache-Control"]).toContain("immutable");
    expect(Buffer.from(response.body as Buffer).toString()).toBe("fake-mp3");

    const head = await voiceAudioHandler(
      { method: "HEAD", query: { token: TOKEN, id } },
      deps(service),
    );
    expect(head.status).toBe(200);
    expect(Buffer.from(head.body as Buffer).length).toBe(0);
    expect(head.headers["Content-Length"]).toBe(String(Buffer.byteLength("fake-mp3")));
  });

  it("rejects bad tokens and unknown or unsafe ids", async () => {
    const { service } = fakeAudio();
    expect(
      (await voiceAudioHandler({ method: "GET", query: { token: "x", id: "a".repeat(64) } }, deps(service)))
        .status,
    ).toBe(401);
    expect(
      (await voiceAudioHandler({ method: "GET", query: { token: TOKEN, id: "a".repeat(64) } }, deps(service)))
        .status,
    ).toBe(404);
    expect(
      (await voiceAudioHandler({ method: "GET", query: { token: TOKEN, id: "../secret" } }, deps(service)))
        .status,
    ).toBe(404);
    expect(
      (await voiceAudioHandler({ method: "GET", query: { token: TOKEN, id: "a".repeat(64) } }, deps(null)))
        .status,
    ).toBe(503);
  });
});
