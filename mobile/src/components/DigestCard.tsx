import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share, View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { Button } from "./Button";
import { Card } from "./Card";

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
      <View>
        <Text variant="label" tone="muted">
          {t("screens.today.digestTitle")}
        </Text>
        <Text variant="title">{t("screens.today.digestSubtitle")}</Text>
      </View>
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
        icon="copy"
        label={t("screens.today.digestCopy")}
        testID={`digest-copy-${parentId}`}
        onPress={() => void copy()}
      />
      <Button
        variant="secondary"
        icon="people"
        label={t("screens.today.digestShare")}
        testID={`digest-share-${parentId}`}
        onPress={() => void Share.share({ message: text })}
      />
      {message ? (
        <Text variant="caption" tone="muted" testID={`digest-message-${parentId}`}>
          {message}
        </Text>
      ) : null}
    </Card>
  );
}
