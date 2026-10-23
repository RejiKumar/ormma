import type { CallHandle, CallProvider, CallRequest } from "../callProvider";
import type { ExotelConfig } from "./config";

export class ExotelError extends Error {
  constructor(readonly code: string) {
    super(`exotel:${code}`);
    this.name = "ExotelError";
  }
}

const STATUS_PATH = "/Calls/connect";
const DEFAULT_API_BASE = "https://api.exotel.com";
const CALL_TIME_LIMIT_SECONDS = 300;

interface ConnectResponse {
  Call?: { Sid?: unknown };
}

/**
 * Exotel v1 outbound call to a dashboard-configured call flow (Greeting -> Gather -> Passthru).
 * Credentials are only used for the Authorization header; errors carry codes, never PII.
 */
export class ExotelCallProvider implements CallProvider {
  readonly name = "exotel";

  constructor(
    private readonly config: ExotelConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private webhookUrl(kind: "status"): string {
    const separator = this.config.webhookUrl.includes("?") ? "&" : "?";
    return `${this.config.webhookUrl}${separator}token=${encodeURIComponent(
      this.config.webhookToken,
    )}&kind=${kind}`;
  }

  async startCall(request: CallRequest): Promise<CallHandle> {
    const form = new URLSearchParams({
      From: request.phone,
      CallerId: this.config.callerId,
      Url: this.config.flowUrl,
      CallType: "trans",
      TimeLimit: String(CALL_TIME_LIMIT_SECONDS),
      StatusCallback: this.webhookUrl("status"),
      "StatusCallbackEvents[0]": "terminal",
      "StatusCallbackEvents[1]": "answered",
      StatusCallbackContentType: "application/json",
      CustomField: request.parentId,
    });

    const base = (this.config.apiBaseUrl ?? DEFAULT_API_BASE).replace(/\/+$/, "");
    const endpoint = `${base}/v1/Accounts/${encodeURIComponent(this.config.accountSid)}${STATUS_PATH}`;
    const authorization = `Basic ${Buffer.from(
      `${this.config.apiKey}:${this.config.apiToken}`,
    ).toString("base64")}`;

    let response: Response;
    try {
      response = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      const code =
        (error as { name?: string } | null)?.name === "TimeoutError" ? "timeout" : "network";
      throw new ExotelError(code);
    }

    if (!response.ok) throw new ExotelError(`http_${response.status}`);

    let payload: ConnectResponse;
    try {
      payload = (await response.json()) as ConnectResponse;
    } catch {
      throw new ExotelError("invalid_json");
    }

    const sid = payload?.Call?.Sid;
    if (typeof sid !== "string" || sid.length === 0) throw new ExotelError("missing_sid");
    return { callSid: sid };
  }
}
