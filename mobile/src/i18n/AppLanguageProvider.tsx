import * as Localization from "expo-localization";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { initI18n } from "./index";
import { loadLanguagePreference, resolveLanguage, saveLanguagePreference, type LanguagePreference } from "./appLanguage";

interface AppLanguageValue {
  preference: LanguagePreference;
  /** False until the saved choice has been read and applied, so the first screen is not shown in the wrong language. */
  ready: boolean;
  setPreference: (preference: LanguagePreference) => Promise<void>;
}

const AppLanguageContext = createContext<AppLanguageValue>({
  preference: "system",
  ready: true,
  setPreference: async () => undefined,
});

const apply = (preference: LanguagePreference) =>
  initI18n(resolveLanguage(preference, Localization.getLocales()[0]?.languageCode));

/**
 * Holds the app language choice. On start it reads the saved choice and applies it; `setPreference`
 * applies a new one at once and remembers it. `initial` skips the read (tests and fixed-language renders).
 */
export function AppLanguageProvider({ children, initial }: { children: ReactNode; initial?: LanguagePreference }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>(initial ?? "system");
  const [ready, setReady] = useState(initial !== undefined);

  useEffect(() => {
    if (initial !== undefined) return;
    let active = true;
    void loadLanguagePreference().then((saved) => {
      if (!active) return;
      setPreferenceState(saved);
      apply(saved);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [initial]);

  const setPreference = useCallback(async (next: LanguagePreference) => {
    setPreferenceState(next);
    apply(next);
    await saveLanguagePreference(next);
  }, []);

  const value = useMemo(() => ({ preference, ready, setPreference }), [preference, ready, setPreference]);
  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export const useAppLanguage = (): AppLanguageValue => useContext(AppLanguageContext);
