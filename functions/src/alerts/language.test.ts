import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import type { AlertDoc } from "../../../shared/types";
import { buildDigestText } from "../digestText";
import { deliverAlertPush, groupTokensByLanguage, type PushMessage, type PushSender } from "./fcm";
import { fill, memberLanguage, pick, type LineTable } from "./language";
import { notifyAlert } from "./createAlert";
import { alertTitle, buildMissedDoseMessage, buildUrgentMessage } from "./templates";
import { ALERT_LINES, DIGEST_LINES } from "./translations";

const IST = "Asia/Kolkata";
const at = (iso: string): number => Date.parse(iso);
const base = {
  parentName: "Amma",
  scheduledFor: at("2026-10-23T14:30:00Z"),
  lastAttemptAt: at("2026-10-23T14:35:00Z"),
  timeZone: IST,
};

describe("memberLanguage", () => {
  it("accepts the four languages and treats anything else as English", () => {
    for (const code of ["en", "ml", "ta", "hi"]) expect(memberLanguage(code)).toBe(code);
    for (const bad of [undefined, null, "", "fr", 5, "ML"]) expect(memberLanguage(bad)).toBe("en");
  });
});

describe("pick and fill", () => {
  it("falls back to the English line when a language has no line", () => {
    const table: LineTable<"a" | "b"> = { en: { a: "A", b: "B" }, ml: { a: "A-ml" }, ta: {}, hi: {} };
    expect(pick(table, "ml", "a")).toBe("A-ml");
    expect(pick(table, "ml", "b")).toBe("B");
    expect(pick(table, "ta", "a")).toBe("A");
  });

  it("fills placeholders and leaves unknown ones alone", () => {
    expect(fill("{x} and {y}", { x: 1 })).toBe("1 and {y}");
  });
});

describe("missed-dose and urgent wording in every language", () => {
  it("keeps the English wording unchanged when no language is given", () => {
    expect(buildMissedDoseMessage({ ...base, variant: "standard" })).toBe(
      "Amma has not confirmed the 8:00 PM tablets. Last attempt at 8:05 PM. Please check.",
    );
    expect(buildUrgentMessage("Amma")).toBe("Amma mentioned something urgent. Please call them now.");
  });

  it.each(["ml", "ta", "hi"] as const)("%s has every line, with the name and times and no leftover placeholder", (language) => {
    for (const variant of ["standard", "group_not_all", "system_failure"] as const) {
      const text = buildMissedDoseMessage({ ...base, variant, language });
      expect(text).toContain("Amma");
      expect(text).toContain("8:00 PM");
      expect(text).not.toMatch(/[{}]/);
      expect(text).not.toBe(buildMissedDoseMessage({ ...base, variant }));
    }
    expect(buildMissedDoseMessage({ ...base, variant: "standard", language })).toContain("8:05 PM");
    expect(buildUrgentMessage("Amma", language)).toContain("Amma");
    expect(buildUrgentMessage("Amma", language)).not.toBe(buildUrgentMessage("Amma"));
    expect(alertTitle("missed_dose", language)).not.toBe("Missed dose");
    expect(alertTitle("urgent", language)).not.toBe("Urgent");
  });

  it("uses a neutral parent word in the recipient's language when the name is empty", () => {
    expect(buildMissedDoseMessage({ ...base, parentName: " ", variant: "standard", language: "hi" })).toContain(
      ALERT_LINES.hi.fallbackName,
    );
  });

  it("never carries medicine names or advice words in any language", () => {
    for (const language of ["en", "ml", "ta", "hi"] as const) {
      const all = Object.values(ALERT_LINES[language]).join(" ");
      expect(all).not.toMatch(/\b(mg|doctor|diagnos|should take)\b/i);
    }
    expect(Object.values(ALERT_LINES.hi).join(" ")).not.toMatch(/डॉक्टर/);
    expect(Object.values(ALERT_LINES.ml).join(" ")).not.toMatch(/ഡോക്ടർ/);
    expect(Object.values(ALERT_LINES.ta).join(" ")).not.toMatch(/மருத்துவர்/);
  });

  it("has a translation for every English alert and digest line", () => {
    for (const language of ["ml", "ta", "hi"] as const) {
      expect(Object.keys(ALERT_LINES[language]).sort()).toEqual(Object.keys(ALERT_LINES.en).sort());
      expect(Object.keys(DIGEST_LINES[language]).sort()).toEqual(Object.keys(DIGEST_LINES.en).sort());
    }
  });
});

describe("digest in every language", () => {
  const events = [
    { scheduledForMs: at("2026-10-23T03:30:00Z"), resolvedAtMs: at("2026-10-23T03:40:00Z"), status: "taken", medicine: "Amlodipine 5mg" },
    { scheduledForMs: at("2026-10-23T14:30:00Z"), resolvedAtMs: null, status: "missed", medicine: "Metformin 500mg" },
    { scheduledForMs: at("2026-10-23T15:30:00Z"), resolvedAtMs: null, status: "pending", medicine: "Vitamin D" },
  ];
  const input = { name: "Amma", nowMs: at("2026-10-23T14:45:00Z"), timeZone: IST, events };

  it("is unchanged in English", () => {
    expect(buildDigestText(input)).toBe(buildDigestText({ ...input, language: "en" }));
    expect(buildDigestText(input)).toContain("Amma has not confirmed 1 dose: 8:00 PM. Please check in.");
  });

  it.each(["ml", "ta", "hi"] as const)("%s names the parent, the times and the next dose with no leftover placeholder", (language) => {
    const text = buildDigestText({ ...input, language }) as string;
    expect(text).toContain("Amma");
    expect(text).toContain("8:00 PM");
    expect(text).toContain("Vitamin D");
    expect(text).not.toMatch(/[{}]/);
    expect(text.split("\n").length).toBe((buildDigestText(input) as string).split("\n").length);
    expect(text).not.toBe(buildDigestText(input));
  });

  it("returns null when there are no doses, in any language", () => {
    expect(buildDigestText({ ...input, events: [], language: "ml" })).toBeNull();
  });
});

