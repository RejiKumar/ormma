import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch, View } from "react-native";
import type { NotifyPrefs } from "../../../shared/types";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { setNotifyPrefs } from "../family/callables";
import { DEFAULT_NOTIFY } from "../family/useMembers";
import { Card } from "./Card";

type Key = keyof NotifyPrefs;

const ROWS: Array<{ key: Key; label: "notifyMissed" | "notifySummary" | "notifyQuiet"; desc: "notifyMissedDesc" | "notifySummaryDesc" | "notifyQuietDesc" }> = [
  { key: "missed", label: "notifyMissed", desc: "notifyMissedDesc" },
  { key: "summary", label: "notifySummary", desc: "notifySummaryDesc" },
  { key: "quiet", label: "notifyQuiet", desc: "notifyQuietDesc" },
];

/**
 * The signed-in member's own three notification settings. Each toggle saves immediately through the
 * preferences function (the server writes only the caller's own document) and rolls back on failure.
 * Urgent alerts are never affected by these settings.
 */
export function NotificationsCard({ parentId, current }: { parentId: string; current: NotifyPrefs | null }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [prefs, setPrefs] = useState<NotifyPrefs>(current ?? DEFAULT_NOTIFY);
  const [error, setError] = useState(false);

  // Follow the stored value when it changes elsewhere (another phone).
  useEffect(() => {
    if (current) setPrefs(current);
  }, [current]);

  const toggle = async (key: Key, value: boolean) => {
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setError(false);
    try {
      await setNotifyPrefs({ parentId, ...next });
    } catch (err) {
      // Ids and statuses only in logs (hard rule 6).
      console.warn(`notifyPrefs failed code=${(err as { code?: string } | null)?.code ?? "unknown"}`);
      setPrefs(previous);
      setError(true);
    }
  };

  return (
    <View style={{ gap: theme.spacing.sm }} testID={`notifications-${parentId}`}>
      <Text variant="title">{t("screens.family.notificationsTitle")}</Text>
      <Card style={{ gap: theme.spacing.md }}>
        {ROWS.map((row, index) => (
          <View
            key={row.key}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.md,
              ...(index > 0 ? { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.md } : {}),
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{t(`screens.family.${row.label}`)}</Text>
              <Text variant="caption" tone="muted">
                {t(`screens.family.${row.desc}`)}
              </Text>
            </View>
            <Switch
              testID={`notify-${row.key}`}
              accessibilityLabel={t(`screens.family.${row.label}`)}
              value={prefs[row.key]}
              onValueChange={(value) => void toggle(row.key, value)}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            />
          </View>
        ))}
        {error ? (
          <Text variant="caption" tone="muted" testID="notify-error">
            {t("screens.family.prefsFailed")}
          </Text>
        ) : null}
      </Card>
    </View>
  );
}
