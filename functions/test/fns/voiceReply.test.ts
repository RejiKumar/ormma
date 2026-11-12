import { initializeApp, getApps } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import type { PushSender } from "../../src/alerts/fcm";
import { voiceReplyHandler, type VoiceReplyDeps } from "../../src/voice/reply";

// Runs against the Firestore emulator (npm run test:fns). Google, Claude and the Exotel download are
// replaced by test doubles; nothing here calls a real service.
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: "demo-ormma" });
});

const db = () => getFirestore();
const TOKEN = "t".repeat(40);
let seq = 0;
const unique = (prefix: string): string => `${prefix}_${(seq += 1)}${Math.random().toString(36).slice(2, 8)}`;

const validReply = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    tookMedicine: true,
    readings: [],
    symptoms: [],
    confirmationNote: null,
    urgent: false,
    confidence: 0.9,
    language: "en-IN",
    ...over,
  });

const audioResponse = (type = "audio/mpeg", status = 200): Response =>
  ({
    ok: status === 200,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? type : null) },
    arrayBuffer: async () => new TextEncoder().encode("recording-bytes").buffer,
  }) as unknown as Response;

async function seedCall(over: { sessionStatus?: string; dtmfInput?: string | null } = {}) {
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
    status: over.sessionStatus ?? "initiated",
    dtmfInput: over.dtmfInput ?? null,
    startedAt: Timestamp.now(),
    endedAt: null,
  });
  return { parentId, callSid, eventId };
}

const sender = (): PushSender => ({
  sendMulticast: jest.fn().mockResolvedValue({ successCount: 0, failureCount: 0, invalidTokens: [] }),
});

function makeDeps(over: Partial<VoiceReplyDeps> & { transcript?: string } = {}) {
  const stt = {
    transcribe: jest.fn().mockResolvedValue({ status: "ok", transcript: over.transcript ?? "yes I took the tablet", confidence: 0.92 }),
  };
  const model = { complete: jest.fn().mockResolvedValue(validReply()) };
  const fetchImpl = jest.fn().mockResolvedValue(audioResponse());
  const deps: VoiceReplyDeps = {
    db: db(),
    token: TOKEN,
    stt,
    model,
    sender: sender(),
    fetchImpl: fetchImpl as unknown as typeof fetch,
    ...over,
  };
  return { deps, stt, model, fetchImpl };
}

const request = (callSid: string, parentId: string, extra: Record<string, unknown> = {}) => ({
  method: "POST",
  query: { token: TOKEN, CallSid: callSid, CustomField: parentId, RecordingUrl: "https://recordings.exotel.com/a/b.mp3", ...extra },
});

const eventDoc = async (parentId: string, eventId: string) =>
  (await db().doc(`parents/${parentId}/doseEvents/${eventId}`).get()).data() as Record<string, unknown>;
const sessionDoc = async (parentId: string, callSid: string) =>
  (await db().doc(`parents/${parentId}/callSessions/${callSid}`).get()).data() as Record<string, unknown>;

