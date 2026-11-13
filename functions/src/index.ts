import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, onRequest, type CallableRequest } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getDb } from "./db";
import { AdminPushSender } from "./alerts/fcm";
import { CALL_SECRETS, WEBHOOK_SECRETS, createCallProvider } from "./exotel/config";
import { exotelWebhookHandler } from "./exotel/webhook";
import { TWILIO_CALLBACK_SECRETS } from "./twilio/config";
import { twilioStatusHandler } from "./twilio/status";
import { twilioCallbackConfigFromEnv, twilioVoiceHandler, type TwilioHttpRequest } from "./twilio/voice";
import { getCallStatusHandler } from "./callStatus";
import { createParentHandler, listMyParentsHandler } from "./family";
import { getDoseEscalationHandler, logFamilyCallHandler, touchPresenceHandler } from "./companion";
import {
  getCallHistoryHandler,
  markDosesSeenHandler,
  setMemberProfileHandler,
  setNotifyPrefsHandler,
} from "./parity";
import { eveningDigestHandler } from "./schedule/eveningDigest";
import { createInviteHandler, redeemInviteHandler, type CreateInvitePayload } from "./invites";
import { dispatchDueCallsHandler } from "./schedule/dispatch";
import { generateDoseEventsHandler } from "./schedule/generate";
import { generateOnMedicineChangeHandler } from "./schedule/generateOnMedicine";
import { missedDoseCheckerHandler } from "./schedule/missedDose";
import { confirmPrescriptionMedicine, scanPrescription } from "./prescription";
import { deleteParent, exportParentData } from "./data/exportDelete";
import { grantConsentHandler, revokeConsentHandler } from "./consent";
import { deleteMyAccountHandler, setMyDisplayNameHandler } from "./account";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { PLAY_SECRETS, createPlayClient } from "./subscription/config";
import { playBillingEventsHandler, type PlayNotification } from "./subscription/events";
import { verifyPurchaseHandler, type VerifyPurchasePayload } from "./subscription/verify";
import {
  VOICE_AUDIO_SECRETS,
  VOICE_SECRETS,
  createAudioLoader,
  createPromptAudioService,
  createSttClient,
  STT_SECRETS,
} from "./voice/config";
import { AI_SECRETS, createReplyModelClient } from "./reply/config";
import { voiceAudioHandler, voicePromptHandler } from "./voice/prompt";
import { voiceReplyHandler } from "./voice/reply";

// Every function deploys to Mumbai. Set once here so none can land in another region.
setGlobalOptions({ region: "asia-south1" });

export { SUPPORTED_LANGUAGES } from "./validation";

// On or off for calling, nothing else. The app shows a calm note while it says off.
// Declares the Exotel secrets so it sees the same on/off answer as the scheduled functions.
export const getCallStatus = onCall({ secrets: CALL_SECRETS }, (request) => getCallStatusHandler(request));

export const createParent = onCall(createParentHandler);
// Returns the caller's parent ids so a reinstall or a new phone can rebuild the local list.
export const listMyParents = onCall(listMyParentsHandler);
// Wrapped so the handler's test-only codeGen parameter is not part of onCall's signature.
export const createInvite = onCall((request: CallableRequest<CreateInvitePayload>) =>
  createInviteHandler(request),
);
export const redeemInvite = onCall(redeemInviteHandler);
export const getDoseEscalation = onCall((request) => getDoseEscalationHandler(request));
export const touchPresence = onCall((request) => touchPresenceHandler(request));
export const logFamilyCall = onCall((request) => logFamilyCallHandler(request));
export const markDosesSeen = onCall((request) => markDosesSeenHandler(request));
export const setMemberProfile = onCall((request) => setMemberProfileHandler(request));
export const setNotifyPrefs = onCall((request) => setNotifyPrefsHandler(request));
export const getCallHistory = onCall((request) => getCallHistoryHandler(request));
export const deleteMyAccount = onCall((request) => deleteMyAccountHandler(request));
export const setMyDisplayName = onCall((request) => setMyDisplayNameHandler(request));
// Checks a Google Play purchase and stores the entitlement (server-side only).
export const verifyPurchase = onCall(
  { secrets: PLAY_SECRETS },
  (request: CallableRequest<VerifyPurchasePayload>) => verifyPurchaseHandler(request, createPlayClient()),
);
// Google Play Real-time Developer Notifications arrive on this Pub/Sub topic.
export const playBillingEvents = onMessagePublished(
  { topic: "play-billing-events", secrets: PLAY_SECRETS },
  async (event) => {
    const notification = event.data.message.json as PlayNotification;
    await playBillingEventsHandler(notification, createPlayClient());
  },
);
export const revokeConsent = onCall(revokeConsentHandler);
export const grantConsent = onCall(grantConsentHandler);

