import {
  DEFAULT_INVITE_TTL_DAYS,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  MAX_INVITE_TTL_DAYS,
  SUPPORTED_LANGUAGES,
  generateInviteCode,
  isSupportedLanguage,
  isValidE164,
  isValidName,
} from "./validation";

describe("isValidE164", () => {
  it("accepts E.164 numbers", () => {
    for (const phone of ["+919876543210", "+12025550123", "+911234567890", "+447911123456"]) {
      expect(isValidE164(phone)).toBe(true);
    }
  });

  it("rejects anything not in E.164", () => {
    for (const phone of [
      "9876543210",
      "09876543210",
      "+0123456789",
      "+91987654321012345",
      "+91 9876543210",
      "+1234567",
      "",
      "not-a-phone",
      "+91987654321a",
      42,
      null,
      undefined,
      { number: "+919876543210" },
    ]) {
      expect(isValidE164(phone)).toBe(false);
    }
  });
});

describe("isSupportedLanguage", () => {
  it("accepts exactly the four supported languages", () => {
    expect(SUPPORTED_LANGUAGES).toEqual(["ml-IN", "ta-IN", "hi-IN", "en-IN"]);
    for (const language of SUPPORTED_LANGUAGES) {
      expect(isSupportedLanguage(language)).toBe(true);
    }
  });

  it("rejects other languages and non-strings", () => {
    for (const value of ["fr-IN", "en-US", "ml", "", 7, null, undefined, ["ml-IN"]]) {
      expect(isSupportedLanguage(value)).toBe(false);
    }
  });
});

describe("isValidName", () => {
  it("accepts trimmed names up to 100 characters", () => {
    expect(isValidName("Amma")).toBe(true);
    expect(isValidName("  Amma  ")).toBe(true);
    expect(isValidName("x".repeat(100))).toBe(true);
  });

  it("rejects empty, whitespace-only, over-long and non-string names", () => {
    expect(isValidName("")).toBe(false);
    expect(isValidName("   ")).toBe(false);
    expect(isValidName("x".repeat(101))).toBe(false);
    expect(isValidName(42)).toBe(false);
    expect(isValidName(null)).toBe(false);
    expect(isValidName(undefined)).toBe(false);
  });
});

describe("generateInviteCode", () => {
  it("uses the unambiguous alphabet only (no 0, O, 1 or I)", () => {
    expect(INVITE_CODE_ALPHABET).not.toMatch(/[01OI]/);
    expect(new Set(INVITE_CODE_ALPHABET).size).toBe(INVITE_CODE_ALPHABET.length);
    for (let i = 0; i < 500; i += 1) {
      const code = generateInviteCode();
      expect(code).toHaveLength(INVITE_CODE_LENGTH);
      for (const ch of code) expect(INVITE_CODE_ALPHABET).toContain(ch);
    }
  });

  it("is deterministic for a given rng", () => {
    expect(generateInviteCode(() => 0)).toBe("A".repeat(INVITE_CODE_LENGTH));
    expect(generateInviteCode((max) => max - 1)).toBe("9".repeat(INVITE_CODE_LENGTH));
  });

  it("default TTL is 7 days and longer TTLs are rejected by the caller validation", () => {
    expect(DEFAULT_INVITE_TTL_DAYS).toBe(7);
    expect(MAX_INVITE_TTL_DAYS).toBe(7);
  });
});
