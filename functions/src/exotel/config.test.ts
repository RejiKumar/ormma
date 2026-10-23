import { LoggingCallProvider } from "../callProvider";
import {
  ExotelConfigError,
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

describe("createCallProvider", () => {
  it("defaults to the log-only provider", () => {
    expect(createCallProvider({})).toBeInstanceOf(LoggingCallProvider);
    expect(createCallProvider({ CALL_PROVIDER: "logging" })).toBeInstanceOf(LoggingCallProvider);
  });

  it("builds the Exotel provider when opted in", () => {
    const provider = createCallProvider(ENV);
    expect(provider).toBeInstanceOf(ExotelCallProvider);
    expect(provider.name).toBe("exotel");
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
