import fs from "node:fs";
import path from "node:path";
import { isVisualMatch } from "./visualMatch";

const base = { source: "prescription_scan" as const, confirmedByHuman: true, prescriptionId: "rx1" };

describe("isVisualMatch", () => {
  it("is true only for a scanned medicine with a prescription id that a person confirmed", () => {
    expect(isVisualMatch(base)).toBe(true);
    expect(isVisualMatch({ ...base, source: "manual" })).toBe(false);
    expect(isVisualMatch({ ...base, confirmedByHuman: false })).toBe(false);
    expect(isVisualMatch({ ...base, prescriptionId: null })).toBe(false);
    expect(isVisualMatch({ ...base, prescriptionId: "" })).toBe(false);
  });

  it("uses a fixed label that names no AI model", () => {
    const en = JSON.parse(fs.readFileSync(path.join(__dirname, "../i18n/locales/en.json"), "utf8"));
    const label: string = en.screens.medicines.visualMatch;
    expect(label).toBe("Visual match");
    expect(label).not.toMatch(/sonnet|claude|haiku|\bai\b|model|anthropic/i);
  });
});
