import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LoggingCallProvider } from "../callProvider";
import { CALL_SECRETS, EXOTEL_SECRETS, callActivation, callsEnabled, createCallProvider } from "../exotel/config";
import { ExotelCallProvider } from "../exotel/exotelCallProvider";
import { TWILIO_SECRETS, TwilioConfigError, twilioConfigFromEnv } from "./config";
import { TwilioCallProvider } from "./twilioCallProvider";

const TWILIO_ENV = {
  CALL_PROVIDER: "twilio",
  TWILIO_ACCOUNT_SID: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  TWILIO_AUTH_TOKEN: "token-value",
  TWILIO_FROM_NUMBER: "+15005550006",
  TWILIO_PUBLIC_BASE_URL: "https://asia-south1-demo.cloudfunctions.net/",
} as NodeJS.ProcessEnv;

const EXOTEL_ENV = {
  CALL_PROVIDER: "exotel",
  EXOTEL_API_KEY: "k",
  EXOTEL_API_TOKEN: "t",
  EXOTEL_ACCOUNT_SID: "s",
  EXOTEL_CALLER_ID: "c",
  EXOTEL_FLOW_URL: "https://flow.example/1",
  EXOTEL_WEBHOOK_URL: "https://hook.example/w",
  EXOTEL_WEBHOOK_TOKEN: "w",
} as NodeJS.ProcessEnv;

describe("twilioConfigFromEnv", () => {
  it("reads a complete configuration and trims the trailing slash of the public address", () => {
    expect(twilioConfigFromEnv(TWILIO_ENV)).toMatchObject({
      accountSid: TWILIO_ENV.TWILIO_ACCOUNT_SID,
      fromNumber: "+15005550006",
      publicBaseUrl: "https://asia-south1-demo.cloudfunctions.net",
    });
  });

  it("names every missing setting and never a value", () => {
    try {
      twilioConfigFromEnv({ CALL_PROVIDER: "twilio", TWILIO_AUTH_TOKEN: "secret-value" } as NodeJS.ProcessEnv);
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TwilioConfigError);
      const e = error as TwilioConfigError;
      expect(e.missing).toEqual(["TWILIO_ACCOUNT_SID", "TWILIO_FROM_NUMBER", "TWILIO_PUBLIC_BASE_URL"]);
      expect(e.message).not.toContain("secret-value");
    }
  });

  it("refuses a public address that is not https", () => {
    expect(() => twilioConfigFromEnv({ ...TWILIO_ENV, TWILIO_PUBLIC_BASE_URL: "http://example.com" })).toThrow(TwilioConfigError);
    expect(() => twilioConfigFromEnv({ ...TWILIO_ENV, TWILIO_PUBLIC_BASE_URL: "not a url" })).toThrow(TwilioConfigError);
  });
});

describe("callActivation with Twilio", () => {
  it("is on, in twilio mode, with a complete Twilio configuration", () => {
    expect(callActivation(TWILIO_ENV).mode).toBe("twilio");
    expect(callsEnabled(callActivation(TWILIO_ENV))).toBe(true);
    expect(createCallProvider(TWILIO_ENV)).toBeInstanceOf(TwilioCallProvider);
  });

  it("is off when a Twilio setting is missing, and logs only the names once", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const incomplete = { ...TWILIO_ENV, TWILIO_AUTH_TOKEN: undefined } as NodeJS.ProcessEnv;
    expect(callActivation(incomplete).mode).toBe("off");
    expect(createCallProvider(incomplete)).toBeNull();
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain("TWILIO_AUTH_TOKEN");
    expect(logged).not.toContain(TWILIO_ENV.TWILIO_ACCOUNT_SID as string);
    warn.mockRestore();
  });

  it("is off when only the other provider's settings are present", () => {
    expect(callActivation({ ...EXOTEL_ENV, CALL_PROVIDER: "twilio" } as NodeJS.ProcessEnv).mode).toBe("off");
    expect(callActivation({ ...TWILIO_ENV, CALL_PROVIDER: "exotel" } as NodeJS.ProcessEnv).mode).toBe("off");
  });

  it("uses exactly one real provider, and never the log provider as a fallback", () => {
    expect(createCallProvider(EXOTEL_ENV)).toBeInstanceOf(ExotelCallProvider);
    expect(createCallProvider({ ...TWILIO_ENV, CALL_PROVIDER: "log" } as NodeJS.ProcessEnv)).toBeInstanceOf(LoggingCallProvider);
    expect(createCallProvider({ ...TWILIO_ENV, CALL_PROVIDER: undefined } as NodeJS.ProcessEnv)).toBeNull();
  });

  it("keeps the cutoff for Twilio too", () => {
    const live = callActivation({ ...TWILIO_ENV, CALLS_LIVE_FROM: "2026-12-01T09:00:00+05:30" } as NodeJS.ProcessEnv);
    expect(live.liveFromMs).toBe(Date.parse("2026-12-01T09:00:00+05:30"));
  });
});

describe("secrets on the call-related functions", () => {
  it("CALL_SECRETS covers both providers", () => {
    for (const secret of [...EXOTEL_SECRETS, ...TWILIO_SECRETS]) expect(CALL_SECRETS).toContain(secret);
  });

  it("every function that read the Exotel secrets reads the call secrets, so Twilio settings reach them", () => {
    const index = readFileSync(join(__dirname, "..", "index.ts"), "utf8");
    expect(index).not.toMatch(/secrets: EXOTEL_SECRETS/);
    expect(index.match(/secrets: CALL_SECRETS/g)?.length).toBe(6);
  });
});
