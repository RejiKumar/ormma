import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { I18nextProvider } from "react-i18next";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/auth/AuthProvider";
import { ThemeProvider, useTheme } from "./src/design/ThemeProvider";
import { themes } from "./src/design/tokens";
import { useAppFonts } from "./src/design/useAppFonts";
import { connectEmulators } from "./src/firebase/emulators";
import { initI18n } from "./src/i18n";
import { AppLanguageProvider, useAppLanguage } from "./src/i18n/AppLanguageProvider";
import { MemberLanguageSync } from "./src/i18n/MemberLanguageSync";
import { navigationRef } from "./src/navigation/navigationRef";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { PushRegistrar } from "./src/push/PushRegistrar";

connectEmulators();
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
  const { name, ready } = useTheme();
  const { ready: languageReady } = useAppLanguage();
  const navigationTheme = useNavigationTheme();
  const fontsReady = useAppFonts();
  // Hold the splash colour (the light background) until fonts and the saved theme are both ready, so a
  // dark-theme user does not see the light theme flash before the dark one is applied.
  if (!fontsReady || !ready || !languageReady) return <View style={{ flex: 1, backgroundColor: themes.light.colors.background }} />;
  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <AuthProvider>
        <PushRegistrar />
        <MemberLanguageSync />
        <RootNavigator />
        <StatusBar style={name === "dark" ? "light" : "dark"} />
      </AuthProvider>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppLanguageProvider>
            <Root />
          </AppLanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </I18nextProvider>
  );
}
