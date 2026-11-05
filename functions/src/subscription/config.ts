import { defineSecret } from "firebase-functions/params";
import { GooglePlayClient, type PlayClient } from "./play";

/** Service account JSON with access to the Play Developer API (Secret Manager only). */
export const PLAY_SERVICE_ACCOUNT_JSON = defineSecret("PLAY_SERVICE_ACCOUNT_JSON");
export const PLAY_SECRETS = [PLAY_SERVICE_ACCOUNT_JSON];

export function createPlayClient(): PlayClient {
  return new GooglePlayClient(PLAY_SERVICE_ACCOUNT_JSON.value());
}
