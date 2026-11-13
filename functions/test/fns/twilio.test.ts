import { initializeApp, getApps } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import type { PushSender } from "../../src/alerts/fcm";
import { computeTwilioSignature } from "../../src/twilio/signature";
import { twilioStatusHandler } from "../../src/twilio/status";
import {
  twilioDownloadFetch,
  twilioVoiceHandler,
  type TwilioCallbackConfig,
  type TwilioHttpRequest,
  type TwilioVoiceDeps,
} from "../../src/twilio/voice";
import { PromptAudioService, type AudioStore, type TtsClient } from "../../src/voice/tts";

// Runs against the Firestore emulator (npm run test:fns). Twilio, Google and Claude are test doubles:
// nothing here places a call or calls a real service.
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: "demo-ormma" });
});

const db = () => getFirestore();
const CONFIG: TwilioCallbackConfig = { accountSid: "ACtest0000", authToken: "twilio-auth-token", publicBaseUrl: "https://fn.test" };
const RECORDING_SID = `RE${"a".repeat(32)}`;
let seq = 0;
const unique = (prefix: string): string => `${prefix}_${(seq += 1)}${Math.random().toString(36).slice(2, 8)}`;

class MemoryStore implements AudioStore {
  readonly objects = new Map<string, Buffer>();
  exists = (path: string) => Promise.resolve(this.objects.has(path));
  save = (path: string, data: Buffer) => {
    this.objects.set(path, data);
    return Promise.resolve();
  };
  load = (path: string) => Promise.resolve(this.objects.get(path) ?? null);
}

const audio = () => new PromptAudioService({ synthesize: jest.fn().mockResolvedValue(Buffer.from("mp3")) } as TtsClient, new MemoryStore());

const validReply = () =>
  JSON.stringify({
    tookMedicine: true,
    readings: [],
    symptoms: [],
    confirmationNote: null,
    urgent: false,
    confidence: 0.9,
    language: "en-IN",
  });

async function seedCall(sessionOver: Record<string, unknown> = {}) {
  const parentId = unique("parent");
  const callSid = unique("CA");
  const eventId = unique("evt");
  await db().doc(`parents/${parentId}`).set({
    name: "Amma",
    phone: "+919812345678",
    language: "en-IN",
    timezone: "Asia/Kolkata",
    createdBy: unique("owner"),
    active: true,
    callPolicy: { retryCount: 2, retryGapMinutes: 10, missedAfterMinutes: 60, quietHours: { start: "22:00", end: "06:00" } },
    consent: { status: "granted", grantedAt: Timestamp.now(), revokedAt: null, regrantedAt: null, method: "family_attested", policyVersion: "v1", sharedWith: "all_members" },
    createdAt: Timestamp.now(),
  });
  await db().doc(`parents/${parentId}/doseEvents/${eventId}`).set({
    medicineId: "m1",
    scheduledFor: Timestamp.fromMillis(Date.now() - 60_000),
    status: "calling",
    attempts: 1,
    lastCallSid: callSid,
    missedAt: null,
    resolvedAt: null,
    resolvedByUid: null,
    resolvedBy: null,
    alertSent: false,
    groupConfirmed: false,
    confirmationNote: null,
    lastCallAt: Timestamp.fromMillis(Date.now() - 50_000),
    reminderAt: null,
    lastDispatchFailure: false,
  });
  await db().doc(`parents/${parentId}/callSessions/${callSid}`).set({
    callSid,
    doseEventIds: [eventId],
    status: "initiated",
    dtmfInput: null,
    startedAt: Timestamp.now(),
    endedAt: null,
    ...sessionOver,
  });
  return { parentId, callSid, eventId };
}

const event = async (parentId: string, id: string) => (await db().doc(`parents/${parentId}/doseEvents/${id}`).get()).data() as Record<string, unknown>;
const session = async (parentId: string, sid: string) => (await db().doc(`parents/${parentId}/callSessions/${sid}`).get()).data() as Record<string, unknown>;

