import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, type CallableRequest } from "firebase-functions/v2/https";
import { createParentHandler } from "./family";
import { createInviteHandler, redeemInviteHandler, type CreateInvitePayload } from "./invites";

// Every function deploys to Mumbai. Set once here so none can land in another region.
setGlobalOptions({ region: "asia-south1" });

export { SUPPORTED_LANGUAGES } from "./validation";

export const createParent = onCall(createParentHandler);
// Wrapped so the handler's test-only codeGen parameter is not part of onCall's signature.
export const createInvite = onCall((request: CallableRequest<CreateInvitePayload>) =>
  createInviteHandler(request),
);
export const redeemInvite = onCall(redeemInviteHandler);
