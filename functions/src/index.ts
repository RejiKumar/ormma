import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, onRequest, type CallableRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getDb } from "./db";
import { EXOTEL_SECRETS, WEBHOOK_SECRETS, createCallProvider } from "./exotel/config";
import { exotelWebhookHandler } from "./exotel/webhook";
import { createParentHandler } from "./family";
import { createInviteHandler, redeemInviteHandler, type CreateInvitePayload } from "./invites";
import { dispatchDueCallsHandler } from "./schedule/dispatch";
import { generateDoseEventsHandler } from "./schedule/generate";

// Every function deploys to Mumbai. Set once here so none can land in another region.
setGlobalOptions({ region: "asia-south1" });

export { SUPPORTED_LANGUAGES } from "./validation";

export const createParent = onCall(createParentHandler);
// Wrapped so the handler's test-only codeGen parameter is not part of onCall's signature.
export const createInvite = onCall((request: CallableRequest<CreateInvitePayload>) =>
  createInviteHandler(request),
);
export const redeemInvite = onCall(redeemInviteHandler);

// Daily at 00:30 India time. Creates the next 24 hours of dose events per parent (idempotent).
export const generateDoseEvents = onSchedule(
  { schedule: "30 0 * * *", timeZone: "Asia/Kolkata" },
  async () => {
    await generateDoseEventsHandler();
  },
);

// Every minute. Claims due events and hands them to the call provider. `CALL_PROVIDER=exotel`
// opts in to real calls; otherwise the log-only provider is used.
export const dispatchDueCalls = onSchedule(
  { schedule: "* * * * *", timeZone: "Asia/Kolkata", secrets: EXOTEL_SECRETS },
  async () => {
    await dispatchDueCallsHandler({ provider: createCallProvider() });
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
