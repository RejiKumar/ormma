import { zonedTimeToMs } from "./time";
import { planDoseEvents, type PlannableMedicine } from "./generate";

const IST = "Asia/Kolkata";

const medicine = (overrides: Partial<PlannableMedicine> = {}): PlannableMedicine => ({
  id: "med1",
  active: true,
  confirmedByHuman: true,
  times: ["08:00", "21:00"],
  startDate: "2026-10-01",
  endDate: null,
  ...overrides,
});

const atIst = (date: string, time: string): number => zonedTimeToMs(date, time, IST)!;

describe("planDoseEvents", () => {
  const now = atIst("2026-10-23", "00:30");
  const windowEnd = now + 24 * 60 * 60 * 1000;

  it("plans the next 24 hours with deterministic ids from the local clock", () => {
    const planned = planDoseEvents([medicine()], now, windowEnd, IST);
    expect(planned).toEqual([
      { id: "med1_202610230800", medicineId: "med1", scheduledFor: atIst("2026-10-23", "08:00") },
      { id: "med1_202610232100", medicineId: "med1", scheduledFor: atIst("2026-10-23", "21:00") },
    ]);
  });

  it("includes an event exactly at the window start and excludes one at the end", () => {
    const edge = planDoseEvents(
      [medicine({ times: ["00:30"] })],
      now,
      windowEnd,
      IST,
    );
    expect(edge).toHaveLength(1);
    expect(edge[0].scheduledFor).toBe(now);

    const next = planDoseEvents(
      [medicine({ times: ["00:30"], startDate: "2026-10-24" })],
      now,
      windowEnd,
      IST,
    );
    expect(next).toHaveLength(0);
  });

  it("filters inactive and unconfirmed medicines", () => {
    expect(planDoseEvents([medicine({ active: false })], now, windowEnd, IST)).toHaveLength(0);
    expect(
      planDoseEvents([medicine({ confirmedByHuman: false })], now, windowEnd, IST),
    ).toHaveLength(0);
  });

  it("respects local start and end dates", () => {
    expect(
      planDoseEvents([medicine({ startDate: "2026-10-24" })], now, windowEnd, IST),
    ).toHaveLength(0);
    expect(
      planDoseEvents([medicine({ endDate: "2026-10-22" })], now, windowEnd, IST),
    ).toHaveLength(0);
    expect(
      planDoseEvents([medicine({ endDate: "2026-10-23" })], now, windowEnd, IST),
    ).toHaveLength(2);
  });

  it("deduplicates repeated times and overlapping horizons", () => {
    const dupes = planDoseEvents(
      [medicine({ times: ["08:00", "08:00", "21:00"] })],
      now,
      windowEnd,
      IST,
    );
    expect(dupes).toHaveLength(2);

    const shift = 8 * 60 * 60 * 1000;
    const later = planDoseEvents([medicine()], now + shift, windowEnd + shift, IST);
    const ids = new Set(dupes.map((event) => event.id));
    expect(later.map((event) => event.id)).toContain("med1_202610240800");
    for (const event of later) {
      if (event.id === "med1_202610232100") expect(ids.has(event.id)).toBe(true);
    }
    expect(later.map((event) => event.id)).not.toContain("med1_202610230800");
  });

  it("skips a wall clock that does not exist on a DST spring-forward day", () => {
    const nyNow = zonedTimeToMs("2026-03-08", "00:00", "America/New_York")!;
    const planned = planDoseEvents(
      [medicine({ times: ["02:30", "03:30"], startDate: "2026-03-01" })],
      nyNow,
      nyNow + 24 * 60 * 60 * 1000,
      "America/New_York",
    );
    expect(planned.map((event) => event.scheduledFor)).toEqual([
      zonedTimeToMs("2026-03-08", "03:30", "America/New_York"),
    ]);
  });

  it("sorts by scheduled time then id", () => {
    const planned = planDoseEvents(
      [medicine({ id: "b", times: ["09:00"] }), medicine({ id: "a", times: ["08:00"] })],
      now,
      windowEnd,
      IST,
    );
    expect(planned.map((event) => event.id)).toEqual(["a_202610230800", "b_202610230900"]);
  });
});
