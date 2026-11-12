import { fromE164India, isValidE164, isValidIndiaMobile, nextIndiaDigits, toE164India } from "./phone";

describe("Indian mobile numbers", () => {
  it("accepts exactly 10 digits starting with 6, 7, 8 or 9", () => {
    for (const ok of ["6000000000", "7871458828", "8157807124", "9567507349", "9187654321"]) {
      expect(isValidIndiaMobile(ok)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    for (const bad of ["", "98765", "98765432", "98765432101", "5876543210", "0987654321", "98765abc10", "+919876543210"]) {
      expect(isValidIndiaMobile(bad)).toBe(false);
    }
  });

  it("adds +91 to make an E.164 number and removes it again", () => {
    expect(toE164India("9876543210")).toBe("+919876543210");
    expect(isValidE164(toE164India("9876543210"))).toBe(true);
    expect(fromE164India("+919876543210")).toBe("9876543210");
    expect(fromE164India("+14155550100")).toBe("4155550100");
  });
});

describe("nextIndiaDigits", () => {
  it("keeps digits only while typing and stops at 10", () => {
    expect(nextIndiaDigits("", "9")).toBe("9");
    expect(nextIndiaDigits("98", "98a")).toBe("98");
    expect(nextIndiaDigits("9876543210", "98765432101")).toBe("9876543210");
  });

  it("does not eat a number that really starts with 91 while it is typed one key at a time", () => {
    let value = "";
    for (const key of "9187654321") value = nextIndiaDigits(value, value + key);
    expect(value).toBe("9187654321");
  });

  it("cleans a pasted number: +91, 91 and a leading 0 are dropped", () => {
    expect(nextIndiaDigits("", "+91 98765 43210")).toBe("9876543210");
    expect(nextIndiaDigits("", "919876543210")).toBe("9876543210");
    expect(nextIndiaDigits("", "09876543210")).toBe("9876543210");
    expect(nextIndiaDigits("", "98765 43210")).toBe("9876543210");
  });
});
