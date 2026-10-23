import { formatLocalClock, localDateKey, localDayWindow, visibilityRanges } from "./visibility";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

describe("visibilityRanges", () => {
  const start = Date.UTC(2026, 9, 21, 18, 30); // 2026-10-22 00:00 IST
  const end = Date.UTC(2026, 9, 22, 18, 30);

  it("returns the whole window for an owner regardless of consent", () => {
    expect(visibilityRanges("owner", null, start, end)).toEqual([{ gte: start, lt: end }]);
    expect(visibilityRanges("owner", { revokedAt: start - 1 }, start, end)).toEqual([{ gte: start, lt: end }]);
  });

  it("returns the whole window for a non-owner whose consent was never revoked", () => {
    expect(visibilityRanges("viewer", { status: "granted", revokedAt: null, regrantedAt: null }, start, end)).toEqual([
      { gte: start, lt: end },
    ]);
    expect(visibilityRanges("editor", { status: "pending" }, start, end)).toEqual([{ gte: start, lt: end }]);
  });

  it("fails closed for a non-owner with no consent map", () => {
    expect(visibilityRanges("viewer", null, start, end)).toEqual([]);
    expect(visibilityRanges("editor", undefined, start, end)).toEqual([]);
  });

  it("after revocation returns only field < revokedAt, intersected with the window", () => {
    const revokedAt = start + 6 * HOUR;
    expect(visibilityRanges("viewer", { revokedAt, regrantedAt: null }, start, end)).toEqual([
      { gte: start, lt: revokedAt },
    ]);
  });

  it("clamps a past revocation to an empty range (no query)", () => {
    expect(visibilityRanges("viewer", { revokedAt: start }, start, end)).toEqual([]);
    expect(visibilityRanges("viewer", { revokedAt: start - 1 }, start, end)).toEqual([]);
  });

  it("clamps a future revocation to the window end (strict < stays provable)", () => {
    expect(visibilityRanges("viewer", { revokedAt: end + HOUR }, start, end)).toEqual([{ gte: start, lt: end }]);
    expect(visibilityRanges("viewer", { revokedAt: end }, start, end)).toEqual([{ gte: start, lt: end }]);
  });

  it("after a re-grant returns both eras as disjoint ranges", () => {
    const revokedAt = start + 6 * HOUR;
    const regrantedAt = end - 6 * HOUR;
    expect(visibilityRanges("viewer", { revokedAt, regrantedAt }, start, end)).toEqual([
      { gte: start, lt: revokedAt },
      { gte: regrantedAt, lt: end },
    ]);
  });

  it("drops the re-granted branch when the window already starts after it", () => {
    const revokedAt = start - 10 * HOUR;
    const regrantedAt = start + 2 * HOUR;
    expect(visibilityRanges("viewer", { revokedAt, regrantedAt }, start, end)).toEqual([
      { gte: regrantedAt, lt: end },
    ]);
  });

  it("accepts Firestore-like timestamps through toMillis", () => {
    const revokedAt = { toMillis: () => start + HOUR };
    expect(visibilityRanges("viewer", { revokedAt, regrantedAt: null }, start, end)).toEqual([
      { gte: start, lt: start + HOUR },
    ]);
  });
});

describe("localDateKey", () => {
  it("keys the instant in Asia/Kolkata (rolls at 18:30 UTC)", () => {
    expect(localDateKey("Asia/Kolkata", Date.UTC(2026, 9, 21, 20, 0))).toBe("2026-10-22");
    expect(localDateKey("Asia/Kolkata", Date.UTC(2026, 9, 21, 18, 29))).toBe("2026-10-21");
    expect(localDateKey("Asia/Kolkata", Date.UTC(2026, 9, 21, 18, 30))).toBe("2026-10-22");
  });

  it("falls back to Asia/Kolkata when the timezone is unknown", () => {
    expect(localDateKey("Not/AZone", Date.UTC(2026, 9, 21, 20, 0))).toBe("2026-10-22");
  });
});

describe("localDayWindow", () => {
  it("returns the IST day as a UTC half-open range", () => {
    const now = Date.UTC(2026, 9, 21, 20, 0); // 2026-10-22 01:30 IST
    const win = localDayWindow("Asia/Kolkata", now);
    expect(win.dateKey).toBe("2026-10-22");
    expect(win.start).toBe(Date.UTC(2026, 9, 21, 18, 30));
    expect(win.end).toBe(Date.UTC(2026, 9, 22, 18, 30));
    expect(win.end - win.start).toBe(24 * HOUR);
  });

  it("returns consecutive, non-overlapping days", () => {
    const a = localDayWindow("Asia/Kolkata", Date.UTC(2026, 9, 21, 12, 0));
    const b = localDayWindow("Asia/Kolkata", Date.UTC(2026, 9, 22, 12, 0));
    expect(a.end).toBe(b.start);
    expect(b.dateKey).toBe("2026-10-22");
  });

  it("handles a UTC timezone", () => {
    const win = localDayWindow("UTC", Date.UTC(2026, 9, 21, 12, 0));
    expect(win.start).toBe(Date.UTC(2026, 9, 21, 0, 0));
    expect(win.end).toBe(Date.UTC(2026, 9, 22, 0, 0));
  });

  it("falls back to a fixed IST window when Intl formatting fails", () => {
    const spy = jest.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new Error("no icu");
    });
    try {
      const now = Date.UTC(2026, 9, 21, 20, 0);
      const win = localDayWindow("Asia/Kolkata", now);
      expect(win.dateKey).toBe("2026-10-22");
      expect(win.start).toBe(Date.UTC(2026, 9, 21, 18, 30));
      expect(win.end - win.start).toBe(24 * HOUR);
    } finally {
      spy.mockRestore();
    }
  });

  it("a window is always positive and now sits inside it", () => {
    for (const now of [0, Date.UTC(2026, 0, 1), Date.UTC(2026, 11, 31, 23, 59), 1_700_000_000_000]) {
      const win = localDayWindow("Asia/Kolkata", now);
      expect(win.start).toBeLessThan(win.end);
      expect(now).toBeGreaterThanOrEqual(win.start);
      expect(now).toBeLessThan(win.end);
    }
  });
});

describe("formatLocalClock", () => {
  it("formats an instant as HH:mm in Asia/Kolkata", () => {
    expect(formatLocalClock("Asia/Kolkata", Date.UTC(2026, 9, 21, 20, 35))).toBe("02:05");
    expect(formatLocalClock("Asia/Kolkata", Date.UTC(2026, 9, 21, 18, 30))).toBe("00:00");
  });

  it("formats in UTC", () => {
    expect(formatLocalClock("UTC", Date.UTC(2026, 9, 21, 5, 4))).toBe("05:04");
  });

  it("falls back to the IST offset when Intl throws", () => {
    const spy = jest.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new Error("no icu");
    });
    try {
      expect(formatLocalClock("Asia/Kolkata", Date.UTC(2026, 9, 21, 20, 35))).toBe("02:05");
    } finally {
      spy.mockRestore();
    }
  });
});