/** A request exactly as Twilio would sign it: the address we gave it plus its POST parameters. */
function signed(fn: "twilioVoice" | "twilioStatus", query: Record<string, string>, params: Record<string, string>, over: Partial<TwilioHttpRequest> = {}): TwilioHttpRequest {
  const search = `?${new URLSearchParams(query).toString()}`;
  return {
    method: "POST",
    query,
    body: params,
    originalUrl: `/${search}`,
    signature: computeTwilioSignature(CONFIG.authToken, `${CONFIG.publicBaseUrl}/${fn}${search}`, params),
    ...over,
  };
}

const recordingResponse = (status = 200): Response =>
  ({
    ok: status === 200,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "audio/mpeg" : null) },
    arrayBuffer: async () => new TextEncoder().encode("recording-bytes").buffer,
  }) as unknown as Response;

function makeDeps(over: { sttResult?: unknown; audioNull?: boolean; fetchImpl?: jest.Mock } = {}) {
  const stt = { transcribe: jest.fn().mockResolvedValue(over.sttResult ?? { status: "ok", transcript: "yes I took the tablet", confidence: 0.92 }) };
  const model = { complete: jest.fn().mockResolvedValue(validReply()) };
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl =
    over.fetchImpl ??
    jest.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return init?.method === "DELETE" ? ({ ok: true, status: 204 } as Response) : recordingResponse();
    });
  const sender: PushSender = { sendMulticast: jest.fn().mockResolvedValue({ successCount: 0, failureCount: 0, invalidTokens: [] }) };
  const deps: TwilioVoiceDeps = {
    db: db(),
    config: CONFIG,
    prompt: { db: db(), audio: over.audioNull ? null : audio(), token: "prompt-token", audioBaseUrl: "https://fn.test/voiceAudio" },
    reply: { db: db(), stt, model, sender },
    fetchImpl: fetchImpl as unknown as typeof fetch,
    sleep: async () => undefined,
  };
  return { deps, stt, model, fetchImpl, calls };
}

const step = (parentId: string, callSid: string, name: string, extra: Record<string, string> = {}) =>
  signed("twilioVoice", { step: name, parentId }, { CallSid: callSid, ...extra });

describe("twilioVoice authenticity (emulator)", () => {
  it("answers only POST, and 403 for a missing or wrong signature, before touching Firestore", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps } = makeDeps();
    const get = await twilioVoiceHandler({ ...step(parentId, callSid, "gather", { Digits: "1" }), method: "GET" }, deps);
    expect(get.status).toBe(405);
    for (const signature of [null, "", "not-the-signature"]) {
      const response = await twilioVoiceHandler({ ...step(parentId, callSid, "gather", { Digits: "1" }), signature }, deps);
      expect(response.status).toBe(403);
    }
    // A signature computed for different parameters does not authorise these ones.
    const other = signed("twilioVoice", { step: "gather", parentId }, { CallSid: callSid, Digits: "2" });
    const forged = await twilioVoiceHandler({ ...step(parentId, callSid, "gather", { Digits: "1" }), signature: other.signature }, deps);
    expect(forged.status).toBe(403);
    expect((await session(parentId, callSid)).dtmfInput).toBeNull();
    expect((await event(parentId, (await session(parentId, callSid)).doseEventIds as never as string)).status).toBeDefined();
  });

  it("fails closed when Twilio is not configured", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps } = makeDeps();
    const response = await twilioVoiceHandler(step(parentId, callSid, "gather", { Digits: "1" }), { ...deps, config: null });
    expect(response.status).toBe(503);
    expect((await session(parentId, callSid)).dtmfInput).toBeNull();
  });

  it("rejects an unknown step and malformed ids", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps } = makeDeps();
    expect((await twilioVoiceHandler(step(parentId, callSid, "nonsense"), deps)).status).toBe(404);
    expect((await twilioVoiceHandler(step("../x", callSid, "closing"), deps)).status).toBe(400);
  });
});

