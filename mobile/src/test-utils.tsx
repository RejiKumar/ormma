// Test helpers (not a test file): render UI inside the app providers.
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, type ThemePreference } from "./design/ThemeProvider";
import i18n, { initI18n, type AppLanguage } from "./i18n";

export interface RenderOptions {
  theme?: ThemePreference;
  language?: AppLanguage;
}

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const wrap = (ui: ReactElement, theme: ThemePreference) => (
  <I18nextProvider i18n={i18n}>
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider initialPreference={theme}>{ui}</ThemeProvider>
    </SafeAreaProvider>
  </I18nextProvider>
);

/**
 * Render with the theme, i18n (language fixed for the test) and safe-area providers. The result has
 * `rerenderApp(ui)` to render new UI under the same providers.
 */
export async function renderApp(
  ui: ReactElement,
  { theme = "light", language = "en" }: RenderOptions = {},
) {
  initI18n(language);
  await i18n.changeLanguage(language);
  const result = await render(wrap(ui, theme));
  return Object.assign(result, {
    rerenderApp: (next: ReactElement) => result.rerender(wrap(next, theme)),
  });
}
