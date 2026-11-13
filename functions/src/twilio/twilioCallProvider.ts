import type { CallHandle, CallProvider, CallRequest } from "../callProvider";
import type { TwilioConfig } from "./config";

export class TwilioError extends Error {
  constructor(readonly code: string) {
    super(`twilio:${code}`);
    this.name = "TwilioError";
  }
}

const DEFAULT_API_BASE = "https://api.twilio.com";
const CALL_TIME_LIMIT_SECONDS = 300;
const RING_TIMEOUT_SECONDS = 30;

/** The callback addresses Twilio is given. The parent id and step travel here, covered by the signature. */
export const voiceUrl = (publicBaseUrl: string, step: string, parentId: string): string =>
  `${publicBaseUrl}/twilioVoice?step=${encodeURIComponent(step)}&parentId=${encodeURIComponent(parentId)}`;
export const statusUrl = (publicBaseUrl: string, parentId: string): string =>
  `${publicBaseUrl}/twilioStatus?parentId=${encodeURIComponent(parentId)}`;

/**
 * Twilio outbound call. Twilio fetches TwiML from `twilioVoice` once the parent answers, so there is no
 * flow to build in a dashboard. Credentials are only used for the Authorization header; errors carry
 * codes, never numbers or tokens.
 */
export class TwilioCallProvider implements CallProvider {
  readonly name = "twilio";

  constructor(
    private readonly config: TwilioConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async startCall(request: CallRequest): Promise<CallHandle> {
    const form = new URLSearchParams();
    form.set("To", request.phone);
    form.set("From", this.config.fromNumber);
    form.set("Url", voiceUrl(this.config.publicBaseUrl, "greeting", request.parentId));
    form.set("Method", "POST");
    form.set("StatusCallback", statusUrl(this.config.publicBaseUrl, request.parentId));
    form.set("StatusCallbackMethod", "POST");
    for (const event of ["initiated", "ringing", "answered", "completed"]) form.append("StatusCallbackEvent", event);
    form.set("Timeout", String(RING_TIMEOUT_SECONDS));
    form.set("TimeLimit", String(CALL_TIME_LIMIT_SECONDS));

    const base = (this.config.apiBaseUrl ?? DEFAULT_API_BASE).replace(/\/+$/, "");
    const endpoint = `${base}/2010-04-01/Accounts/${encodeURIComponent(this.config.accountSid)}/Calls.json`;
    const authorization = `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString("base64")}`;

    let response: Response;
    try {
      response = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: { Authorization: authorization, "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      const code = (error as { name?: string } | null)?.name === "TimeoutError" ? "timeout" : "network";
      throw new TwilioError(code);
    }

    if (!response.ok) throw new TwilioError(`http_${response.status}`);

    let payload: { sid?: unknown };
    try {
      payload = (await response.json()) as { sid?: unknown };
    } catch {
      throw new TwilioError("invalid_json");
    }
    const sid = payload?.sid;
    if (typeof sid !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(sid)) throw new TwilioError("missing_sid");
    return { callSid: sid };
  }
}
