import { firstAllowedAt, isQuietAt, isQuietNow, parseClock } from "./quietHours";

const IST = "Asia/Kolkata";
const QUIET = { start: "22:00", end: "06:00" };
const MIDDAY = { start: "13:00", end: "15:00" };

describe("parseClock", () => {
  it("parses valid clocks and rejects malformed values", () => {
    expect(parseClock("00:00")).toBe(0);
    expect(parseClock("22:30")).toBe(1350);
    expect(parseClock("23:59")).toBe(1439);
    expect(parseClock("24:00")).toBeNull();
    expect(parseClock("7:00")).toBeNull();
    expect(parseClock("nope")).toBeNull();
  });
});

describe("isQuietAt", () => {
  it("handles a window that wraps midnight", () => {
    expect(isQuietAt(21 * 60 + 59, QUIET)).toBe(false);
    expect(isQuietAt(22 * 60, QUIET)).toBe(true);
    expect(isQuietAt(23 * 60 + 59, QUIET)).toBe(true);
    expect(isQuietAt(0, QUIET)).toBe(true);
    expect(isQuietAt(5 * 60 + 59, QUIET)).toBe(true);
    expect(isQuietAt(6 * 60, QUIET)).toBe(false);
  });

  it("handles a same-day window", () => {
    expect(isQuietAt(12 * 60 + 59, MIDDAY)).toBe(false);
    expect(isQuietAt(13 * 60, MIDDAY)).toBe(true);
    expect(isQuietAt(14 * 60 + 59, MIDDAY)).toBe(true);
    expect(isQuietAt(15 * 60, MIDDAY)).toBe(false);
  });

  it("treats an empty window as never quiet", () => {
    expect(isQuietAt(12 * 60, { start: "09:00", end: "09:00" })).toBe(false);
  });

  it("falls back to the default window when the policy is malformed", () => {
    expect(isQuietAt(23 * 60, { start: "nope", end: "06:00" })).toBe(true);
  });
});

describe("isQuietNow in the parent timezone", () => {
  it("uses IST rather than the server clock", () => {
    expect(isQuietNow(Date.UTC(2026, 9, 22, 18, 0), IST, QUIET)).toBe(true); // 23:30 IST
    expect(isQuietNow(Date.UTC(2026, 9, 23, 1, 0), IST, QUIET)).toBe(false); // 06:30 IST
  });
});

describe("firstAllowedAt", () => {
  it("returns the same instant when already outside quiet hours", () => {
    const noon = Date.UTC(2026, 9, 23, 6, 30); // 12:00 IST
    expect(firstAllowedAt(noon, IST, QUIET)).toBe(noon);
  });

  it("returns the next local end of the quiet window", () => {
    const late = Date.UTC(2026, 9, 22, 18, 0); // 23:30 IST
    const allowed = firstAllowedAt(late, IST, QUIET);
    expect(allowed - late).toBe(390 * 60_000);
    expect(new Date(allowed).toISOString()).toBe("2026-10-23T00:30:00.000Z");
  });

  it("waits only the remaining minute near the boundary", () => {
    const almost = Date.UTC(2026, 9, 23, 0, 29); // 05:59 IST
    expect(firstAllowedAt(almost, IST, QUIET) - almost).toBe(60_000);
  });
});
