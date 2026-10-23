import {
  classifyTerminalStatus,
  isAuthorized,
  isTerminalSession,
  normalizeDigits,
  normalizeValue,
  parseStatusPayload,
} from "./webhook";

describe("isAuthorized", () => {
  it("accepts only an exact, non-empty match", () => {
    expect(isAuthorized("secret", "secret")).toBe(true);
    expect(isAuthorized("secre", "secret")).toBe(false);
    expect(isAuthorized("secret", "secrey")).toBe(false);
    expect(isAuthorized("", "secret")).toBe(false);
    expect(isAuthorized("secret", "")).toBe(false);
    expect(isAuthorized(null, "secret")).toBe(false);
  });
});

describe("normalizeValue", () => {
  it("takes scalars and the first array entry", () => {
    expect(normalizeValue("a")).toBe("a");
    expect(normalizeValue(["a", "b"])).toBe("a");
    expect(normalizeValue([])).toBeNull();
    expect(normalizeValue(42)).toBeNull();
  });
});

describe("normalizeDigits", () => {
  it("maps the documented DTMF keys", () => {
    expect(normalizeDigits("1")).toEqual({ digits: "1", action: "taken" });
    expect(normalizeDigits("2")).toEqual({ digits: "2", action: "not_taken" });
    expect(normalizeDigits("9")).toEqual({ digits: "9", action: "revoke" });
    expect(normalizeDigits("4")).toEqual({ digits: "4", action: "unclear" });
  });

  it("tolerates Exotel's quoted values and treats blanks as no input", () => {
    expect(normalizeDigits('"2"')).toEqual({ digits: "2", action: "not_taken" });
    expect(normalizeDigits(" 1 ")).toEqual({ digits: "1", action: "taken" });
    expect(normalizeDigits("")).toEqual({ digits: null, action: "empty" });
    expect(normalizeDigits(undefined)).toEqual({ digits: null, action: "empty" });
    expect(normalizeDigits("   ")).toEqual({ digits: null, action: "empty" });
  });

  it("uses the first digit when a gather returns more than one", () => {
    expect(normalizeDigits("12")).toEqual({ digits: "1", action: "taken" });
  });
});

describe("classifyTerminalStatus", () => {
  it("separates a dropped script from an unanswered call", () => {
    expect(classifyTerminalStatus("completed", true, false)).toBe("failed");
    expect(classifyTerminalStatus("completed", false, false)).toBe("completed");
    expect(classifyTerminalStatus("completed", true, true)).toBe("completed");
    expect(classifyTerminalStatus("failed", true, false)).toBe("failed");
    expect(classifyTerminalStatus("no-answer", false, false)).toBe("no_answer");
    expect(classifyTerminalStatus("busy", false, false)).toBe("no_answer");
    expect(classifyTerminalStatus("canceled", false, false)).toBe("no_answer");
    expect(classifyTerminalStatus("ringing", false, false)).toBeNull();
  });

  it("recognises terminal sessions", () => {
    expect(isTerminalSession("completed")).toBe(true);
    expect(isTerminalSession("failed")).toBe(true);
    expect(isTerminalSession("no_answer")).toBe(true);
    expect(isTerminalSession("initiated")).toBe(false);
    expect(isTerminalSession("answered")).toBe(false);
  });
});

describe("parseStatusPayload", () => {
  const VALID = {
    CallSid: "CA_123",
    CustomField: "parent_1",
    Status: "completed",
    EventType: "terminal",
  };

  it("parses the documented callback fields", () => {
    expect(parseStatusPayload(VALID)).toEqual({
      callSid: "CA_123",
      parentId: "parent_1",
      status: "completed",
      eventType: "terminal",
    });
  });

  it("parses JSON strings and single-entry arrays", () => {
    expect(parseStatusPayload(JSON.stringify(VALID))?.callSid).toBe("CA_123");
    expect(
      parseStatusPayload({
        CallSid: ["CA_123"],
        CustomField: ["parent_1"],
        Status: ["no-answer"],
        EventType: ["terminal"],
      })?.status,
    ).toBe("no-answer");
  });

  it("accepts an answered event whose status is not terminal", () => {
    expect(
      parseStatusPayload({ ...VALID, Status: "answered", EventType: "answered" }),
    ).toMatchObject({ status: "answered", eventType: "answered" });
  });

  it("rejects malformed or unsafe payloads", () => {
    expect(parseStatusPayload("not-json")).toBeNull();
    expect(parseStatusPayload(null)).toBeNull();
    expect(parseStatusPayload({ ...VALID, CallSid: "has space" })).toBeNull();
    expect(parseStatusPayload({ ...VALID, CallSid: "a".repeat(65) })).toBeNull();
    expect(parseStatusPayload({ ...VALID, CustomField: undefined })).toBeNull();
    expect(parseStatusPayload({ ...VALID, Status: "ringing" })).toBeNull();
    expect(parseStatusPayload({ ...VALID, EventType: 7 })).toMatchObject({ eventType: null });
  });
});
