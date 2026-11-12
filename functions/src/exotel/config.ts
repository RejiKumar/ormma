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
 * "exotel": real calls. "log": the test provider (`CALL_PROVIDER=log`, tests and emulators), calling
 * is on but nothing is dialled. "off": production without a complete Exotel set-up; every scheduled
 * function pauses quietly (go-live-calls: call-activation spec).
 */
export type CallMode = "exotel" | "log" | "off";

export interface CallActivation {
  mode: CallMode;
  /** Doses scheduled before this instant (ms) are never dispatched or alerted. Null: no cutoff. */
  liveFromMs: number | null;
}

let reportedMissing = "";

/**
 * The one place that decides whether calling is on. Real calls need `CALL_PROVIDER=exotel` and a
 * complete Exotel configuration; anything else is off. Never falls back to the log provider. Logs
 * the names of missing settings (never values), once per distinct set.
 */
export function callActivation(env: NodeJS.ProcessEnv = process.env): CallActivation {
  const liveFrom = env.CALLS_LIVE_FROM ? Date.parse(env.CALLS_LIVE_FROM) : Number.NaN;
  const liveFromMs = Number.isFinite(liveFrom) ? liveFrom : null;

  if (env.CALL_PROVIDER === "log") return { mode: "log", liveFromMs };
  if (env.CALL_PROVIDER !== "exotel") return { mode: "off", liveFromMs };
  try {
    exotelConfigFromEnv(env);
    return { mode: "exotel", liveFromMs };
  } catch (error) {
    if (error instanceof ExotelConfigError) {
      const names = error.missing.join(",");
      if (names !== reportedMissing) {
        reportedMissing = names;
        console.warn("callActivation: calling is off, exotel settings missing", { missing: error.missing });
      }
      return { mode: "off", liveFromMs };
    }
    throw error;
  }
}

export const callsEnabled = (activation: CallActivation): boolean => activation.mode !== "off";

/**
 * Chooses the telephony provider, or null when calling is off. Never returns the log-only provider
 * unless `CALL_PROVIDER=log`, so production cannot record fake calls.
 */
export function createCallProvider(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): CallProvider | null {
  const { mode } = callActivation(env);
  if (mode === "exotel") return new ExotelCallProvider(exotelConfigFromEnv(env), fetchImpl);
  if (mode === "log") return new LoggingCallProvider();
  return null;
}
