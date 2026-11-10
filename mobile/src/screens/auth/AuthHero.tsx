import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { IllustrationFrame } from "../../components/IllustrationFrame";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import type { IllustrationName } from "../../illustrations/Illustration";

/** The Ormma mark above a small decorative illustration, shown at the top of the sign-in screens. */
export function AuthHero({ illustration }: { illustration: IllustrationName }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <View testID="auth-hero" style={{ alignItems: "center", gap: theme.spacing.sm, paddingTop: theme.spacing.lg }}>
      <Text variant="brand" tone="primary" style={{ letterSpacing: -0.3 }}>
        {t("app.brand")}
      </Text>
      <IllustrationFrame name={illustration} size={132} testID="auth-illustration" />
    </View>
  );
}
