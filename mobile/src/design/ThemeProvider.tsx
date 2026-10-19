import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { themes, type Theme, type ThemeName } from "./tokens";

/** Theme options. "light" is the default; "system" follows the operating system. */
export type ThemePreference = "light" | "dark" | "system";

/** Device-local storage key. The theme preference is not health data. */
export const THEME_STORAGE_KEY = "ormma.theme";

interface ThemeContextValue {
  theme: Theme;
  /** The theme actually applied: light or dark. */
  name: ThemeName;
  /** The option the user chose. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** True once the stored preference has been read. */
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isPreference = (v: unknown): v is ThemePreference =>
  v === "light" || v === "dark" || v === "system";

export function ThemeProvider({
  children,
  initialPreference = "light",
}: {
  children: ReactNode;
  /** Preference used until the stored one is read. Defaults to light; tests use it to start in dark. */
  initialPreference?: ThemePreference;
}) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (active && isPreference(stored)) setPreferenceState(stored);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const name: ThemeName =
      preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
    return { theme: themes[name], name, preference, setPreference, ready };
  }, [preference, system, setPreference, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the current theme tokens and the theme preference. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
