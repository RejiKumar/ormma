import { defineSecret } from "firebase-functions/params";
import { LoggingCallProvider, type CallProvider } from "../callProvider";
import { ExotelCallProvider } from "./exotelCallProvider";

// Firebase secrets (Secret Manager). Values never live in source or git.
export const EXOTEL_API_KEY = defineSecret("EXOTEL_API_KEY");
export const EXOTEL_API_TOKEN = defineSecret("EXOTEL_API_TOKEN");
export const EXOTEL_ACCOUNT_SID = defineSecret("EXOTEL_ACCOUNT_SID");
export const EXOTEL_CALLER_ID = defineSecret("EXOTEL_CALLER_ID");
export const EXOTEL_FLOW_URL = defineSecret("EXOTEL_FLOW_URL");
export const EXOTEL_WEBHOOK_URL = defineSecret("EXOTEL_WEBHOOK_URL");
export const EXOTEL_WEBHOOK_TOKEN = defineSecret("EXOTEL_WEBHOOK_TOKEN");

export const EXOTEL_SECRETS = [
  EXOTEL_API_KEY,
  EXOTEL_API_TOKEN,
  EXOTEL_ACCOUNT_SID,
  EXOTEL_CALLER_ID,
  EXOTEL_FLOW_URL,
  EXOTEL_WEBHOOK_URL,
  EXOTEL_WEBHOOK_TOKEN,
];

export const WEBHOOK_SECRETS = [EXOTEL_WEBHOOK_TOKEN];

export interface ExotelConfig {
  accountSid: string;
  apiKey: string;
  apiToken: string;
  callerId: string;
  flowUrl: string;
  webhookUrl: string;
  webhookToken: string;
  apiBaseUrl?: string;
}

export class ExotelConfigError extends Error {
  constructor(readonly missing: string[]) {
    super(`exotel_config_missing:${missing.join(",")}`);
    this.name = "ExotelConfigError";
  }
}

const REQUIRED = [
  "EXOTEL_API_KEY",
  "EXOTEL_API_TOKEN",
  "EXOTEL_ACCOUNT_SID",
  "EXOTEL_CALLER_ID",
  "EXOTEL_FLOW_URL",
  "EXOTEL_WEBHOOK_URL",
  "EXOTEL_WEBHOOK_TOKEN",
] as const;

/** Reads the Exotel configuration. Field names (never values) may appear in the error. */
export function exotelConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ExotelConfig {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) throw new ExotelConfigError(missing);

  return {
    accountSid: env.EXOTEL_ACCOUNT_SID!,
    apiKey: env.EXOTEL_API_KEY!,
    apiToken: env.EXOTEL_API_TOKEN!,
    callerId: env.EXOTEL_CALLER_ID!,
    flowUrl: env.EXOTEL_FLOW_URL!,
    webhookUrl: env.EXOTEL_WEBHOOK_URL!,
    webhookToken: env.EXOTEL_WEBHOOK_TOKEN!,
    apiBaseUrl: env.EXOTEL_API_BASE_URL,
  };
}

/**
 * Chooses the telephony provider. `CALL_PROVIDER=exotel` opts in to real calls; anything else uses
 * the log-only provider so local and emulator runs never dial.
 */
export function createCallProvider(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): CallProvider {
  if (env.CALL_PROVIDER !== "exotel") return new LoggingCallProvider();
  return new ExotelCallProvider(exotelConfigFromEnv(env), fetchImpl);
}
