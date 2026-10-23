import type { CallRequest } from "../callProvider";
import type { ExotelConfig } from "./config";
import { ExotelCallProvider, ExotelError } from "./exotelCallProvider";

const CONFIG: ExotelConfig = {
  accountSid: "acct_1",
  apiKey: "api-key",
  apiToken: "api-token",
  callerId: "+911111111111",
  flowUrl: "https://my.exotel.com/acct_1/exoml/start_voice/42",
  webhookUrl: "https://example.test/exotelWebhook",
  webhookToken: "tok en",
  apiBaseUrl: "https://api.example.test/",
};

const REQUEST: CallRequest = {
  parentId: "parent_1",
  parentName: "Amma",
  phone: "+919812345678",
  language: "ml-IN",
  timezone: "Asia/Kolkata",
  scheduledFor: Date.UTC(2026, 9, 23, 3, 30),
  doseEventIds: ["e1", "e2"],
};

const okResponse = (payload: unknown = { Call: { Sid: "CA123" } }): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => payload,
  }) as unknown as Response;

describe("ExotelCallProvider", () => {
  it("posts the documented form fields with Basic auth", async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse());
    const provider = new ExotelCallProvider(CONFIG, fetchMock as unknown as typeof fetch);

    await expect(provider.startCall(REQUEST)).resolves.toEqual({ callSid: "CA123" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.test/v1/Accounts/acct_1/Calls/connect");
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(Buffer.from(headers.Authorization.replace("Basic ", ""), "base64").toString()).toBe(
      "api-key:api-token",
    );

    const body = new URLSearchParams(init.body as string);
    expect(body.get("From")).toBe("+919812345678");
    expect(body.get("CallerId")).toBe("+911111111111");
    expect(body.get("Url")).toBe(CONFIG.flowUrl);
    expect(body.get("CallType")).toBe("trans");
    expect(body.get("StatusCallbackEvents[0]")).toBe("terminal");
    expect(body.get("StatusCallbackEvents[1]")).toBe("answered");
    expect(body.get("StatusCallbackContentType")).toBe("application/json");
    expect(body.get("CustomField")).toBe("parent_1");
    expect(body.get("StatusCallback")).toBe(
      "https://example.test/exotelWebhook?token=tok%20en&kind=status",
    );
  });

  it("appends the token correctly when the webhook URL already has a query", async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse());
    const provider = new ExotelCallProvider(
      { ...CONFIG, webhookUrl: "https://example.test/hook?env=dev" },
      fetchMock as unknown as typeof fetch,
    );
    await provider.startCall(REQUEST);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("StatusCallback")).toBe(
      "https://example.test/hook?env=dev&token=tok%20en&kind=status",
    );
  });

  it("throws coded errors for HTTP failures without leaking request data", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({}),
    } as unknown as Response);
    const provider = new ExotelCallProvider(CONFIG, fetchMock as unknown as typeof fetch);

    await expect(provider.startCall(REQUEST)).rejects.toMatchObject({ code: "http_502" });
    try {
      await provider.startCall(REQUEST);
    } catch (error) {
      expect((error as Error).message).toBe("exotel:http_502");
      expect((error as Error).message).not.toContain("+919812345678");
    }
  });

  it("throws for invalid JSON, a missing sid and network/timeout failures", async () => {
    const invalidJson = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad");
      },
    } as unknown as Response);
    await expect(
      new ExotelCallProvider(CONFIG, invalidJson as unknown as typeof fetch).startCall(REQUEST),
    ).rejects.toBeInstanceOf(ExotelError);

    const noSid = jest.fn().mockResolvedValue(okResponse({ Call: {} }));
    await expect(
      new ExotelCallProvider(CONFIG, noSid as unknown as typeof fetch).startCall(REQUEST),
    ).rejects.toMatchObject({ code: "missing_sid" });

    const offline = jest.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(
      new ExotelCallProvider(CONFIG, offline as unknown as typeof fetch).startCall(REQUEST),
    ).rejects.toMatchObject({ code: "network" });

    const timeout = jest.fn().mockRejectedValue(Object.assign(new Error(), { name: "TimeoutError" }));
    await expect(
      new ExotelCallProvider(CONFIG, timeout as unknown as typeof fetch).startCall(REQUEST),
    ).rejects.toMatchObject({ code: "timeout" });
  });
});
