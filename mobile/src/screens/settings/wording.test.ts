import fs from "node:fs";
import path from "node:path";

const catalogue = JSON.parse(fs.readFileSync(path.join(__dirname, "../../i18n/locales/en.json"), "utf8")) as Record<string, Record<string, string>>;

// Settings, plan and limit messages are fixed templates: no health advice, no safety claims, no pressure
// to buy, no AI model names (medical-safety spec, "No safety feature depends on a plan").
const BANNED = [
  /\b(hurry|limited time|last chance|act now|don't miss|do not miss|only today|expires soon)\b/i,
  /\b(safer|safety|protect|protection|guarantee|guaranteed|peace of mind)\b/i,
  /\b(you should|you must|consult|doctor|take your|dose of)\b/i,
  /\b(sonnet|claude|haiku|anthropic|gpt|openai)\b/i,
];

describe("settings and subscription wording", () => {
  const strings = [
    ...Object.entries(catalogue.settings),
    ...Object.entries(catalogue.subscription),
  ];

  it("has strings to check", () => {
    expect(strings.length).toBeGreaterThan(40);
  });

  it.each(strings)("%s has no advice, safety claim, pressure or model name", (_key, text) => {
    for (const pattern of BANNED) expect(text).not.toMatch(pattern);
  });

  it("states the safety features are included on every plan without claiming outcomes", () => {
    expect(catalogue.subscription.everyPlan).toBe(
      "Missed-dose alerts, urgent alerts, the escalation view and the Call buttons are included on every plan.",
    );
  });
});