// Daily at 00:30 India time. Creates the next 24 hours of dose events per parent (idempotent).
export const generateDoseEvents = onSchedule(
  { schedule: "30 0 * * *", timeZone: "Asia/Kolkata", secrets: CALL_SECRETS },
  async () => {
    await generateDoseEventsHandler();
  },
);

// Every minute. Claims due events and hands them to the call provider. Real calls need
// `CALL_PROVIDER=exotel` and a complete Exotel set-up; otherwise calling is off and this does nothing.
// Every gated function declares the same secrets so they all see the same on/off answer.
export const dispatchDueCalls = onSchedule(
  { schedule: "* * * * *", timeZone: "Asia/Kolkata", secrets: CALL_SECRETS },
  async () => {
    await dispatchDueCallsHandler({ provider: createCallProvider() });
  },
);

// Every minute. Marks events missed after the parent's policy window and alerts the family once per
// event or group. Alerts are written transactionally; FCM delivery follows the commit.
export const missedDoseChecker = onSchedule(
  { schedule: "* * * * *", timeZone: "Asia/Kolkata", secrets: CALL_SECRETS },
  async () => {
    await missedDoseCheckerHandler({ sender: new AdminPushSender() });
  },
);

// Every 15 minutes. Sends the evening summary once per parent per local day, in the 20:00 hour.
export const sendEveningDigest = onSchedule(
  { schedule: "*/15 * * * *", timeZone: "Asia/Kolkata", secrets: CALL_SECRETS },
  async () => {
    await eveningDigestHandler({ db: getDb(), sender: new AdminPushSender() });
  },
);

// Exotel dynamic greeting/question/closing URLs. Returns plain text containing audio URLs.
export const voicePrompt = onRequest({ secrets: VOICE_SECRETS }, async (request, response) => {
  try {
    const result = await voicePromptHandler(
      { method: request.method, query: request.query as Record<string, unknown> },
      {
        db: getDb(),
        audio: createPromptAudioService(),
        token: process.env.VOICE_PROMPT_TOKEN ?? "",
        audioBaseUrl: process.env.VOICE_AUDIO_BASE_URL ?? "",
      },
    );
    response.status(result.status);
    for (const [name, value] of Object.entries(result.headers)) response.set(name, value);
    response.send(result.body);
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code ?? "unknown";
    console.error("voicePrompt: handler failed", { code });
    response.status(500).json({ error: "internal" });
  }
});

// Serves the private cached MP3. Stable URL per content hash, so both caches stay warm.
export const voiceAudio = onRequest({ secrets: VOICE_AUDIO_SECRETS }, async (request, response) => {
  try {
    const result = await voiceAudioHandler(
      { method: request.method, query: request.query as Record<string, unknown> },
      {
        // Serving a cached MP3 needs no Text-to-Speech key (see createAudioLoader).
        audio: createAudioLoader(),
        token: process.env.VOICE_PROMPT_TOKEN ?? "",
      },
    );
    response.status(result.status);
    for (const [name, value] of Object.entries(result.headers)) response.set(name, value);
    response.send(result.body);
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code ?? "unknown";
    console.error("voiceAudio: handler failed", { code });
    response.status(500).json({ error: "internal" });
  }
});

// The parent's recorded spoken answer. Exotel posts the recording; 200 means applied, 422 means the
// flow should play the keypad prompt. Audio and transcripts stay in memory and out of logs.
export const voiceReply = onRequest(
  { secrets: [...WEBHOOK_SECRETS, ...STT_SECRETS, ...AI_SECRETS], timeoutSeconds: 20 },
  async (request, response) => {
    try {
      const result = await voiceReplyHandler(
        { method: request.method, query: request.query as Record<string, unknown>, body: request.body },
        {
          db: getDb(),
          token: process.env.EXOTEL_WEBHOOK_TOKEN ?? "",
          stt: createSttClient(),
          model: createReplyModelClient(),
          sender: new AdminPushSender(),
        },
      );
      response.status(result.status).json(result.body);
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code ?? "unknown";
      console.error("voiceReply: handler failed", { code });
      response.status(422).json({ usable: false, reason: "error" });
    }
  },
);

