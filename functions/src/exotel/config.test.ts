import { LoggingCallProvider } from "../callProvider";
import {
  ExotelConfigError,
  callActivation,
  callsEnabled,
  createCallProvider,
  exotelConfigFromEnv,
} from "./config";
import { ExotelCallProvider } from "./exotelCallProvider";

const ENV = {
  CALL_PROVIDER: "exotel",
  EXOTEL_API_KEY: "key",
  EXOTEL_API_TOKEN: "token",
  EXOTEL_ACCOUNT_SID: "acct",
  EXOTEL_CALLER_ID: "+911111111111",
  EXOTEL_FLOW_URL: "https://my.exotel.com/acct/exoml/start_voice/123",
  EXOTEL_WEBHOOK_URL: "https://example.test/exotelWebhook",
  EXOTEL_WEBHOOK_TOKEN: "secret-token",
};

describe("callActivation and createCallProvider", () => {
  afterEach(() => jest.restoreAllMocks());

  it("is off and returns no provider when CALL_PROVIDER is not set: no fake calls in production", () => {
    expect(callActivation({}).mode).toBe("off");
    expect(createCallProvider({})).toBeNull();
    expect(callsEnabled(callActivation({}))).toBe(false);
  });

  it("is off for any other value, including the old 'logging'", () => {
    for (const value of ["logging", "fake", "", "EXOTEL", "true"]) {
      expect(callActivation({ CALL_PROVIDER: value }).mode).toBe("off");
      expect(createCallProvider({ CALL_PROVIDER: value })).toBeNull();
    }
  });

  it("is on with the Exotel provider when it is opted in and complete", () => {
    expect(callActivation(ENV).mode).toBe("exotel");
    const provider = createCallProvider(ENV);
    expect(provider).toBeInstanceOf(ExotelCallProvider);
    expect(provider?.name).toBe("exotel");
    expect(callsEnabled(callActivation(ENV))).toBe(true);
  });

  it("is off when Exotel is opted in but a setting is missing, and logs only the setting names", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const env = { ...ENV, EXOTEL_API_TOKEN: "", EXOTEL_FLOW_URL: "" };
    expect(callActivation(env).mode).toBe("off");
    expect(createCallProvider(env)).toBeNull();
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain("EXOTEL_API_TOKEN");
    expect(logged).toContain("EXOTEL_FLOW_URL");
    expect(logged).not.toContain("secret-token");
    expect(logged).not.toContain("acct");
  });

  it("uses the log provider only for CALL_PROVIDER=log, and calling counts as on", () => {
    expect(callActivation({ CALL_PROVIDER: "log" }).mode).toBe("log");
    expect(createCallProvider({ CALL_PROVIDER: "log" })).toBeInstanceOf(LoggingCallProvider);
    expect(callsEnabled(callActivation({ CALL_PROVIDER: "log" }))).toBe(true);
  });

  it("reads the go-live cutoff, and ignores one that is not a date", () => {
    expect(callActivation({ ...ENV, CALLS_LIVE_FROM: "2026-12-01T00:00:00+05:30" }).liveFromMs).toBe(
      Date.parse("2026-11-30T18:30:00Z"),
    );
    expect(callActivation(ENV).liveFromMs).toBeNull();
    expect(callActivation({ ...ENV, CALLS_LIVE_FROM: "soon" }).liveFromMs).toBeNull();
  });

  it("fails fast with field names only when a secret is missing", () => {
    const env = { ...ENV, EXOTEL_API_TOKEN: "" };
    expect(() => exotelConfigFromEnv(env)).toThrow(ExotelConfigError);
    try {
      exotelConfigFromEnv(env);
    } catch (error) {
      const message = String((error as Error).message);
      expect(message).toContain("EXOTEL_API_TOKEN");
      expect(message).not.toContain("key");
    }
  });

  it("maps env values to config", () => {
    expect(exotelConfigFromEnv(ENV)).toEqual({
      accountSid: "acct",
      apiKey: "key",
      apiToken: "token",
      callerId: "+911111111111",
      flowUrl: "https://my.exotel.com/acct/exoml/start_voice/123",
      webhookUrl: "https://example.test/exotelWebhook",
      webhookToken: "secret-token",
      apiBaseUrl: undefined,
    });
  });
});
