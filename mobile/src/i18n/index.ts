// i18n scaffolding. English is complete; ml, ta and hi are supported and fall back to English until
// native-speaker-reviewed catalogues are added to their (currently empty) locale files.
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import ml from "./locales/ml.json";
import ta from "./locales/ta.json";

export const SUPPORTED_LANGUAGES = ["en", "ml", "ta", "hi"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const resources = {
  en: { translation: en },
  ml: { translation: ml },
  ta: { translation: ta },
  hi: { translation: hi },
} as const;

/** Map a device language code ("ml", "ml-IN", "hi_IN"...) to a supported language, else English. */
export function pickLanguage(code: string | null | undefined): AppLanguage {
  const base = (code ?? "").toLowerCase().split(/[-_]/)[0];
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base) ? (base as AppLanguage) : "en";
}

export function detectDeviceLanguage(): AppLanguage {
  return pickLanguage(Localization.getLocales()[0]?.languageCode);
}

/** Initialise i18next once (synchronously, resources are bundled) or switch language if already initialised. */
export function initI18n(language: AppLanguage = detectDeviceLanguage()) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      initAsync: false,
    });
  } else if (i18n.language !== language) {
    void i18n.changeLanguage(language);
  }
  return i18n;
}

export default i18n;
