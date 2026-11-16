import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { useAppLanguage } from "../../i18n/AppLanguageProvider";
import type { LanguagePreference } from "../../i18n/appLanguage";
import { SUPPORTED_LANGUAGES } from "../../i18n";

const LANGUAGE_NAME = {
  en: "languages.en",
  ml: "languages.ml",
  ta: "languages.ta",
  hi: "languages.hi",
} as const;

/**
 * The App language choice: Phone language, then each language written in its own script (so a person can
 * find theirs whatever language the app is showing now). The active choice is marked.
 */
export function AppLanguageCard() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { preference, setPreference } = useAppLanguage();
  const options: Array<{ value: LanguagePreference; label: string }> = [
    { value: "system", label: t("settings.languagePhone") },
    ...SUPPORTED_LANGUAGES.map((code) => ({ value: code as LanguagePreference, label: t(LANGUAGE_NAME[code]) })),
  ];

  return (
    <Card style={{ gap: theme.spacing.sm }} testID="app-language-card">
      {options.map((option) => {
        const selected = preference === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            testID={`app-language-${option.value}`}
            onPress={() => void setPreference(option.value)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.md,
              minHeight: 48,
              borderRadius: theme.radius.lg,
              borderWidth: 1.5,
              borderColor: selected ? theme.colors.primary : theme.colors.border,
              backgroundColor: theme.colors.surface,
              paddingHorizontal: theme.spacing.lg,
            }}
          >
            <View style={{ width: 20 }}>{selected ? <Icon name="check" color={theme.colors.primary} size={20} /> : null}</View>
            <Text variant="body">{option.label}</Text>
          </Pressable>
        );
      })}
    </Card>
  );
}
