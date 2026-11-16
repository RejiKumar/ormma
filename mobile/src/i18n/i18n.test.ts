import en from "./locales/en.json";
import hi from "./locales/hi.json";
import ml from "./locales/ml.json";
import ta from "./locales/ta.json";
import i18n, { initI18n, pickLanguage, SUPPORTED_LANGUAGES } from "./index";

/** Flatten a nested catalogue into dotted keys. */
function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? keys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe("i18n", () => {
  beforeEach(() => {
    initI18n("en");
  });

  it("resolves English strings, including interpolation", () => {
    expect(i18n.t("disclaimer.medical")).toBe("This app does not provide medical advice.");
    expect(i18n.t("doseRing.label", { taken: 2, total: 3 })).toBe("2 of 3 doses taken");
  });

  it("supports en, ml, ta and hi", () => {
    expect([...SUPPORTED_LANGUAGES]).toEqual(["en", "ml", "ta", "hi"]);
  });

  it.each(["ml", "ta", "hi"] as const)(
    "falls back to English for a missing %s key",
    async (lng) => {
      const full = i18n.getResourceBundle(lng, "translation");
      i18n.removeResourceBundle(lng, "translation");
      try {
        await i18n.changeLanguage(lng);
        expect(i18n.language).toBe(lng);
        expect(i18n.t("status.missed")).toBe("Missed");
      } finally {
        i18n.addResourceBundle(lng, "translation", full, true, true);
      }
    },
  );

  it("uses a translation when a catalogue has the key", async () => {
    i18n.addResourceBundle("ml", "translation", { status: { missed: "TEST-ML" } }, true, true);
    await i18n.changeLanguage("ml");
    expect(i18n.t("status.missed")).toBe("TEST-ML");
    expect(i18n.t("status.taken")).toBe(ml.status.taken); // other keys keep their own translation
    i18n.removeResourceBundle("ml", "translation");
    i18n.addResourceBundle("ml", "translation", ml, true, true);
  });

  it("only allows keys in ml, ta and hi that exist in en", () => {
    const enKeys = new Set(keys(en));
    for (const [name, cat] of [
      ["ml", ml],
      ["ta", ta],
      ["hi", hi],
    ] as const) {
      const extra = keys(cat as Record<string, unknown>).filter((k) => !enKeys.has(k));
      expect({ name, extra }).toEqual({ name, extra: [] });
    }
  });

  // Values that are the same in every language on purpose: the product name, a placeholder-only value, and
  // each language's own name (written in its own script, as the language picker requires).
  const SAME_ON_PURPOSE = new Set([
    "app.name",
    "app.brand",
    "languages.en",
    "languages.ml",
    "languages.ta",
    "languages.hi",
    "settings.planFamily",
    "subscription.paidTitle",
    "subscription.compareFamily",
    "screens.family.historyOrmma",
    "screens.family.historyFamilyWhen",
    "screens.family.historyDate",
  ]);

  function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
    return Object.fromEntries(
      Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === "object"
          ? Object.entries(flatten(v as Record<string, unknown>, `${prefix}${k}.`))
          : [[`${prefix}${k}`, String(v)]],
      ),
    );
  }

  it.each([
    ["ml", ml],
    ["ta", ta],
    ["hi", hi],
  ] as const)("the %s catalogue has every English key, the same placeholders, and a real translation", (name, cat) => {
    const english = flatten(en);
    const own = flatten(cat as Record<string, unknown>);
    const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();
    const missing = Object.keys(english).filter((k) => !(k in own));
    const wrongPlaceholders = Object.keys(own).filter((k) => english[k] && placeholders(own[k]).join() !== placeholders(english[k]).join());
    const untranslated = Object.keys(own).filter((k) => own[k] === english[k] && !SAME_ON_PURPOSE.has(k));
    expect({ name, missing, wrongPlaceholders, untranslated }).toEqual({
      name,
      missing: [],
      wrongPlaceholders: [],
      untranslated: [],
    });
  });

  it("writes each language's own name in its own script in every catalogue", () => {
    for (const cat of [en, ml, ta, hi]) {
      expect(cat.languages).toEqual({ en: "English", ml: "മലയാളം", ta: "தமிழ்", hi: "हिन्दी" });
    }
  });

  it("maps device language codes to supported languages, defaulting to English", () => {
    expect(pickLanguage("ml")).toBe("ml");
    expect(pickLanguage("ta-IN")).toBe("ta");
    expect(pickLanguage("hi_IN")).toBe("hi");
    expect(pickLanguage("HI")).toBe("hi");
    expect(pickLanguage("fr")).toBe("en");
    expect(pickLanguage(null)).toBe("en");
    expect(pickLanguage(undefined)).toBe("en");
  });
});

/** Every string in a catalogue, with its dotted key. */
function entries(obj: Record<string, unknown>, prefix = ""): Array<[string, string]> {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? entries(v as Record<string, unknown>, `${prefix}${k}.`)
      : ([[`${prefix}${k}`, String(v)]] as Array<[string, string]>),
  );
}

describe("no hint or example text", () => {
  // Product decision 2026-11-12: forms show no hints and no example values.
  it("has no visible hint keys and no example text in any language", () => {
    for (const catalogue of [en, hi, ml, ta]) {
      for (const [key, value] of entries(catalogue as Record<string, unknown>)) {
        // settings.rowHint is a screen-reader hint, not text shown on a form.
        if (key !== "settings.rowHint") expect(key).not.toMatch(/hint$/i);
        expect(value).not.toMatch(/for example|e\.g\.|\+91\d{6,}/i);
      }
    }
  });
});
