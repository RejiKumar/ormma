import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";

/** The medical disclaimer, shown on every screen through the Screen layout. Text comes from the catalogue. */
export function DisclaimerFooter() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <View
      testID="disclaimer-footer"
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        alignItems: "center",
      }}
    >
      <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>
        {t("disclaimer.medical")}
      </Text>
    </View>
  );
}