describe("twilioVoice steps (emulator)", () => {
  it("greeting plays the greeting and goes on to the question", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps } = makeDeps();
    const response = await twilioVoiceHandler(step(parentId, callSid, "greeting"), deps);
    expect(response.status).toBe(200);
    expect(response.headers["Content-Type"]).toContain("text/xml");
    expect(response.body).toMatch(/<Play>https:\/\/fn\.test\/voiceAudio\?token=prompt-token&amp;id=[a-f0-9]+<\/Play>/);
    expect(response.body).toContain(`<Redirect method="POST">https://fn.test/twilioVoice?step=question&amp;parentId=${parentId}</Redirect>`);
  });

  it("question offers a keypad that a key press interrupts, then a recording of at most 8 seconds", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps } = makeDeps();
    const body = (await twilioVoiceHandler(step(parentId, callSid, "question"), deps)).body;
    expect(body).toMatch(/<Gather input="dtmf" numDigits="1" timeout="5" method="POST" action="[^"]*step=gather[^"]*"><Play>/);
    expect(body).toMatch(/<Record [^>]*action="[^"]*step=record[^"]*" maxLength="8"[^>]*playBeep="false"/);
  });

  it("a key press is applied once and the closing is returned", async () => {
    const { parentId, callSid, eventId } = await seedCall();
    const { deps } = makeDeps();
    const first = await twilioVoiceHandler(step(parentId, callSid, "gather", { Digits: "1" }), deps);
    expect(first.body).toMatch(/<Play>[^<]+<\/Play><Hangup\/>/);
    expect((await event(parentId, eventId)).status).toBe("taken");
    expect((await session(parentId, callSid)).dtmfInput).toBe("1");

    // The same callback again changes nothing.
    const before = await event(parentId, eventId);
    const again = await twilioVoiceHandler(step(parentId, callSid, "gather", { Digits: "2" }), deps);
    expect(again.status).toBe(200);
    expect(await event(parentId, eventId)).toEqual(before);
    expect((await session(parentId, callSid)).dtmfInput).toBe("1");
  });

  it("a spoken answer is processed once with Twilio credentials for Twilio's host, then the recording is deleted", async () => {
    const { parentId, callSid, eventId } = await seedCall();
    const { deps, calls, stt } = makeDeps();
    const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${CONFIG.accountSid}/Recordings/${RECORDING_SID}`;
    const response = await twilioVoiceHandler(step(parentId, callSid, "record", { RecordingUrl: recordingUrl, RecordingSid: RECORDING_SID }), deps);

    expect(response.body).toMatch(/<Play>[^<]+<\/Play><Hangup\/>/);
    expect((await event(parentId, eventId)).status).toBe("taken");
    expect(stt.transcribe).toHaveBeenCalledTimes(1);

    const download = calls.find((c) => c.init?.method !== "DELETE")!;
    expect(download.url).toBe(`${recordingUrl}.mp3`);
    expect((download.init?.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from(`${CONFIG.accountSid}:${CONFIG.authToken}`).toString("base64")}`,
    );
    const removal = calls.find((c) => c.init?.method === "DELETE")!;
    expect(removal.url).toBe(`https://api.twilio.com/2010-04-01/Accounts/${CONFIG.accountSid}/Recordings/${RECORDING_SID}.json`);

    // Delivered again: the reply is not applied twice, and the recording is deleted again harmlessly.
    const repeat = await twilioVoiceHandler(step(parentId, callSid, "record", { RecordingUrl: recordingUrl, RecordingSid: RECORDING_SID }), deps);
    expect(repeat.status).toBe(200);
    expect(stt.transcribe).toHaveBeenCalledTimes(1);
  });

  it("an unusable spoken answer changes nothing, asks once more with a keypad only, and still deletes the recording", async () => {
    const { parentId, callSid, eventId } = await seedCall();
    const { deps, calls } = makeDeps({ sttResult: { status: "empty", transcript: null, confidence: null } });
    const response = await twilioVoiceHandler(
      step(parentId, callSid, "record", { RecordingUrl: `https://api.twilio.com/2010-04-01/Accounts/${CONFIG.accountSid}/Recordings/${RECORDING_SID}`, RecordingSid: RECORDING_SID }),
      deps,
    );
    expect(response.body).toMatch(/<Gather input="dtmf"[^>]*action="[^"]*step=gather[^"]*"><Play>/);
    expect(response.body).toContain("step=closing");
    expect(response.body).not.toContain("<Record");
    expect((await event(parentId, eventId)).status).toBe("calling");
    expect(calls.some((c) => c.init?.method === "DELETE")).toBe(true);
  });

  it("no recording at all also falls back to the keypad", async () => {
    const { parentId, callSid, eventId } = await seedCall();
    const { deps, stt, calls } = makeDeps();
    const response = await twilioVoiceHandler(step(parentId, callSid, "record"), deps);
    expect(response.body).toContain("<Gather");
    expect(response.body).not.toContain("<Record");
    expect(stt.transcribe).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
    expect((await event(parentId, eventId)).status).toBe("calling");
  });

  it("a failed deletion at Twilio changes nothing and logs only a status", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const { parentId, callSid, eventId } = await seedCall();
    const fetchImpl = jest.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") throw new Error("network down");
      return recordingResponse();
    });
    const { deps } = makeDeps({ fetchImpl });
    const response = await twilioVoiceHandler(
      step(parentId, callSid, "record", { RecordingUrl: `https://api.twilio.com/x/Recordings/${RECORDING_SID}`, RecordingSid: RECORDING_SID }),
      deps,
    );
    expect(response.body).toContain("<Hangup/>");
    expect((await event(parentId, eventId)).status).toBe("taken");
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain("recording delete failed");
    expect(logged).not.toContain(RECORDING_SID);
    expect(logged).not.toContain(CONFIG.authToken);
    warn.mockRestore();
  });

  it("the consent step plays the consent script with a keypad and never records", async () => {
    const { parentId, callSid } = await seedCall();
    await db().doc(`parents/${parentId}/members/owner1`).set({ displayName: "Rocky", role: "owner" });
    const { deps } = makeDeps();
    const response = await twilioVoiceHandler(step(parentId, callSid, "consent"), deps);
    expect(response.body).toContain("<Gather");
    expect(response.body).not.toContain("<Record");
  });

  it("a consent script that cannot be built (no member to name) ends the call quietly and logs only a code", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const { parentId, callSid } = await seedCall();
    const { deps } = makeDeps();
    const response = await twilioVoiceHandler(step(parentId, callSid, "consent"), deps);
    expect(response.status).toBe(200);
    expect(response.body).toBe('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    expect(JSON.stringify(warn.mock.calls)).not.toContain("Amma");
    warn.mockRestore();
  });

  it("ends the call quietly when a prompt cannot be made", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps } = makeDeps({ audioNull: true });
    for (const name of ["greeting", "question", "closing"]) {
      const response = await twilioVoiceHandler(step(parentId, callSid, name), deps);
      expect(response.status).toBe(200);
      expect(response.body).toBe('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    }
  });
});

