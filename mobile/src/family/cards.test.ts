import {
  cardKind,
  clock12,
  durationLabel,
  groupCards,
  nextCard,
  periodKey,
  presenceBadge,
  protocolSteps,
  shortDate,
  shortDay,
  type MedicineInfo,
} from "./cards";
import type { TodayDoseEvent } from "./useTodayEvents";

const TZ = "Asia/Kolkata";
// Mon 2026-10-19 at the given IST time, as epoch ms.
const ist = (hour: number, minute = 0, day = 19) => Date.UTC(2026, 9, day, hour, minute) - 330 * 60_000;

const ev = (
  id: string,
  at: number,
  status: TodayDoseEvent["status"],
  over: Partial<TodayDoseEvent> = {},
): TodayDoseEvent => ({
  id,
  medicineId: "m1",
  scheduledFor: at,
  status,
  resolvedAt: null,
  confirmationNote: null,
  seenBy: {},
  ...over,
});

const medicines: Record<string, MedicineInfo> = {
  m1: { label: "Metformin 500mg", pill: "Small round white tablet in silver strip" },
  m2: { label: "Amlodipine 5mg", pill: "Small yellow tablet in green strip" },
  m3: { label: "Atorvastatin 10mg", pill: "" },
};

describe("periods and formats", () => {
  it("names periods from the parent's local hour", () => {
    expect([8, 13, 18, 21, 2].map(periodKey)).toEqual(["morning", "afternoon", "evening", "night", "night"]);
  });

  it("formats clock, day and date", () => {
    expect(clock12(TZ, ist(8, 34))).toBe("8:34 AM");
    expect(clock12(TZ, ist(0, 5))).toBe("12:05 AM");
    expect(shortDay(TZ, ist(10))).toBe("Mon 19 Oct");
    expect(shortDate("2026-11-02")).toBe("2 Nov");
    expect(shortDate("nope")).toBe("nope");
  });

  it("formats call durations", () => {
    expect(durationLabel(48)).toBe("48 s");
    expect(durationLabel(72)).toBe("1 min 12 s");
    expect(durationLabel(360)).toBe("6 min");
  });
});