describe("voiceReplyHandler (emulator)", () => {
  it("applies a usable reply once: the dose becomes taken and the endpoint answers 200", async () => {
    const { parentId, callSid, eventId } = await seedCall();
    const { deps, stt, model } = makeDeps();
    const result = await voiceReplyHandler(request(callSid, parentId), deps);
    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect((await eventDoc(parentId, eventId)).status).toBe("taken");
    expect((await eventDoc(parentId, eventId)).resolvedBy).toBe("voice");
    const session = await sessionDoc(parentId, callSid);
    expect(session.voiceReplyState).toBe("applied");
    expect(session.status).toBe("answered");
    expect(stt.transcribe).toHaveBeenCalledTimes(1);
    expect(model.complete).toHaveBeenCalled();
  });

  it("a second delivery of the same CallSid changes nothing and answers 200", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps, stt } = makeDeps();
    await voiceReplyHandler(request(callSid, parentId), deps);
    const again = await voiceReplyHandler(request(callSid, parentId), deps);
    expect(again).toEqual({ status: 200, body: { ok: true, ignored: "duplicate_reply" } });
    expect(stt.transcribe).toHaveBeenCalledTimes(1);
  });

  it("two deliveries at the same moment are processed once", async () => {
    const { parentId, callSid, eventId } = await seedCall();
    const slow = makeDeps();
    slow.stt.transcribe.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ status: "ok", transcript: "yes", confidence: 0.9 }), 150)),
    );
    const [a, b] = await Promise.all([
      voiceReplyHandler(request(callSid, parentId), slow.deps),
      voiceReplyHandler(request(callSid, parentId), slow.deps),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(slow.stt.transcribe).toHaveBeenCalledTimes(1);
    expect((await eventDoc(parentId, eventId)).status).toBe("taken");
  });

  it("answers 422 and changes nothing when the reply is not clear enough", async () => {
    const { parentId, callSid, eventId } = await seedCall();
    const { deps, stt, model } = makeDeps();
    stt.transcribe.mockResolvedValue({ status: "low_confidence", transcript: "mumble", confidence: 0.3 });
    const result = await voiceReplyHandler(request(callSid, parentId), deps);
    expect(result).toEqual({ status: 422, body: { usable: false, reason: "low_confidence" } });
    expect((await eventDoc(parentId, eventId)).status).toBe("calling");
    expect((await sessionDoc(parentId, callSid)).voiceReplyState).toBeUndefined();
    expect(model.complete).not.toHaveBeenCalled();
  });

  it("a silent recording is not usable and a later retry may still be processed", async () => {
    const { parentId, callSid } = await seedCall();
    const first = makeDeps();
    first.stt.transcribe.mockResolvedValue({ status: "empty", transcript: null, confidence: null });
    expect((await voiceReplyHandler(request(callSid, parentId), first.deps)).status).toBe(422);
    const second = makeDeps();
    expect((await voiceReplyHandler(request(callSid, parentId), second.deps)).status).toBe(200);
  });

  it("invalid model output is kept for review with reason codes only, and no dose changes", async () => {
    const { parentId, callSid, eventId } = await seedCall();
    const { deps, model } = makeDeps();
    model.complete.mockResolvedValue("this is not json");
    const result = await voiceReplyHandler(request(callSid, parentId), deps);
    expect(result).toEqual({ status: 422, body: { usable: false, reason: "review" } });
    expect((await eventDoc(parentId, eventId)).status).toBe("calling");
    const session = await sessionDoc(parentId, callSid);
    expect(session.voiceReplyState).toBe("review");
    expect(session.voiceReplyReasons).toEqual(expect.arrayContaining(["invalid_output"]));
    expect(JSON.stringify(session)).not.toContain("yes I took");
  });

  it("an urgent keyword raises the urgent alert and answers 200", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps } = makeDeps({ transcript: "I have chest pain" });
    const result = await voiceReplyHandler(request(callSid, parentId), deps);
    expect(result.status).toBe(200);
    expect((await db().collection(`parents/${parentId}/alerts`).get()).size).toBe(1);
  });

  it("refuses a wrong or missing token and reads nothing", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps, fetchImpl } = makeDeps();
    expect((await voiceReplyHandler(request(callSid, parentId, { token: "nope" }), deps)).status).toBe(401);
    expect((await voiceReplyHandler(request(callSid, parentId, { token: undefined }), deps)).status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed when the server has no token configured", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps } = makeDeps({ token: "" });
    expect((await voiceReplyHandler(request(callSid, parentId, { token: "" }), deps)).status).toBe(401);
  });

  it("refuses a recording address that is not a plain https host", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps, fetchImpl } = makeDeps();
    for (const url of ["http://recordings.exotel.com/a.mp3", "https://127.0.0.1/a.mp3", "https://localhost/a.mp3", "https://user:pw@recordings.exotel.com/a.mp3", "ftp://x.y/a", "not a url"]) {
      expect((await voiceReplyHandler(request(callSid, parentId, { RecordingUrl: url }), deps)).status).toBe(400);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("answers 422 and logs a code only when the recording cannot be downloaded", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps, fetchImpl } = makeDeps();
    fetchImpl.mockResolvedValue(audioResponse("audio/mpeg", 404));
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await voiceReplyHandler(request(callSid, parentId), deps);
    expect(result.status).toBe(422);
    expect(JSON.stringify(error.mock.calls)).toContain("http_404");
    expect(JSON.stringify(error.mock.calls)).not.toContain("recording-bytes");
    error.mockRestore();
    expect((await sessionDoc(parentId, callSid)).voiceReplyState).toBeUndefined();
  });

  it("answers 422 when the whole step takes longer than its budget", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps, fetchImpl } = makeDeps({ budgetMs: 60 });
    fetchImpl.mockImplementation(() => new Promise(() => undefined));
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await voiceReplyHandler(request(callSid, parentId), deps);
    error.mockRestore();
    expect(result).toEqual({ status: 422, body: { usable: false, reason: "budget_exceeded" } });
  });

  it("ignores a spoken reply when the parent already answered on the keypad", async () => {
    const { parentId, callSid, eventId } = await seedCall({ dtmfInput: "1" });
    const { deps, stt } = makeDeps();
    expect(await voiceReplyHandler(request(callSid, parentId), deps)).toEqual({ status: 200, body: { ok: true, ignored: "keypad_answered" } });
    expect(stt.transcribe).not.toHaveBeenCalled();
    expect((await eventDoc(parentId, eventId)).status).toBe("calling");
  });

  it("answers 422 for a call it does not know", async () => {
    const { parentId } = await seedCall();
    const { deps } = makeDeps();
    expect((await voiceReplyHandler(request("CA_unknown_sid", parentId), deps)).body).toMatchObject({ reason: "unknown_session" });
  });

  it("is not usable, and uses the keypad, when speech services are not configured", async () => {
    const { parentId, callSid } = await seedCall();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const { deps } = makeDeps({ stt: null });
    expect(await voiceReplyHandler(request(callSid, parentId), deps)).toEqual({ status: 422, body: { usable: false, reason: "not_configured" } });
    warn.mockRestore();
  });

  it("passes a WAV recording to speech-to-text as wav", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps, stt, fetchImpl } = makeDeps();
    fetchImpl.mockResolvedValue(audioResponse("audio/wav"));
    await voiceReplyHandler(request(callSid, parentId, { RecordingUrl: "https://recordings.exotel.com/a/b" }), deps);
    expect(stt.transcribe.mock.calls[0][2]).toBe("wav");
  });

  it("does not guess an unknown recording format", async () => {
    const { parentId, callSid } = await seedCall();
    const { deps, stt, fetchImpl } = makeDeps();
    fetchImpl.mockResolvedValue(audioResponse("application/octet-stream"));
    const result = await voiceReplyHandler(request(callSid, parentId, { RecordingUrl: "https://recordings.exotel.com/a/b" }), deps);
    expect(result.status).toBe(422);
    expect(stt.transcribe).not.toHaveBeenCalled();
  });
});
