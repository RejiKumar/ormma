import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, type CallableRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
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

// Every minute. Claims due events and hands them to the call provider (log-only in this stage).
export const dispatchDueCalls = onSchedule(
  { schedule: "* * * * *", timeZone: "Asia/Kolkata" },
  async () => {
    await dispatchDueCallsHandler();
  },
);
