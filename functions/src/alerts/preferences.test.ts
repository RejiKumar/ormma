import type { Firestore } from "firebase-admin/firestore";
import { deliverAlertPush, type PushSender } from "./fcm";
import { effectiveNotify, inQuietHours, localHour, shouldPushAlert } from "./preferences";

// 2026-11-03 at the given Asia/Kolkata local time, as epoch ms.
const ist = (hour: number, minute = 0) => Date.UTC(2026, 10, 3, hour, minute) - 330 * 60_000;
const TZ = "Asia/Kolkata";

describe("effectiveNotify", () => {
  it("reads missing values as missed on, summary on, quiet off", () => {
    expect(effectiveNotify(undefined)).toEqual({ missed: true, summary: true, quiet: false });
    expect(effectiveNotify({ missed: false })).toEqual({ missed: false, summary: true, quiet: false });
    expect(effectiveNotify({ quiet: "yes" })).toEqual({ missed: true, summary: true, quiet: false });
  });
});

describe("quiet hours", () => {
  it("runs 22:00 to 06:00 in the parent's timezone", () => {
    expect(localHour(TZ, ist(23, 30))).toBe(23);
    expect(inQuietHours(TZ, ist(23, 30))).toBe(true);
    expect(inQuietHours(TZ, ist(5, 59))).toBe(true);
    expect(inQuietHours(TZ, ist(6, 0))).toBe(false);
    expect(inQuietHours(TZ, ist(21, 59))).toBe(false);
  });
});

describe("shouldPushAlert", () => {
  const on = { missed: true, summary: true, quiet: false };

  it("sends missed-dose alerts to members who have them on", () => {
    expect(shouldPushAlert(on, "missed_dose", TZ, ist(10))).toBe(true);
  });

  it("skips a member who turned missed-dose alerts off", () => {
    expect(shouldPushAlert({ ...on, missed: false }, "missed_dose", TZ, ist(10))).toBe(false);
    expect(shouldPushAlert({ ...on, missed: false }, "no_answer", TZ, ist(10))).toBe(false);
  });

  it("skips non-urgent alerts during quiet hours when quiet hours are on", () => {
    expect(shouldPushAlert({ ...on, quiet: true }, "missed_dose", TZ, ist(23, 30))).toBe(false);
    expect(shouldPushAlert({ ...on, quiet: true }, "missed_dose", TZ, ist(12))).toBe(true);
    expect(shouldPushAlert(on, "missed_dose", TZ, ist(23, 30))).toBe(true);
  });

  it("never filters an urgent alert", () => {
    const off = { missed: false, summary: false, quiet: true };
    expect(shouldPushAlert(off, "urgent", TZ, ist(23, 30))).toBe(true);
  });
});

describe("deliverAlertPush with preferences", () => {
  function fakeDb(members: Record<string, { tokens: string[]; notify?: unknown }>): Firestore {
    return {
      collection: () => ({
        get: async () => ({
          docs: Object.entries(members).map(([id, m]) => ({ id, data: () => ({ notify: m.notify }) })),
        }),
      }),
      doc: (path: string) => ({
        get: async () => {
          if (path.startsWith("parents/")) return { exists: true, data: () => ({ timezone: TZ }) };
          const uid = path.split("/")[1];
          return { exists: true, data: () => ({ fcmTokens: members[uid].tokens }) };
        },
        update: async () => undefined,
      }),
    } as unknown as Firestore;
  }
  const sender = (): PushSender & { sendMulticast: jest.Mock } => ({
    sendMulticast: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0, invalidTokens: [] }),
  });
  const message = { title: "t", body: "b", data: {} };
  const members = {
    all: { tokens: ["t-all"] },
    off: { tokens: ["t-off"], notify: { missed: false } },
    quiet: { tokens: ["t-quiet"], notify: { quiet: true } },
  };

  it("drops opted-out and quiet members for a missed-dose alert at night, and keeps the rest", async () => {
    const push = sender();
    await deliverAlertPush(fakeDb(members), "p1", message, push, { alertType: "missed_dose", nowMs: ist(23, 30) });
    expect(push.sendMulticast.mock.calls[0][0]).toEqual(["t-all"]);
  });

  it("keeps quiet-hours members during the day", async () => {
    const push = sender();
    await deliverAlertPush(fakeDb(members), "p1", message, push, { alertType: "missed_dose", nowMs: ist(12) });
    expect(push.sendMulticast.mock.calls[0][0].sort()).toEqual(["t-all", "t-quiet"]);
  });

  it("sends an urgent alert to everyone, whatever their preferences", async () => {
    const push = sender();
    await deliverAlertPush(fakeDb(members), "p1", message, push, { alertType: "urgent", nowMs: ist(23, 30) });
    expect(push.sendMulticast.mock.calls[0][0].sort()).toEqual(["t-all", "t-off", "t-quiet"]);
  });
});
