import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share, View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { Button } from "./Button";
import { Card } from "./Card";
import { Toast } from "./Toast";

/**
 * The family update as plain text with "Copy update for WhatsApp" and "Share update". The text is built
 * on the device from a fixed template; the app never sends it and never stores or logs it.
 */
export function DigestCard({ parentId, text }: { parentId: string; text: string }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [message, setMessage] = useState<string | null>(null);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(text);
      setMessage(t("screens.today.digestCopied"));
    } catch {
      setMessage(t("screens.today.digestCopyFailed"));
    }
  };

  return (
    <Card testID={`digest-${parentId}`} style={{ gap: theme.spacing.md }}>
      <View style={{ gap: 2 }}>
        <Text variant="cardTitle">{t("screens.today.digestTitle")}</Text>
        <Text variant="chip" tone="muted">
          {t("screens.today.digestSubtitle")}
        </Text>
      </View>
      <View
        style={{
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.chip,
          padding: theme.spacing.md,
        }}
      >
        <Text variant="meta" style={{ fontWeight: "400", lineHeight: 20 }} testID={`digest-text-${parentId}`}>
          {text}
        </Text>
      </View>
      <Button
        compact
        icon="copy"
        label={t("screens.today.digestCopy")}
        testID={`digest-copy-${parentId}`}
        onPress={() => void copy()}
      />
      <Button
        compact
        variant="secondary"
        icon="people"
        label={t("screens.today.digestShare")}
        testID={`digest-share-${parentId}`}
        onPress={() => void Share.share({ message: text })}
      />
      {message ? <Toast message={message} testID={`digest-message-${parentId}`} /> : null}
    </Card>
  );
}