// Exotel StatusCallback (POST) and Passthru gather (GET) arrive on one authenticated endpoint.
export const exotelWebhook = onRequest({ secrets: WEBHOOK_SECRETS }, async (request, response) => {
  try {
    const result = await exotelWebhookHandler(
      {
        method: request.method,
        query: request.query as Record<string, unknown>,
        body: request.body,
      },
      { db: getDb(), token: process.env.EXOTEL_WEBHOOK_TOKEN ?? "" },
    );
    response.status(result.status).json(result.body);
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code ?? "unknown";
    console.error("exotelWebhook: handler failed", { code });
    response.status(500).json({ error: "internal" });
  }
});
const QUIET_HANGUP = '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>';
const twilioRequest = (request: import("firebase-functions/v2/https").Request): TwilioHttpRequest => ({
  method: request.method,
  query: request.query as Record<string, unknown>,
  body: request.body,
  originalUrl: request.originalUrl,
  signature: request.get("X-Twilio-Signature") ?? null,
});

// The Twilio call script: Twilio fetches one TwiML step at a time (check-in calls placed with
// CALL_PROVIDER=twilio). Requests without a valid Twilio signature are refused before any read.
export const twilioVoice = onRequest(
  { secrets: [...TWILIO_CALLBACK_SECRETS, ...VOICE_SECRETS, ...STT_SECRETS, ...AI_SECRETS], timeoutSeconds: 30 },
  async (request, response) => {
    try {
      const db = getDb();
      const result = await twilioVoiceHandler(twilioRequest(request), {
        db,
        config: twilioCallbackConfigFromEnv(),
        prompt: {
          db,
          audio: createPromptAudioService(),
          token: process.env.VOICE_PROMPT_TOKEN ?? "",
          audioBaseUrl: process.env.VOICE_AUDIO_BASE_URL ?? "",
        },
        reply: { db, stt: createSttClient(), model: createReplyModelClient(), sender: new AdminPushSender() },
      });
      response.status(result.status);
      for (const [name, value] of Object.entries(result.headers)) response.set(name, value);
      response.send(result.body);
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code ?? "unknown";
      console.error("twilioVoice: handler failed", { code });
      // Never let Twilio read out its own error message to the parent: end the call quietly.
      response.status(200).type("text/xml").send(QUIET_HANGUP);
    }
  },
);

// Twilio's call status callback (answered, completed, busy, no-answer, failed, canceled).
export const twilioStatus = onRequest({ secrets: TWILIO_CALLBACK_SECRETS }, async (request, response) => {
  try {
    const result = await twilioStatusHandler(twilioRequest(request), { db: getDb(), config: twilioCallbackConfigFromEnv() });
    response.status(result.status);
    for (const [name, value] of Object.entries(result.headers)) response.set(name, value);
    response.send(result.body);
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code ?? "unknown";
    console.error("twilioStatus: handler failed", { code });
    response.status(500).json({ error: "internal" });
  }
});

// Creates a medicine's dose events the moment it is saved or its schedule changes, so a dose added during
// the day is called without waiting for the 00:30 run (which stays as the safety net). Idempotent: an
// existing event is never overwritten. It needs the call secrets because "is calling on" depends on them.
export const generateOnMedicineChange = onDocumentWritten(
  { document: "parents/{parentId}/medicines/{medicineId}", region: "asia-south1", secrets: CALL_SECRETS },
  async (event) => {
    try {
      await generateOnMedicineChangeHandler({
        parentId: event.params.parentId,
        medicineId: event.params.medicineId,
        before: event.data?.before.data(),
        after: event.data?.after.data(),
      });
    } catch (error) {
      // The daily run is the safety net, so a failure here only delays the events until 00:30.
      const code = (error as { code?: unknown } | null)?.code ?? "unknown";
      console.error("generateOnMedicineChange: failed", { parentId: event.params.parentId, medicineId: event.params.medicineId, code });
    }
  },
);

export { scanPrescription, confirmPrescriptionMedicine };
export { exportParentData, deleteParent };
