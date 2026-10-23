import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Language } from "../../../shared/types";
import { structuredReplySchema } from "./schema";

interface FixtureCase {
  id: string;
  language: Language;
  question: "dose_confirmation" | "wellbeing";
  tags: string[];
  transcript: string;
  expected: {
    tookMedicine: boolean | null;
    urgent: boolean;
    readings: Array<Record<string, unknown>>;
    hasConfirmationNote: boolean;
  };
}

interface FixtureFile {
  version: number;
  cases: FixtureCase[];
}

const fixtures = JSON.parse(
  readFileSync(join(__dirname, "../../test/fixtures/reply-transcripts.json"), "utf8"),
) as FixtureFile;

const LANGUAGES: Language[] = ["en-IN", "ml-IN", "ta-IN", "hi-IN"];

describe("reply-structuring fixture set", () => {
  it("has at least 30 uniquely identified cases", () => {
    expect(fixtures.version).toBe(1);
    expect(fixtures.cases.length).toBeGreaterThanOrEqual(30);
    expect(new Set(fixtures.cases.map((entry) => entry.id)).size).toBe(fixtures.cases.length);
  });

  it("covers all four languages and the noisy, partial and injection tags", () => {
    const languages = new Set(fixtures.cases.map((entry) => entry.language));
    expect([...languages].sort()).toEqual([...LANGUAGES].sort());

    const tags = new Set(fixtures.cases.flatMap((entry) => entry.tags));
    expect(tags.has("noisy")).toBe(true);
    expect(tags.has("partial")).toBe(true);
    expect(tags.has("injection")).toBe(true);
  });

  it("has valid expected facts for every case", () => {
    for (const entry of fixtures.cases) {
      expect(entry.transcript.trim().length).toBeGreaterThan(0);
      expect(["dose_confirmation", "wellbeing"]).toContain(entry.question);
      expect(typeof entry.expected.tookMedicine).toBe(
        entry.expected.tookMedicine === null ? "object" : "boolean",
      );
      expect(typeof entry.expected.urgent).toBe("boolean");
      expect(typeof entry.expected.hasConfirmationNote).toBe("boolean");

      for (const reading of entry.expected.readings) {
        expect(["bp", "sugar"]).toContain(reading.type);
        if (reading.type === "bp") {
          expect(typeof reading.systolic).toBe("number");
          expect(typeof reading.diastolic).toBe("number");
        } else {
          expect(typeof reading.value).toBe("number");
        }
      }
    }
  });

  it("keeps the expected reading shapes valid for the reply schema", () => {
    for (const entry of fixtures.cases) {
      const parsed = structuredReplySchema.safeParse({
        tookMedicine: entry.expected.tookMedicine,
        readings: entry.expected.readings,
        symptoms: [],
        confirmationNote: entry.expected.hasConfirmationNote ? "synthetic note" : null,
        urgent: entry.expected.urgent,
        confidence: 1,
        language: entry.language,
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("includes both BP and sugar reading cases", () => {
    const types = new Set(
      fixtures.cases.flatMap((entry) => entry.expected.readings.map((reading) => reading.type)),
    );
    expect(types.has("bp")).toBe(true);
    expect(types.has("sugar")).toBe(true);
  });
});
