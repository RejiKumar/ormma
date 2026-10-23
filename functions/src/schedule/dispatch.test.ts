import type { CallPolicy } from "../../../shared/types";
import { MIN_ATTEMPT_SPACING_MS, planCallGroups } from "./dispatch";
import type {
  DispatchEvent,
  DispatchMedicine,
  DispatchParent,
} from "./dispatch";
import { zonedTimeToMs } from "./time";

const IST = "Asia/Kolkata";
const at = (date: string, time: string): number => zonedTimeToMs(date, time, IST)!;

const POLICY: CallPolicy = {
  retryCount: 2,
  retryGapMinutes: 10,
  missedAfterMinutes: 60,
  quietHours: { start: "22:00", end: "06:00" },
};

const parent = (overrides: Partial<DispatchParent> = {}): DispatchParent => ({
  id: "p1",
  active: true,
  consentStatus: "granted",
  timezone: IST,
  callPolicy: POLICY,
  ...overrides,
});

const event = (overrides: Partial<DispatchEvent> = {}): DispatchEvent => ({
  id: "e1",
  parentId: "p1",
  medicineId: "m1",
  scheduledFor: at("2026-10-23", "10:00"),
  attempts: 0,
  lastCallAt: null,
  ...overrides,
});

const medicine = (overrides: Partial<DispatchMedicine> = {}): DispatchMedicine => ({
  id: "m1",
  active: true,
  confirmedByHuman: true,
  times: ["10:00"],
  ...overrides,
});

const maps = (
  parents: DispatchParent[] = [parent()],
  medicines: DispatchMedicine[] = [medicine()],
): {
  parents: Map<string, DispatchParent>;
  medicines: Map<string, DispatchMedicine[]>;
} => ({
  parents: new Map(parents.map((p) => [p.id, p])),
  medicines: new Map([["p1", medicines]]),
});

describe("planCallGroups eligibility", () => {
  const now = at("2026-10-23", "10:00");

  it("accepts an eligible single event", () => {
    const result = planCallGroups({ events: [event()], now, ...maps() });
    expect(result.skipped).toEqual([]);
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0].eventIds).toEqual(["e1"]);
  });

  it("requires an active parent with granted consent", () => {
    const inactive = planCallGroups({ events: [event()], now, ...maps([parent({ active: false })]) });
    expect(inactive.skipped).toEqual([{ eventId: "e1", reason: "parent_inactive" }]);

    for (const consentStatus of ["pending", "revoked"] as const) {
      const result = planCallGroups({ events: [event()], now, ...maps([parent({ consentStatus })]) });
      expect(result.skipped).toEqual([{ eventId: "e1", reason: "consent_not_granted" }]);
    }

    const missing = planCallGroups({ events: [event()], now, parents: new Map(), medicines: new Map() });
    expect(missing.skipped).toEqual([{ eventId: "e1", reason: "missing_parent" }]);
  });

  it("enforces the attempt limit of 1 + retryCount", () => {
    const eligible = planCallGroups({ events: [event({ attempts: 2 })], now, ...maps() });
    expect(eligible.calls).toHaveLength(1);

    const exhausted = planCallGroups({ events: [event({ attempts: 3 })], now, ...maps() });
    expect(exhausted.skipped).toEqual([{ eventId: "e1", reason: "attempts_exhausted" }]);
  });

  it("enforces 10-minute spacing since the last attempt", () => {
    const tooSoon = planCallGroups({
      events: [event({ lastCallAt: now - 5 * 60_000 })],
      now,
      ...maps(),
    });
    expect(tooSoon.skipped).toEqual([{ eventId: "e1", reason: "attempt_too_soon" }]);

    const exactly = planCallGroups({
      events: [event({ lastCallAt: now - MIN_ATTEMPT_SPACING_MS })],
      now,
      ...maps(),
    });
    expect(exactly.calls).toHaveLength(1);
  });

  it("defers during quiet hours", () => {
    const quietNow = at("2026-10-23", "23:00");
    const result = planCallGroups({
      events: [event({ scheduledFor: at("2026-10-23", "22:30") })],
      now: quietNow,
      ...maps(),
    });
    expect(result.skipped).toEqual([{ eventId: "e1", reason: "quiet_hours" }]);
  });

  it("re-checks the medicine and its local time", () => {
    expect(
      planCallGroups({ events: [event()], now, ...maps([parent()], []) }).skipped,
    ).toEqual([{ eventId: "e1", reason: "medicine_missing" }]);

    expect(
      planCallGroups({
        events: [event()],
        now,
        ...maps([parent()], [medicine({ active: false })]),
      }).skipped,
    ).toEqual([{ eventId: "e1", reason: "medicine_inactive" }]);

    expect(
      planCallGroups({
        events: [event()],
        now,
        ...maps([parent()], [medicine({ confirmedByHuman: false })]),
      }).skipped,
    ).toEqual([{ eventId: "e1", reason: "medicine_unconfirmed" }]);

    expect(
      planCallGroups({
        events: [event()],
        now,
        ...maps([parent()], [medicine({ times: ["11:00"] })]),
      }).skipped,
    ).toEqual([{ eventId: "e1", reason: "time_removed" }]);
  });
});

describe("planCallGroups grouping", () => {
  const now = at("2026-10-23", "10:00");

  it("groups same parent and same scheduled minute", () => {
    const result = planCallGroups({
      events: [event({ id: "e2", medicineId: "m2" }), event({ id: "e1" })],
      now,
      ...maps([parent()], [medicine(), medicine({ id: "m2" })]),
    });
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0].eventIds).toEqual(["e1", "e2"]);
  });

  it("keeps a single survivor when the other medicine fails the re-check", () => {
    const result = planCallGroups({
      events: [event({ id: "e1" }), event({ id: "e2", medicineId: "m2" })],
      now,
      ...maps([parent()], [medicine(), medicine({ id: "m2", active: false })]),
    });
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0].eventIds).toEqual(["e1"]);
    expect(result.skipped).toEqual([{ eventId: "e2", reason: "medicine_inactive" }]);
  });

  it("never groups across parents or scheduled times", () => {
    const result = planCallGroups({
      events: [
        event({ id: "e1" }),
        event({ id: "e2", scheduledFor: at("2026-10-23", "10:05") }),
        event({ id: "e3", parentId: "p2" }),
      ],
      now: at("2026-10-23", "10:06"),
      parents: new Map([
        ["p1", parent()],
        ["p2", parent({ id: "p2" })],
      ]),
      medicines: new Map([
        ["p1", [medicine({ times: ["10:00", "10:05"] })]],
        ["p2", [medicine()]],
      ]),
    });
    expect(result.calls).toHaveLength(3);
    expect(result.calls.map((call) => call.parentId).sort()).toEqual(["p1", "p1", "p2"]);
  });

  it("sorts calls by scheduled time then parent", () => {
    const result = planCallGroups({
      events: [
        event({ id: "late", scheduledFor: at("2026-10-23", "10:05") }),
        event({ id: "p2", parentId: "p2" }),
        event({ id: "p1" }),
      ],
      now: at("2026-10-23", "10:06"),
      parents: new Map([
        ["p1", parent()],
        ["p2", parent({ id: "p2" })],
      ]),
      medicines: new Map([
        ["p1", [medicine({ times: ["10:00", "10:05"] })]],
        ["p2", [medicine()]],
      ]),
    });
    expect(result.calls.map((call) => call.eventIds[0])).toEqual(["p1", "p2", "late"]);
  });
});