describe("dose cards", () => {
  it("combines doses at one time into one card, in time order, with pill tags", () => {
    const cards = groupCards(
      [
        ev("c", ist(21), "pending", { medicineId: "m3" }),
        ev("a", ist(8, 30), "taken", { resolvedAt: ist(8, 34), medicineId: "m1" }),
        ev("b", ist(8, 30), "taken", { resolvedAt: ist(8, 33), medicineId: "m2" }),
      ],
      medicines,
    );
    expect(cards.map((c) => c.scheduledFor)).toEqual([ist(8, 30), ist(21)]);
    expect(cards[0].medicines).toBe("Metformin 500mg + Amlodipine 5mg");
    expect(cards[0].pills).toEqual(["Small round white tablet in silver strip", "Small yellow tablet in green strip"]);
    expect(cards[1].pills).toEqual([]);
  });

  it("is taken on time within 30 minutes, taken later, and carries the time taken", () => {
    const onTime = groupCards([ev("a", ist(8, 30), "taken", { resolvedAt: ist(8, 34) })], medicines)[0];
    expect(onTime.kind).toBe("taken_on_time");
    expect(onTime.takenAt).toBe(ist(8, 34));
    const late = groupCards([ev("b", ist(13, 30), "taken", { resolvedAt: ist(14, 20) })], medicines)[0];
    expect(late.kind).toBe("taken");
    expect(late.takenAt).toBe(ist(14, 20));
  });

  it("reads Not confirmed for missed, no answer or not taken, Calling for calling, Unclear, otherwise Scheduled", () => {
    expect(cardKind([ev("a", ist(8), "missed")])).toBe("not_confirmed");
    expect(cardKind([ev("a", ist(8), "no_answer")])).toBe("not_confirmed");
    expect(cardKind([ev("a", ist(8), "not_taken")])).toBe("not_confirmed");
    expect(cardKind([ev("a", ist(8), "calling")])).toBe("calling");
    expect(cardKind([ev("a", ist(8), "unclear")])).toBe("unclear");
    expect(cardKind([ev("a", ist(8), "pending")])).toBe("scheduled");
    expect(cardKind([ev("a", ist(8), "taken", { resolvedAt: ist(8, 1) }), ev("b", ist(8), "missed")])).toBe("not_confirmed");
  });

  it("shows confirmation notes exactly as stored, once each", () => {
    const note = "Amma confirmed taking sugar medicine (kazhichu mole) after morning tea.";
    const card = groupCards(
      [
        ev("a", ist(8, 30), "taken", { resolvedAt: ist(8, 34), confirmationNote: note }),
        ev("b", ist(8, 30), "taken", { resolvedAt: ist(8, 34), confirmationNote: note, medicineId: "m2" }),
      ],
      medicines,
    )[0];
    expect(card.notes).toEqual([note]);
  });

  it("lists who saw the card, earliest time per member, in time order", () => {
    const card = groupCards(
      [
        ev("a", ist(8, 30), "taken", { resolvedAt: ist(8, 34), seenBy: { rahul: ist(8, 42), meera: ist(9, 10) } }),
        ev("b", ist(8, 30), "taken", { resolvedAt: ist(8, 34), seenBy: { meera: ist(9, 5) }, medicineId: "m2" }),
      ],
      medicines,
    )[0];
    expect(card.seen).toEqual([
      { uid: "rahul", at: ist(8, 42) },
      { uid: "meera", at: ist(9, 5) },
    ]);
  });

  it("finds the next pending card at or after now", () => {
    const cards = groupCards(
      [
        ev("a", ist(8, 30), "taken", { resolvedAt: ist(8, 34) }),
        ev("b", ist(13, 30), "pending", { medicineId: "m2" }),
        ev("c", ist(21), "pending", { medicineId: "m3" }),
      ],
      medicines,
    );
    expect(nextCard(cards, ist(10))?.medicines).toBe("Amlodipine 5mg");
    expect(nextCard(cards, ist(14))?.medicines).toBe("Atorvastatin 10mg");
    expect(nextCard(cards, ist(22))).toBeNull();
  });
});

describe("protocolSteps", () => {
  it("lists Call 1, retries at the gap and the alert at missedAfterMinutes", () => {
    const steps = protocolSteps({ retryCount: 2, retryGapMinutes: 10, missedAfterMinutes: 60 }, ist(8, 30));
    expect(steps.map((s) => [s.kind, s.n, clock12(TZ, s.at)])).toEqual([
      ["call", 1, "8:30 AM"],
      ["retry", 1, "8:40 AM"],
      ["retry", 2, "8:50 AM"],
      ["alert", 0, "9:30 AM"],
    ]);
  });

  it("follows a different policy", () => {
    const steps = protocolSteps({ retryCount: 1, retryGapMinutes: 15, missedAfterMinutes: 45 }, ist(8, 30));
    expect(steps.map((s) => clock12(TZ, s.at))).toEqual(["8:30 AM", "8:45 AM", "9:15 AM"]);
  });
});

describe("presenceBadge", () => {
  const now = ist(11, 0);
  it("says viewing within two minutes", () => {
    expect(presenceBadge(TZ, now - 60_000, now)).toEqual({ kind: "viewing" });
  });
  it("shows the time for today, yesterday, and the date after that; none when never seen", () => {
    expect(presenceBadge(TZ, ist(9, 10), now)).toEqual({ kind: "time", time: "9:10 AM" });
    expect(presenceBadge(TZ, ist(22, 0, 18), now)).toEqual({ kind: "yesterday" });
    expect(presenceBadge(TZ, ist(22, 0, 15), now)).toEqual({ kind: "date", date: "15 Oct" });
    expect(presenceBadge(TZ, null, now)).toBeNull();
  });
});
