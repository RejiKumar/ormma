import i18n, { initI18n } from "../i18n";
import { buildDigest } from "./digest";
import { pickPresenceMember, presenceEnabled, relativeAgo, VIEWING_WINDOW_MS } from "./usePresence";
import type { TodayDoseEvent } from "./useTodayEvents";

// 2026-11-03 09:41 IST
const NOW = Date.UTC(2026, 10, 3, 4, 11, 0);
const at = (hour: number, minute = 0) => Date.UTC(2026, 10, 3, hour - 5, minute - 30 + 60);
const ev = (id: string, scheduledFor: number, status: TodayDoseEvent["status"]): TodayDoseEvent => ({
  id,
  medicineId: "m",
  scheduledFor,
  status,
});
const parent = { name: "Amma", timezone: "Asia/Kolkata" };

beforeAll(async () => {
  initI18n("en");
  await i18n.changeLanguage("en");
});

describe("buildDigest", () => {
  it("is null when there are no doses today", () => {
    expect(buildDigest(i18n.t, parent, [], NOW)).toBeNull();
  });

  it("states doses taken of total and the next pending dose", () => {
    const text = buildDigest(
      i18n.t,
      parent,
      [ev("a", at(8, 30), "taken"), ev("b", at(13, 30), "taken"), ev("c", at(21), "pending")].map((e) => ({
        ...e,
        scheduledFor: e.id === "c" ? NOW + 11 * 3600 * 1000 + 19 * 60 * 1000 : e.scheduledFor,
      })),
      NOW,
    );
    expect(text).toBe(
      ["Ormma update for Amma, Tue, 3 November", "2 of 3 doses confirmed.", "Next dose at 21:00."].join("\n"),
    );
  });

  it("names the missed time and asks the family to check in, with no reason or advice", () => {
    const text = buildDigest(
      i18n.t,
      parent,
      [ev("a", Date.UTC(2026, 10, 3, 3, 0), "missed"), ev("b", Date.UTC(2026, 10, 3, 15, 0), "pending")],
      NOW,
    ) as string;
    expect(text).toContain("0 of 2 doses confirmed.");
    expect(text).toContain("The 08:30 dose was not confirmed. Please check in.");
    expect(text).not.toMatch(/because|should|take|safe|normal|dangerous/i);
  });

  it("pluralises several missed doses", () => {
    const text = buildDigest(
      i18n.t,
      parent,
      [ev("a", Date.UTC(2026, 10, 3, 1, 30), "missed"), ev("b", Date.UTC(2026, 10, 3, 3, 0), "no_answer")],
      NOW,
    ) as string;
    expect(text).toContain("The 07:00, 08:30 doses were not confirmed. Please check in.");
  });

  it("carries no medicine names or ids", () => {
    const text = buildDigest(i18n.t, parent, [ev("a", Date.UTC(2026, 10, 3, 3, 0), "taken")], NOW) as string;
    expect(text).not.toMatch(/metformin|tablet|mg/i);
  });
});

describe("presence helpers", () => {
  const m = (uid: string, name: string, lastSeenAt: number | null, isSelf = false) => ({
    uid,
    name,
    isSelf,
    lastSeenAt,
  });

  it("describes another member seen within the window as viewing", () => {
    const pick = pickPresenceMember([m("me", "Me", NOW, true), m("r", "Rahul", NOW - 40_000)], NOW);
    expect(pick?.member.name).toBe("Rahul");
    expect(pick?.viewing).toBe(true);
  });

  it("falls back to the most recently seen other member when nobody is viewing", () => {
    const pick = pickPresenceMember(
      [m("a", "Meera", NOW - 5 * 3600_000), m("b", "Rahul", NOW - 3 * 3600_000)],
      NOW,
    );
    expect(pick?.member.name).toBe("Rahul");
    expect(pick?.viewing).toBe(false);
    expect(NOW - (pick?.member.lastSeenAt ?? 0)).toBeGreaterThan(VIEWING_WINDOW_MS);
  });

  it("ignores the member themselves and members never seen", () => {
    expect(pickPresenceMember([m("me", "Me", NOW, true), m("x", "Yadav", null)], NOW)).toBeNull();
  });

  it("formats relative times", () => {
    expect(relativeAgo(NOW, NOW - 5 * 60_000)).toEqual({ unit: "minutes", count: 5 });
    expect(relativeAgo(NOW, NOW - 3 * 3600_000)).toEqual({ unit: "hours", count: 3 });
    expect(relativeAgo(NOW, NOW - 72 * 3600_000)).toEqual({ unit: "days", count: 3 });
  });

  it("is enabled only while consent is granted and was never revoked", () => {
    expect(presenceEnabled({ consent: { status: "granted", revokedAt: null, regrantedAt: null } })).toBe(true);
    expect(presenceEnabled({ consent: { status: "pending", revokedAt: null, regrantedAt: null } })).toBe(false);
    expect(presenceEnabled({ consent: { status: "granted", revokedAt: 5, regrantedAt: 9 } })).toBe(false);
    expect(presenceEnabled({ consent: null })).toBe(false);
  });
});
