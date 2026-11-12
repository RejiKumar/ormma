import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { themes, type Theme, type ThemeName } from "./tokens";

/** Which theme to use. The app follows the phone's light or dark setting; there is no in-app choice. */
export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  /** The theme actually applied: light or dark. */
  name: ThemeName;
  /** Always true: nothing is read from storage, so the theme is known on the first frame. */
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialPreference = "system",
}: {
  children: ReactNode;
  /** "system" (the default) follows the phone. Tests pass "light" or "dark" to pin a theme. */
  initialPreference?: ThemePreference;
}) {
  const system = useColorScheme();
  const value = useMemo<ThemeContextValue>(() => {
    const name: ThemeName =
      initialPreference === "system" ? (system === "dark" ? "dark" : "light") : initialPreference;
    return { theme: themes[name], name, ready: true };
  }, [initialPreference, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the current theme tokens. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