describe("twilioDownloadFetch", () => {
  it("sends credentials to Twilio's host only, and retries once on a 404", async () => {
    const seen: Array<{ url: string; auth?: string }> = [];
    let first = true;
    const base = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      seen.push({ url, auth: (init?.headers as Record<string, string> | undefined)?.Authorization });
      if (url.includes("api.twilio.com") && first) {
        first = false;
        return { ok: false, status: 404 } as Response;
      }
      return { ok: true, status: 200 } as Response;
    });
    const sleep = jest.fn(async () => undefined);
    const fetchTwilio = twilioDownloadFetch(CONFIG, base as unknown as typeof fetch, sleep);

    const twilio = await fetchTwilio("https://api.twilio.com/r.mp3");
    expect(twilio.status).toBe(200);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(seen.filter((s) => s.url.includes("api.twilio.com"))).toHaveLength(2);
    expect(seen[0].auth).toMatch(/^Basic /);

    await fetchTwilio("https://recordings.example.com/r.mp3");
    expect(seen[seen.length - 1].auth).toBeUndefined();
    await fetchTwilio("https://api.twilio.com.evil.example/r.mp3");
    expect(seen[seen.length - 1].auth).toBeUndefined();
  });
});

describe("twilioStatus (emulator)", () => {
  const status = (parentId: string, callSid: string, callStatus: string, over: Partial<TwilioHttpRequest> = {}) =>
    signed("twilioStatus", { parentId }, { CallSid: callSid, CallStatus: callStatus }, over);
  const deps = () => ({ db: db(), config: CONFIG });

  it("needs a valid signature and writes nothing without one", async () => {
    const { parentId, callSid } = await seedCall();
    expect((await twilioStatusHandler({ ...status(parentId, callSid, "completed"), signature: "bad" }, deps())).status).toBe(403);
    expect((await twilioStatusHandler({ ...status(parentId, callSid, "completed"), method: "GET" }, deps())).status).toBe(405);
    expect((await twilioStatusHandler(status(parentId, callSid, "completed"), { db: db(), config: null })).status).toBe(503);
    expect((await session(parentId, callSid)).status).toBe("initiated");
  });

  it("in-progress marks the call answered; initiated and ringing change nothing", async () => {
    const { parentId, callSid } = await seedCall();
    await twilioStatusHandler(status(parentId, callSid, "ringing"), deps());
    expect((await session(parentId, callSid)).status).toBe("initiated");
    await twilioStatusHandler(status(parentId, callSid, "in-progress"), deps());
    expect((await session(parentId, callSid)).status).toBe("answered");
  });

  it("completed after a key press is completed, once, and a repeated or late callback changes nothing", async () => {
    const { parentId, callSid, eventId } = await seedCall({ status: "answered", dtmfInput: "1" });
    await db().doc(`parents/${parentId}/doseEvents/${eventId}`).update({ status: "taken" });
    await twilioStatusHandler(status(parentId, callSid, "completed"), deps());
    const done = await session(parentId, callSid);
    expect(done.status).toBe("completed");
    const endedAt = done.endedAt;
    await twilioStatusHandler(status(parentId, callSid, "completed"), deps());
    await twilioStatusHandler(status(parentId, callSid, "busy"), deps());
    const after = await session(parentId, callSid);
    expect(after.status).toBe("completed");
    expect(after.endedAt).toEqual(endedAt);
  });

  it("a call answered by voice completes too", async () => {
    const { parentId, callSid, eventId } = await seedCall({ status: "answered", voiceReplyState: "applied" });
    await db().doc(`parents/${parentId}/doseEvents/${eventId}`).update({ status: "taken" });
    await twilioStatusHandler(status(parentId, callSid, "completed"), deps());
    expect((await session(parentId, callSid)).status).toBe("completed");
    expect((await event(parentId, eventId)).status).toBe("taken");
  });

  it.each([
    ["no-answer", "no_answer"],
    ["busy", "no_answer"],
    ["canceled", "no_answer"],
    ["failed", "failed"],
  ])("%s ends the session as %s and returns the dose to pending for a retry", async (callStatus, expected) => {
    const { parentId, callSid, eventId } = await seedCall();
    await twilioStatusHandler(status(parentId, callSid, callStatus), deps());
    expect((await session(parentId, callSid)).status).toBe(expected);
    expect((await event(parentId, eventId)).status).toBe("pending");
  });

  it("ignores an unknown call and rejects malformed ids", async () => {
    const { parentId } = await seedCall();
    const unknown = await twilioStatusHandler(status(parentId, "CA_unknown_call", "completed"), deps());
    expect(unknown.status).toBe(200);
    expect(JSON.parse(unknown.body)).toMatchObject({ ignored: "unknown_session" });
    expect((await twilioStatusHandler(signed("twilioStatus", { parentId: "../x" }, { CallSid: "CA1", CallStatus: "completed" }), deps())).status).toBe(400);
  });
});
