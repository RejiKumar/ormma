import { buildDigestText, clock12, dayLabel, groupCards, periodName, type DigestEvent } from "./digestText";

const TZ = "Asia/Kolkata";
// Mon 2026-10-19 at the given IST time, as epoch ms.
const ist = (hour: number, minute = 0) => Date.UTC(2026, 9, 19, hour, minute) - 330 * 60_000;
const ev = (h: number, m: number, status: string, medicine: string, taken?: [number, number]): DigestEvent => ({
  scheduledForMs: ist(h, m),
  resolvedAtMs: taken ? ist(taken[0], taken[1]) : null,
  status,
  medicine,
});

describe("format helpers", () => {
  it("names periods", () => {
    expect([4, 5, 11, 12, 16, 17, 20, 21, 23].map(periodName)).toEqual([
      "Night",
      "Morning",
      "Morning",
      "Afternoon",
      "Afternoon",
      "Evening",
      "Evening",
      "Night",
      "Night",
    ]);
  });

  it("formats clock and day in the parent's timezone", () => {
    expect(clock12(ist(8, 34), TZ)).toBe("8:34 AM");
    expect(clock12(ist(0, 5), TZ)).toBe("12:05 AM");
    expect(clock12(ist(13, 36), TZ)).toBe("1:36 PM");
    expect(dayLabel(ist(20), TZ)).toBe("Mon 19 Oct");
  });

  it("groups events at one time into one card with medicines joined", () => {
    const cards = groupCards([
      ev(8, 30, "taken", "Metformin 500mg", [8, 34]),
      ev(8, 30, "taken", "Amlodipine 5mg", [8, 34]),
      ev(21, 0, "pending", "Atorvastatin 10mg"),
    ]);
    expect(cards).toHaveLength(2);
    expect(cards[0].medicines).toBe("Metformin 500mg + Amlodipine 5mg");
    expect(cards[0].taken).toBe(true);
    expect(cards[1].pending).toBe(true);
  });
});

describe("buildDigestText", () => {
  it("matches the prototype wording when the day is on track", () => {
    const text = buildDigestText({
      name: "Amma",
      nowMs: ist(18),
      timeZone: TZ,
      events: [
        ev(8, 30, "taken", "Metformin 500mg", [8, 34]),
        ev(13, 30, "taken", "Metformin 500mg", [13, 36]),
        ev(21, 0, "pending", "Atorvastatin 10mg"),
      ],
    });
    expect(text).toBe(
      [
        "Ormma update, Mon 19 Oct",
        "Amma is on track: 2 of 3 doses confirmed.",
        "Morning dose taken at 8:34 AM.",
        "Next: Atorvastatin 10mg at 9:00 PM.",
      ].join("\n"),
    );
  });

  it("names the time of a dose that was not confirmed and asks the family to check in", () => {
    const text = buildDigestText({
      name: "Amma",
      nowMs: ist(20),
      timeZone: TZ,
      events: [ev(8, 30, "missed", "Metformin 500mg"), ev(13, 30, "no_answer", "Metformin 500mg")],
    }) as string;
    expect(text).toContain("Amma has not confirmed 2 doses: 8:30 AM, 1:30 PM. Please check in.");
    expect(text).not.toMatch(/because|should|safe|normal|dangerous/i);
  });

  it("is null with no doses and carries no confirmation notes", () => {
    expect(buildDigestText({ name: "Amma", nowMs: ist(20), timeZone: TZ, events: [] })).toBeNull();
  });
});
