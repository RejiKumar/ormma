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
      await i18n.changeLanguage(lng);
      expect(i18n.language).toBe(lng);
      expect(i18n.t("status.missed")).toBe("Missed");
    },
  );

  it("uses a translation when a catalogue has the key", async () => {
    i18n.addResourceBundle("ml", "translation", { status: { missed: "TEST-ML" } }, true, true);
    await i18n.changeLanguage("ml");
    expect(i18n.t("status.missed")).toBe("TEST-ML");
    expect(i18n.t("status.taken")).toBe("Taken"); // other keys still fall back
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
