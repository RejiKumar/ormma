import {
  localClock,
  localDateKey,
  localEventIdSuffix,
  localMinuteOfDay,
  nextDateKey,
  zonedTimeToMs,
} from "./time";

const IST = "Asia/Kolkata";
const NY = "America/New_York";

describe("zonedTimeToMs", () => {
  it("converts IST wall clock to UTC", () => {
    expect(zonedTimeToMs("2026-10-23", "09:00", IST)).toBe(Date.UTC(2026, 9, 23, 3, 30));
  });

  it("converts a US wall clock across both sides of the DST change", () => {
    expect(zonedTimeToMs("2026-03-08", "01:30", NY)).toBe(Date.UTC(2026, 2, 8, 6, 30));
    expect(zonedTimeToMs("2026-03-08", "03:30", NY)).toBe(Date.UTC(2026, 2, 8, 7, 30));
  });

  it("returns null for a wall clock that does not exist", () => {
    expect(zonedTimeToMs("2026-03-08", "02:30", NY)).toBeNull();
  });

  it("round-trips an ambiguous fall-back clock to one of the two real instants", () => {
    const instant = zonedTimeToMs("2026-11-01", "01:30", NY);
    expect(instant).not.toBeNull();
    expect(localClock(instant!, NY)).toBe("01:30");
  });

  it("falls back to Asia/Kolkata for an unknown timezone", () => {
    expect(zonedTimeToMs("2026-10-23", "09:00", "Not/AZone")).toBe(Date.UTC(2026, 9, 23, 3, 30));
  });

  it("rejects malformed dates and clocks", () => {
    expect(zonedTimeToMs("23-10-2026", "09:00", IST)).toBeNull();
    expect(zonedTimeToMs("2026-10-23", "24:00", IST)).toBeNull();
    expect(zonedTimeToMs("2026-10-23", "9:00", IST)).toBeNull();
  });
});

describe("local calendar helpers", () => {
  it("rolls the local date at the IST midnight", () => {
    expect(localDateKey(Date.UTC(2026, 9, 22, 18, 29), IST)).toBe("2026-10-22");
    expect(localDateKey(Date.UTC(2026, 9, 22, 18, 30), IST)).toBe("2026-10-23");
  });

  it("formats the local clock, minute of day and event suffix", () => {
    const instant = Date.UTC(2026, 9, 23, 3, 30);
    expect(localClock(instant, IST)).toBe("09:00");
    expect(localMinuteOfDay(instant, IST)).toBe(540);
    expect(localEventIdSuffix(instant, IST)).toBe("202610230900");
  });

  it("advances date keys across month and year boundaries", () => {
    expect(nextDateKey("2026-10-31")).toBe("2026-11-01");
    expect(nextDateKey("2026-12-31")).toBe("2027-01-01");
    expect(nextDateKey("not-a-date")).toBeNull();
  });
});
