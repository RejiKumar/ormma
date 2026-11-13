import { createHmac, timingSafeEqual } from "node:crypto";

export type TwilioParams = Record<string, string | string[]>;

/**
 * Twilio's request signature: base64 HMAC-SHA1, keyed by the auth token, of the full public URL
 * followed by each POST parameter name and value, parameters sorted by name. A parameter with several
 * values contributes each value, sorted, after its name.
 */
export function computeTwilioSignature(authToken: string, url: string, params: TwilioParams): string {
  let data = url;
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (Array.isArray(value)) {
      for (const each of [...value].sort()) data += key + each;
    } else {
      data += key + value;
    }
  }
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

/** Constant-time check. A missing token or signature always fails closed. */
export function validateTwilioSignature(
  authToken: string | undefined,
  signature: string | null | undefined,
  url: string,
  params: TwilioParams,
): boolean {
  if (!authToken || !signature) return false;
  const expected = Buffer.from(computeTwilioSignature(authToken, url, params), "utf8");
  const provided = Buffer.from(signature, "utf8");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}
