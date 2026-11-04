import { useTranslation } from "react-i18next";
import { Share, View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { Button } from "./Button";
import { Card } from "./Card";

/**
 * The family update as plain text with a "Share update" action. The text is built on the device from
 * a fixed template; it is handed to the system share sheet and never stored or logged.
 */
export function DigestCard({ parentId, text }: { parentId: string; text: string }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <Card testID={`digest-${parentId}`} style={{ gap: theme.spacing.md }}>
      <Text variant="label" tone="muted">
        {t("screens.today.digestTitle")}
      </Text>
      <View
        style={{
          backgroundColor: theme.colors.primaryTint,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
        }}
      >
        <Text variant="body" testID={`digest-text-${parentId}`}>
          {text}
        </Text>
      </View>
      <Button
        variant="secondary"
        icon="people"
        label={t("screens.today.digestShare")}
        testID={`digest-share-${parentId}`}
        onPress={() => void Share.share({ message: text })}
      />
    </Card>
  );
}
