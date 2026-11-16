import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { Icon } from "../../components/Icon";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { SUPPORTED_LANGUAGES, type AppLanguage } from "../../i18n";

const LANGUAGE_KEY = {
  en: "languages.en",
  ml: "languages.ml",
  ta: "languages.ta",
  hi: "languages.hi",
} as const;

/**
 * The language a parent is phoned in: the four languages, each written in its own script, the current one
 * marked. Used when adding a parent and in Parent details. `editable` false shows the choice without
 * letting it change (a member who is not the owner).
 */
export function CallLanguagePicker({
  value,
  onChange,
  editable = true,
}: {
  value: AppLanguage;
  onChange: (code: AppLanguage) => void;
  editable?: boolean;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="label">{t("screens.addParent.languageLabel")}</Text>
      <View style={{ gap: theme.spacing.sm }}>
        {SUPPORTED_LANGUAGES.map((code) => {
          const selected = value === code;
          return (
            <Pressable
              key={code}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !editable }}
              accessibilityLabel={t(LANGUAGE_KEY[code])}
              testID={`lang-${code}`}
              disabled={!editable}
              onPress={() => onChange(code)}
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
                opacity: editable || selected ? 1 : 0.6,
              }}
            >
              <View style={{ width: 20 }}>{selected ? <Icon name="check" color={theme.colors.primary} size={20} /> : null}</View>
              <Text variant="body">{t(LANGUAGE_KEY[code])}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
