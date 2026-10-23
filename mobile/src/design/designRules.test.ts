// Presentation rules from the specs, enforced over the whole mobile source:
// coral only for missed doses and urgent alerts; no judgement words about readings in the catalogue;
// the status set is exactly the seven dose-event-lifecycle statuses.
import fs from "node:fs";
import path from "node:path";
import en from "../i18n/locales/en.json";
import { darkColors, lightColors, type StatusKey } from "./tokens";

const SRC = path.resolve(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name) ? [full] : [];
  });
}
const rel = (f: string) => path.relative(SRC, f).replace(/\\/g, "/");

function strings(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (obj && typeof obj === "object") return Object.values(obj).flatMap(strings);
  return [];
}

describe("coral is only for missed doses and urgent alerts", () => {
  it("is used only by the missed status and the urgent banner", () => {
    const urgentUsers = sourceFiles(SRC)
      .filter((f) => /colors\.urgent|\.urgent\./.test(fs.readFileSync(f, "utf8")))
      .map(rel)
      .sort();
    expect(urgentUsers).toEqual(["components/Banner.tsx", "design/tokens.ts"]);
  });

  it("no component names the missed colours directly: they come only through StatusChip's status lookup", () => {
    const users = sourceFiles(SRC)
      .filter((f) => /status\.missed|status\["missed"\]/.test(fs.readFileSync(f, "utf8")))
      .map(rel)
      .filter((f) => f !== "design/tokens.ts"); // the token file only mentions it in a comment
    expect(users).toEqual([]);
  });

  it("only the missed status and the urgent banner use the coral colours in the tokens", () => {
    for (const colors of [lightColors, darkColors]) {
      const coral = new Set<string>([
        colors.status.missed.fg,
        colors.status.missed.bg,
        colors.status.missed.icon,
        colors.urgent.fg,
        colors.urgent.bg,
        colors.urgent.icon,
      ]);
      const others: Array<[string, string]> = [];
      for (const key of ["taken", "pending", "unclear", "calling", "not_taken", "no_answer"] as StatusKey[]) {
        for (const [part, value] of Object.entries(colors.status[key]))
          others.push([`${key}.${part}`, value]);
      }
      others.push(["reading.fg", colors.reading.fg], ["reading.bg", colors.reading.bg]);
      colors.avatars.forEach((a, i) => others.push([`avatar${i}`, a]));
      for (const [name, value] of others)
        expect({ name, coral: coral.has(value) }).toEqual({ name, coral: false });
    }
  });
});

describe("health readings are never judged", () => {
  const JUDGEMENT =
    /\b(good|bad|normal|abnormal|safe|unsafe|dangerous|healthy|unhealthy|critical|alarming)\b/i;

  it("has no judgement words about readings in the English catalogue", () => {
    const offenders = strings(en).filter((s) => JUDGEMENT.test(s));
    expect(offenders).toEqual([]);
  });

  it("the judgement check itself catches such words", () => {
    expect(JUDGEMENT.test("Your blood pressure is normal")).toBe(true);
    expect(JUDGEMENT.test("BP is dangerous")).toBe(true);
    expect(JUDGEMENT.test("Blood pressure 150/90")).toBe(false);
  });

  it("the status set is exactly the seven dose statuses, with no reading-judgement status", () => {
    expect(Object.keys(lightColors.status).sort()).toEqual([
      "calling",
      "missed",
      "no_answer",
      "not_taken",
      "pending",
      "taken",
      "unclear",
    ]);
    expect(Object.keys(darkColors.status).sort()).toEqual([
      "calling",
      "missed",
      "no_answer",
      "not_taken",
      "pending",
      "taken",
      "unclear",
    ]);
  });

  it("reading style tokens are neutral: not equal to any status or urgent colour", () => {
    for (const colors of [lightColors, darkColors]) {
      const statusColors = new Set<string>([
        ...Object.values(colors.status).flatMap((s) => [s.bg, s.fg, s.icon]),
        colors.urgent.bg,
        colors.urgent.fg,
        colors.urgent.icon,
      ]);
      expect(statusColors.has(colors.reading.bg)).toBe(false);
    }
  });
});

describe("the disclaimer text", () => {
  it('is exactly "This app does not provide medical advice."', () => {
    expect(en.disclaimer.medical).toBe("This app does not provide medical advice.");
  });
});
