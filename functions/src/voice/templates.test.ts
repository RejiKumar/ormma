import {
  PROMPT_KINDS,
  TIME_OF_DAY_WORDS,
  buildScript,
  timeOfDay,
  timeOfDayWord,
} from "./templates";
import type { Language } from "../../../shared/types";

const LANGUAGES: Language[] = ["ml-IN", "ta-IN", "hi-IN", "en-IN"];

describe("templates", () => {
  it("has every kind for every language", () => {
    for (const language of LANGUAGES) {
      for (const kind of PROMPT_KINDS) {
        const text = buildScript(language, kind, {
          name: "Amma",
          hour: 8,
          members: ["Ravi", "Meera"],
        });
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(/\{\{\w+\}\}/);
      }
    }
  });

  it("keeps the call-flow English lines", () => {
    expect(
      buildScript("en-IN", "question_single", { name: "Amma", hour: 8 }),
    ).toBe(
      "Did you take your tablet? Say yes or no, or press 1 for yes, 2 for no. Press 9 to stop reminders.",
    );
    expect(buildScript("en-IN", "question_grouped", { hour: 8 })).toContain(
      "Did you take ALL of your morning tablets? Press 1 for yes, all of them. Press 2 if you did not take all of them.",
    );
    expect(buildScript("en-IN", "closing", { name: "Amma" })).toBe(
      "Thank you, Amma. Goodbye.",
    );
  });

  it("interpolates names and the time-of-day word", () => {
    expect(buildScript("en-IN", "greeting", { name: "Ravi", hour: 8 })).toContain(
      "Ravi",
    );
    expect(buildScript("en-IN", "greeting", { name: "Ravi", hour: 8 })).toContain("morning");
    expect(buildScript("en-IN", "greeting", { name: "Ravi", hour: 18 })).toContain("evening");
    expect(buildScript("ml-IN", "greeting", { name: "Ravi", hour: 8 })).toContain(
      TIME_OF_DAY_WORDS["ml-IN"].morning,
    );
  });

  it("maps local hours to four time-of-day words", () => {
    expect([4, 5, 11, 12, 16, 17, 20, 21].map(timeOfDay)).toEqual([
      "night",
      "morning",
      "morning",
      "afternoon",
      "afternoon",
      "evening",
      "evening",
      "night",
    ]);
    expect(timeOfDayWord("hi-IN", 8)).toBe("सुबह");
  });

  it("names the family members in the consent script", () => {
    const text = buildScript("en-IN", "consent", { name: "Amma", members: ["Ravi", "Meera"] });
    expect(text).toContain("Ravi, Meera");
    expect(text).toContain("Press 1 to agree");
    expect(text).toContain("Press 9 to stop reminders");
    expect(() => buildScript("en-IN", "consent", { name: "Amma", members: [] })).toThrow(
      "template_members_missing",
    );
  });

  it("requires a name where the template speaks one", () => {
    expect(() => buildScript("en-IN", "greeting", { hour: 8 })).toThrow("template_name_missing");
    expect(() => buildScript("en-IN", "closing", {})).toThrow("template_name_missing");
    expect(() => buildScript("en-IN", "greeting", { name: "", hour: 8 })).toThrow(
      "template_name_missing",
    );
    expect(() => buildScript("en-IN", "question_single", {})).not.toThrow();
  });

  it("never speaks judgement words", () => {
    for (const language of LANGUAGES) {
      const all = PROMPT_KINDS.map((kind) =>
        buildScript(language, kind, { name: "Amma", hour: 8, members: ["Ravi"] }),
      ).join(" ");
      expect(all).not.toMatch(/\b(normal|safe|dangerous|good|bad)\b/i);
    }
  });
});