describe("sending in each member's language", () => {
  function fakeDb(users: Record<string, { fcmTokens: string[]; language?: unknown }>): Firestore {
    return {
      collection: (path: string) => ({
        get: async () => ({ docs: Object.keys(users).map((uid) => ({ id: uid, ref: { path: `${path}/${uid}` } })) }),
      }),
      doc: (path: string) => {
        const uid = path.split("/")[1];
        return {
          get: async () => ({ exists: users[uid] !== undefined, data: () => users[uid] }),
          update: async () => undefined,
        };
      },
    } as unknown as Firestore;
  }

  const recorder = (): PushSender & { sent: Array<{ tokens: string[]; message: PushMessage }> } => {
    const sent: Array<{ tokens: string[]; message: PushMessage }> = [];
    return {
      sent,
      sendMulticast: async (tokens, message) => {
        sent.push({ tokens, message });
        return { successCount: tokens.length, failureCount: 0, invalidTokens: [] };
      },
    };
  };

  const alert: AlertDoc = {
    type: "missed_dose",
    message: "Amma has not confirmed the 8:00 PM tablets. Last attempt at 8:05 PM. Please check.",
    relatedEventId: "e1",
    createdAt: Timestamp.fromMillis(0),
    readBy: [],
  };

  it("groups tokens by language and treats a missing or unknown language as English", () => {
    const groups = groupTokensByLanguage(["a", "b", "c"], new Map([["a", "ml" as const], ["b", "ml" as const]]));
    expect(groups.get("ml")).toEqual(["a", "b"]);
    expect(groups.get("en")).toEqual(["c"]);
  });

  it("sends one language to one member: their wording and title", async () => {
    const push = recorder();
    await notifyAlert(fakeDb({ u1: { fcmTokens: ["t1"], language: "ml" } }), "p1", "a1", alert, push, (language) =>
      buildMissedDoseMessage({ ...base, variant: "standard", language }),
    );
    expect(push.sent).toHaveLength(1);
    expect(push.sent[0].message.title).toBe(ALERT_LINES.ml.titleMissed);
    expect(push.sent[0].message.body).toBe(buildMissedDoseMessage({ ...base, variant: "standard", language: "ml" }));
    expect(push.sent[0].message.data).toMatchObject({ type: "missed_dose", parentId: "p1", alertId: "a1", relatedEventId: "e1" });
  });

  it("sends two members in two languages their own wording, in separate sends", async () => {
    const push = recorder();
    await notifyAlert(
      fakeDb({ u1: { fcmTokens: ["t1"], language: "ta" }, u2: { fcmTokens: ["t2"], language: "hi" } }),
      "p1",
      "a1",
      alert,
      push,
      (language) => buildMissedDoseMessage({ ...base, variant: "standard", language }),
    );
    expect(push.sent).toHaveLength(2);
    const byToken = Object.fromEntries(push.sent.map((s) => [s.tokens[0], s.message]));
    expect(byToken.t1.title).toBe(ALERT_LINES.ta.titleMissed);
    expect(byToken.t2.title).toBe(ALERT_LINES.hi.titleMissed);
    expect(byToken.t1.body).not.toBe(byToken.t2.body);
  });

  it("sends English when the member has no language or an unknown one", async () => {
    const push = recorder();
    await notifyAlert(
      fakeDb({ u1: { fcmTokens: ["t1"] }, u2: { fcmTokens: ["t2"], language: "fr" } }),
      "p1",
      "a1",
      alert,
      push,
      (language) => buildMissedDoseMessage({ ...base, variant: "standard", language }),
    );
    expect(push.sent).toHaveLength(1);
    expect(push.sent[0].tokens.sort()).toEqual(["t1", "t2"]);
    expect(push.sent[0].message.title).toBe("Missed dose");
    expect(push.sent[0].message.body).toBe(alert.message);
  });

  it("keeps the stored message for everyone when no per-language writer is given", async () => {
    const push = recorder();
    await notifyAlert(fakeDb({ u1: { fcmTokens: ["t1"], language: "ml" } }), "p1", "a1", alert, push);
    expect(push.sent[0].message.body).toBe(alert.message);
    expect(push.sent[0].message.title).toBe(ALERT_LINES.ml.titleMissed);
  });

  it("still sends one plain message to everyone when given plain text", async () => {
    const push = recorder();
    await deliverAlertPush(
      fakeDb({ u1: { fcmTokens: ["t1"], language: "ml" }, u2: { fcmTokens: ["t2"], language: "hi" } }),
      "p1",
      { title: "T", body: "B", data: {} },
      push,
    );
    expect(push.sent).toHaveLength(1);
    expect(push.sent[0].tokens.sort()).toEqual(["t1", "t2"]);
  });
});
