import en from "./locales/en.json";
import hi from "./locales/hi.json";
import ml from "./locales/ml.json";
import ta from "./locales/ta.json";

// The wording and design guards that apply to the English text also apply to every other language
// (medical-safety: no advice, no diagnosis, no judgement of a reading, no AI model names, no pressure to buy;
// app-language: a translated catalogue is held to the same rules).

function strings(obj: Record<string, unknown>, prefix = ""): Array<[string, string]> {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? strings(v as Record<string, unknown>, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)] as [string, string]],
  );
}

// Latin-script terms that must never appear in any language.
const ANY_LANGUAGE = [/\b(sonnet|claude|haiku|anthropic|gpt|openai|llm)\b/i, /\bAI\b/, /\b(hurry|act now|last chance)\b/i];

// The same rules written in each script: a doctor or medical-advice instruction, a danger or severity
// judgement about a reading, a safety claim, and pressure words. "Emergency services" is allowed (it only
// points to local services); the clinic contact label "ക്ലിനിക്/மருத்துவமனை/क्लिनिक" is a place, not advice.
const PER_LANGUAGE: Record<string, RegExp[]> = {
  ml: [/ഡോക്ടർ/, /അപകട/, /ഗുരുതര/, /സുരക്ഷ(?!ി)/, /ഉടനെ ചെയ്യുക|ഉടൻ വാങ്ങൂ/],
  ta: [/மருத்துவரை|மருத்துவர்/, /ஆபத்து/, /தீவிர/, /பாதுகாப்புக்/, /உடனே வாங்க/],
  hi: [/डॉक्टर/, /खतरा|खतरनाक/, /गंभीर/, /सुरक्षा/, /अभी खरीदें|जल्दी करें/],
};

describe.each([
  ["en", en],
  ["ml", ml],
  ["ta", ta],
  ["hi", hi],
] as const)("wording guards for %s", (name, catalogue) => {
  const all = strings(catalogue as Record<string, unknown>);

  it("has strings to check", () => {
    expect(all.length).toBe(433);
  });

  it("names no AI model and uses no pressure wording", () => {
    const offenders = all.filter(([, text]) => ANY_LANGUAGE.some((p) => p.test(text)));
    expect(offenders).toEqual([]);
  });

  it("has no doctor, danger or safety wording in the language's own script", () => {
    const rules = PER_LANGUAGE[name] ?? [];
    const offenders = all.filter(([, text]) => rules.some((p) => p.test(text)));
    expect(offenders).toEqual([]);
  });

  it("keeps the medical disclaimer, the status set and the fixed labels", () => {
    expect(catalogue.disclaimer.medical.length).toBeGreaterThan(10);
    expect(Object.keys(catalogue.status).sort()).toEqual(["calling", "missed", "no_answer", "not_taken", "pending", "taken", "unclear"]);
    expect(catalogue.screens.medicines.visualMatch.length).toBeGreaterThan(0);
  });

  it("shows no reading-judgement label for a dose status", () => {
    const labels = Object.values(catalogue.status).join(" ");
    expect(labels).not.toMatch(/\b(good|bad|normal|abnormal|safe|dangerous)\b/i);
  });
});
