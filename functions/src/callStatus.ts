import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { callActivation, callsEnabled, type CallActivation } from "./exotel/config";

/**
 * What the family app may know about calling: on or off, nothing else. No settings, no secret
 * names, no provider name and no cutoff time (call-activation spec, "Call status for the app").
 */
export async function getCallStatusHandler(
  request: CallableRequest<unknown>,
  activation: CallActivation = callActivation(),
): Promise<{ callsEnabled: boolean }> {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  return { callsEnabled: callsEnabled(activation) };
}
