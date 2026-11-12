import type { CallableRequest } from "firebase-functions/v2/https";
import { getCallStatusHandler } from "./callStatus";

const signedIn = { auth: { uid: "u1" }, data: {} } as unknown as CallableRequest<unknown>;
const signedOut = { data: {} } as unknown as CallableRequest<unknown>;

describe("getCallStatusHandler", () => {
  it("answers on when calling is on, and nothing else", async () => {
    const result = await getCallStatusHandler(signedIn, { mode: "exotel", liveFromMs: 1_700_000_000_000 });
    expect(result).toEqual({ callsEnabled: true });
    expect(Object.keys(result)).toEqual(["callsEnabled"]);
  });

  it("answers on for the test provider", async () => {
    expect(await getCallStatusHandler(signedIn, { mode: "log", liveFromMs: null })).toEqual({ callsEnabled: true });
  });

  it("answers off when calling is off, without revealing the cutoff or the provider", async () => {
    const result = await getCallStatusHandler(signedIn, { mode: "off", liveFromMs: 1_700_000_000_000 });
    expect(result).toEqual({ callsEnabled: false });
    expect(JSON.stringify(result)).not.toMatch(/exotel|log|1700000000000/);
  });

  it("refuses a caller who is not signed in", async () => {
    await expect(getCallStatusHandler(signedOut, { mode: "exotel", liveFromMs: null })).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("reads the environment by default: off when nothing is configured", async () => {
    const previous = { ...process.env };
    delete process.env.CALL_PROVIDER;
    try {
      expect(await getCallStatusHandler(signedIn)).toEqual({ callsEnabled: false });
    } finally {
      process.env = previous;
    }
  });
});
