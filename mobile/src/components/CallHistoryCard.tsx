import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import type { CallHistoryEntry } from "../family/callables";
import { clock12, dayWhen, durationLabel } from "../family/cards";
import { Card } from "./Card";
import { Icon, type IconName } from "./Icon";

/**
 * The last calls for one parent, newest first: Ormma's calls with their outcome and length, and the
 * family calls members logged. Times and outcomes only; nothing about what was said.
 */
export function CallHistoryCard({
  parentId,
  parentName,
  timezone,
  entries,
  names,
  loading,
}: {
  parentId: string;
  parentName: string;
  timezone: string;
  entries: CallHistoryEntry[];
  names: Record<string, string>;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const now = Date.now();

  const when = (ms: number): string => {
    const time = clock12(timezone, ms);
    const day = dayWhen(timezone, ms, now);
    return day.day === "today"
      ? time
      : day.day === "yesterday"
        ? t("screens.family.historyYesterday", { time })
        : t("screens.family.historyDate", { date: day.date, time });
  };

  return (
    <View style={{ gap: theme.spacing.sm }} testID={`history-${parentId}`}>
      <Text variant="title">{t("screens.family.historyTitle")}</Text>
      <Card style={{ gap: theme.spacing.md }}>
        {loading && entries.length === 0 ? <Text tone="muted">{t("common.loading")}</Text> : null}
        {!loading && entries.length === 0 ? <Text tone="muted">{t("screens.family.historyEmpty")}</Text> : null}
        {entries.map((entry, index) => {
          const ormma = entry.kind === "ormma";
          const ok = ormma && entry.outcome === "answered";
          const icon: IconName = ormma ? (ok ? "check" : "phoneOff") : "phone";
          const title = ormma
            ? t("screens.family.historyOrmma", { time: clock12(timezone, entry.atMs) })
            : t("screens.family.historyFamily", { name: names[entry.byUid ?? ""] || "?", parent: parentName });
          const detail = ormma
            ? entry.outcome === "answered"
              ? t("screens.family.historyAnswered", { duration: durationLabel(entry.durationSec ?? 0) })
              : entry.outcome === "failed"
                ? t("screens.family.historyFailed")
                : entry.outcome === "calling"
                  ? t("screens.family.historyCalling")
                  : t("screens.family.historyUnanswered")
            : when(entry.atMs);
          const tint = ormma
            ? ok
              ? theme.colors.status.taken
              : theme.colors.status.no_answer
            : theme.colors.status.not_taken;
          return (
            <View
              key={`${entry.kind}-${entry.atMs}-${index}`}
              testID={`history-entry-${index}`}
              style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: tint.bg,
                }}
              >
                <Icon name={icon} color={tint.icon} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{title}</Text>
                <Text variant="caption" tone="muted">
                  {detail}
                </Text>
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}
