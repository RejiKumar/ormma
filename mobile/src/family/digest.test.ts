import i18n, { initI18n } from "../i18n";
import { groupCards, type MedicineInfo } from "./cards";
import { buildDigest } from "./digest";
import { pickPresenceMember, presenceEnabled, relativeAgo, VIEWING_WINDOW_MS } from "./usePresence";
import type { TodayDoseEvent } from "./useTodayEvents";

const TZ = "Asia/Kolkata";
const ist = (hour: number, minute = 0) => Date.UTC(2026, 9, 19, hour, minute) - 330 * 60_000; // Mon 19 Oct 2026
const ev = (id: string, at: number, status: TodayDoseEvent["status"], over: Partial<TodayDoseEvent> = {}): TodayDoseEvent => ({
  id,
  medicineId: "m1",
  scheduledFor: at,
  status,
  resolvedAt: null,
  confirmationNote: "Amma said her knee felt better today.",
  seenBy: {},
  ...over,
});
const meds: Record<string, MedicineInfo> = {
  m1: { label: "Metformin 500mg", pill: "" },
  m3: { label: "Atorvastatin 10mg", pill: "" },
};
const parent = { name: "Amma", timezone: TZ };

beforeAll(async () => {
  initI18n("en");
  await i18n.changeLanguage("en");
});

describe("buildDigest (matches the server template)", () => {
  it("is null when there are no doses today", () => {
    expect(buildDigest(i18n.t, parent, [], ist(18))).toBeNull();
  });

  it("states doses confirmed, when the first was taken, and the next dose", () => {
    const cards = groupCards(
      [
        ev("a", ist(8, 30), "taken", { resolvedAt: ist(8, 34) }),
        ev("b", ist(13, 30), "taken", { resolvedAt: ist(13, 36) }),
        ev("c", ist(21), "pending", { medicineId: "m3" }),
      ],
      meds,
    );
    expect(buildDigest(i18n.t, parent, cards, ist(18))).toBe(
      [
        "Ormma update, Mon 19 Oct",
        "Amma is on track: 2 of 3 doses confirmed.",
        "Morning dose taken at 8:34 AM.",
        "Next: Atorvastatin 10mg at 9:00 PM.",
      ].join("\n"),
    );
  });

  it("names the time of a dose that was not confirmed and asks the family to check in, with no reason", () => {
    const cards = groupCards([ev("a", ist(8, 30), "missed"), ev("b", ist(13, 30), "no_answer")], meds);
    const text = buildDigest(i18n.t, parent, cards, ist(20)) as string;
    expect(text).toContain("Amma has not confirmed 2 doses: 8:30 AM, 1:30 PM. Please check in.");
    expect(text).not.toMatch(/because|should|safe|normal|dangerous/i);
  });

  it("never includes confirmation notes", () => {
    const cards = groupCards([ev("a", ist(8, 30), "taken", { resolvedAt: ist(8, 34) })], meds);
    expect(buildDigest(i18n.t, parent, cards, ist(18))).not.toContain("knee");
  });
});

describe("presence helpers", () => {
  const m = (uid: string, name: string, lastSeenAt: number | null, isSelf = false) => ({ uid, name, isSelf, lastSeenAt });
  const NOW = ist(11);

  it("describes another member seen within the window as viewing", () => {
    const pick = pickPresenceMember([m("me", "Me", NOW, true), m("r", "Rahul", NOW - 40_000)], NOW);
    expect(pick?.member.name).toBe("Rahul");
    expect(pick?.viewing).toBe(true);
  });

  it("falls back to the most recently seen other member when nobody is viewing", () => {
    const pick = pickPresenceMember([m("a", "Meera", NOW - 5 * 3600_000), m("b", "Rahul", NOW - 3 * 3600_000)], NOW);
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
