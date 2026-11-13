import { defineSecret } from "firebase-functions/params";

// Firebase secrets (Secret Manager). Values never live in source or git.
export const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
export const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
export const TWILIO_FROM_NUMBER = defineSecret("TWILIO_FROM_NUMBER");

export const TWILIO_SECRETS = [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER];

/** Secrets for the HTTPS functions Twilio calls back (the signature is keyed by the auth token). */
export const TWILIO_CALLBACK_SECRETS = [TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID];

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  /** The Twilio number calls come from (E.164). Twilio can call India only from a non-Indian number. */
  fromNumber: string;
  /** The public https address of the functions, without a trailing slash. Signatures are computed on it. */
  publicBaseUrl: string;
  /** Test override only; defaults to Twilio's API host. */
  apiBaseUrl?: string;
}

export class TwilioConfigError extends Error {
  constructor(readonly missing: string[]) {
    super(`twilio_config_missing:${missing.join(",")}`);
    this.name = "TwilioConfigError";
  }
}

const REQUIRED = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER", "TWILIO_PUBLIC_BASE_URL"] as const;

/** Reads the Twilio configuration. Setting names (never values) may appear in the error. */
export function twilioConfigFromEnv(env: NodeJS.ProcessEnv = process.env): TwilioConfig {
  const missing: string[] = REQUIRED.filter((key) => !env[key]);
  // The public address must be https: Twilio only calls https addresses and signs the exact URL.
  if (!missing.includes("TWILIO_PUBLIC_BASE_URL") && !/^https:\/\/[^/\s]+/.test(env.TWILIO_PUBLIC_BASE_URL as string)) {
    missing.push("TWILIO_PUBLIC_BASE_URL");
  }
  if (missing.length > 0) throw new TwilioConfigError(missing);
  return {
    accountSid: env.TWILIO_ACCOUNT_SID!,
    authToken: env.TWILIO_AUTH_TOKEN!,
    fromNumber: env.TWILIO_FROM_NUMBER!,
    publicBaseUrl: env.TWILIO_PUBLIC_BASE_URL!.replace(/\/+$/, ""),
    apiBaseUrl: env.TWILIO_API_BASE_URL,
  };
}
