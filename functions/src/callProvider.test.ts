import { LoggingCallProvider, type CallProvider, type CallRequest } from "./callProvider";

describe("LoggingCallProvider", () => {
  const request: CallRequest = {
    parentId: "parent1",
    parentName: "Amma",
    phone: "+919812345678",
    language: "ml-IN",
    timezone: "Asia/Kolkata",
    scheduledFor: 1,
    doseEventIds: ["e1", "e2"],
  };

  it("returns a fake callSid without a network call", async () => {
    const provider = new LoggingCallProvider();
    const handle = await provider.startCall(request);
    expect(handle.callSid).toMatch(/^fake_/);
    expect(provider.name).toBe("logging");
  });

  it("logs ids only, never phone, name or language", async () => {
    const info = jest.spyOn(console, "info").mockImplementation(() => undefined);
    const provider = new LoggingCallProvider();
    await provider.startCall(request);

    const [message, payload] = info.mock.calls[0] as [string, Record<string, unknown>];
    const serialized = `${message} ${JSON.stringify(payload)}`;
    expect(serialized).toContain("parent1");
    expect(serialized).toContain("e1");
    expect(serialized).not.toContain("+919812345678");
    expect(serialized).not.toContain("Amma");
    expect(serialized).not.toContain("ml-IN");
    info.mockRestore();
  });

  it("accepts a custom provider in the dispatcher contract", async () => {
    const provider: CallProvider = { name: "test", startCall: jest.fn().mockResolvedValue({ callSid: "CA1" }) };
    await expect(provider.startCall(request)).resolves.toEqual({ callSid: "CA1" });
  });
});
