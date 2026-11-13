import type { CallRequest } from "../callProvider";
import type { TwilioConfig } from "./config";
import { TwilioCallProvider, TwilioError, statusUrl, voiceUrl } from "./twilioCallProvider";

const config: TwilioConfig = {
  accountSid: "ACtest123",
  authToken: "auth-token-value",
  fromNumber: "+15005550006",
  publicBaseUrl: "https://asia-south1-demo.cloudfunctions.net",
};

const request: CallRequest = {
  parentId: "parent1",
  parentName: "Amma",
  phone: "+919876543210",
  language: "ml-IN",
  timezone: "Asia/Kolkata",
  scheduledFor: 1_700_000_000_000,
  doseEventIds: ["e1"],
};

const respond = (status: number, body: unknown) =>
  jest.fn(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }));

describe("TwilioCallProvider", () => {
  it("posts the call to Twilio with Basic auth, our TwiML address and the status callback", async () => {
    const fetchImpl = respond(201, { sid: "CA123abc" });
    const provider = new TwilioCallProvider(config, fetchImpl as unknown as typeof fetch);
    const handle = await provider.startCall(request);
    expect(handle).toEqual({ callSid: "CA123abc" });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACtest123/Calls.json");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from("ACtest123:auth-token-value").toString("base64")}`);
    const form = new URLSearchParams(init.body as string);
    expect(form.get("To")).toBe("+919876543210");
    expect(form.get("From")).toBe("+15005550006");
    expect(form.get("Url")).toBe(voiceUrl(config.publicBaseUrl, "greeting", "parent1"));
    expect(form.get("Url")).toBe("https://asia-south1-demo.cloudfunctions.net/twilioVoice?step=greeting&parentId=parent1");
    expect(form.get("StatusCallback")).toBe(statusUrl(config.publicBaseUrl, "parent1"));
    expect(form.getAll("StatusCallbackEvent")).toEqual(["initiated", "ringing", "answered", "completed"]);
    expect(form.get("Method")).toBe("POST");
    expect(Number(form.get("Timeout"))).toBeGreaterThan(0);
  });

  it("uses the configured API host when one is set (tests and emulators)", async () => {
    const fetchImpl = respond(201, { sid: "CA1" });
    await new TwilioCallProvider({ ...config, apiBaseUrl: "http://localhost:9000/" }, fetchImpl as unknown as typeof fetch).startCall(request);
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe("http://localhost:9000/2010-04-01/Accounts/ACtest123/Calls.json");
  });

  it.each([
    ["a non-2xx response", () => respond(401, { message: "bad credentials" }), "http_401"],
    ["a payload without a sid", () => respond(201, { status: "queued" }), "missing_sid"],
    ["a sid that is not a safe id", () => respond(201, { sid: "../x" }), "missing_sid"],
    ["a body that is not JSON", () => respond(201, "<html>"), "invalid_json"],
  ])("throws a coded error for %s", async (_name, make, code) => {
    const provider = new TwilioCallProvider(config, make() as unknown as typeof fetch);
    await expect(provider.startCall(request)).rejects.toMatchObject({ name: "TwilioError", code });
  });

  it("reports a network failure and a timeout as codes", async () => {
    const down = jest.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(new TwilioCallProvider(config, down as unknown as typeof fetch).startCall(request)).rejects.toMatchObject({ code: "network" });
    const slow = jest.fn(async () => {
      throw Object.assign(new Error("x"), { name: "TimeoutError" });
    });
    await expect(new TwilioCallProvider(config, slow as unknown as typeof fetch).startCall(request)).rejects.toMatchObject({ code: "timeout" });
  });

  it("never puts the number, the token or the response body in an error or a log line", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const provider = new TwilioCallProvider(config, respond(400, { message: "invalid To +919876543210" }) as unknown as typeof fetch);
    let caught: unknown;
    try {
      await provider.startCall(request);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(TwilioError);
    const text = `${(caught as Error).message} ${JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])}`;
    expect(text).not.toContain("919876543210");
    expect(text).not.toContain("auth-token-value");
    for (const spy of [log, warn, error]) spy.mockRestore();
  });
});
