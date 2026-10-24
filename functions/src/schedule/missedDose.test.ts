import { Timestamp } from "firebase-admin/firestore";
import {
  missedVariant,
  planMissedGroups,
  type MissedCandidate,
  type MissedMember,
  type MissedParentInfo,
} from "./missedDose";

const IST = "Asia/Kolkata";
const now = Date.parse("2026-10-23T14:30:00Z");
const scheduled = Date.parse("2026-10-23T12:00:00Z");

const parent: MissedParentInfo = { name: "Amma", timeZone: IST, missedAfterMinutes: 60 };
const parents = new Map([["p1", parent]]);

const event = (id: string, overrides: Record<string, unknown> = {}): MissedCandidate => ({
  id,
  parentId: "p1",
  data: {
    status: "pending",
    attempts: 1,
    scheduledFor: Timestamp.fromMillis(scheduled),
    lastCallSid: "CA_1",
    missedAt: null,
    resolvedAt: null,
    resolvedBy: null,
    resolvedByUid: null,
    alertSent: false,
    groupConfirmed: false,
    lastCallAt: Timestamp.fromMillis(scheduled + 5 * 60 * 1000),
    reminderAt: null,
    ...overrides,
  },
});

const member = (overrides: Partial<MissedMember> = {}): MissedMember => ({
  id: "e1",
  state: {
    status: "pending",
    attempts: 1,
    scheduledFor: scheduled,
    lastCallSid: null,
    missedAt: null,
    resolvedAt: null,
    resolvedBy: null,
    resolvedByUid: null,
    alertSent: false,
    groupConfirmed: false,
    lastCallAt: null,
    reminderAt: null,
  },
  dataFailure: false,
  ...overrides,
});

describe("planMissedGroups", () => {
  it("skips events still inside the missed window", () => {
    expect(planMissedGroups([event("e1")], parents, scheduled + 30 * 60 * 1000)).toEqual([]);
  });

  it("plans a missed event once the window has passed", () => {
    const groups = planMissedGroups([event("e1")], parents, now);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      parentId: "p1",
      scheduledFor: scheduled,
      variant: "standard",
      lastAttemptAt: scheduled + 5 * 60 * 1000,
    });
    expect(groups[0].members.map((m) => m.id)).toEqual(["e1"]);
  });

  it("groups same-minute events for one parent into a single alert", () => {
    const groups = planMissedGroups([event("e1"), event("e2")], parents, now);
    expect(groups).toHaveLength(1);
    expect(groups[0].members.map((m) => m.id)).toEqual(["e1", "e2"]);
  });

  it("uses the group wording when one member was pressed for all", () => {
    const groups = planMissedGroups([event("e1"), event("e2", { groupConfirmed: true })], parents, now);
    expect(groups[0].variant).toBe("group_not_all");
  });

  it("uses the system-failure wording when the provider failed, even in a group", () => {
    const groups = planMissedGroups(
      [event("e1", { groupConfirmed: true, lastDispatchFailure: true }), event("e2")],
      parents,
      now,
    );
    expect(groups[0].variant).toBe("system_failure");
  });

  it("ignores events whose parent document is missing", () => {
    const orphan = { ...event("e1"), parentId: "missing" };
    expect(planMissedGroups([orphan], parents, now)).toEqual([]);
  });
});

describe("missedVariant", () => {
  it("keeps a single pressed event on the standard wording", () => {
    expect(missedVariant([member({ state: { ...member().state, groupConfirmed: true } })])).toBe(
      "standard",
    );
  });
});
