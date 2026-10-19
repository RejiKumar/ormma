import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { I18nextProvider } from "react-i18next";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "./src/design/ThemeProvider";
import { useAppFonts } from "./src/design/useAppFonts";
import { initI18n } from "./src/i18n";
import { AppTabs } from "./src/navigation/AppTabs";

const i18n = initI18n();

/** React Navigation colours from the design tokens. */
function useNavigationTheme() {
  const { theme, name } = useTheme();
  return useMemo(() => {
    const base = name === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.ink,
        border: theme.colors.border,
        notification: theme.colors.primary,
      },
    };
  }, [theme, name]);
}

function Root() {
  const { theme, name } = useTheme();
  const navigationTheme = useNavigationTheme();
  const fontsReady = useAppFonts();
  if (!fontsReady) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  return (
    <NavigationContainer theme={navigationTheme}>
      <AppTabs />
      <StatusBar style={name === "dark" ? "light" : "dark"} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Root />
        </ThemeProvider>
      </SafeAreaProvider>
    </I18nextProvider>
  );
}
