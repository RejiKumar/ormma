import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import type { StatusKey } from "../design/tokens";
import { clock12, periodKey, wallClock, type CardKind, type DoseCard } from "../family/cards";
import { Button } from "./Button";
import { Card } from "./Card";
import { Icon, type IconName } from "./Icon";

// Card kind to the existing status palette and icon, so colour is never the only signal.
const KIND_STATUS: Record<CardKind, StatusKey> = {
  taken_on_time: "taken",
  taken: "taken",
  not_confirmed: "missed",
  calling: "calling",
  unclear: "unclear",
  scheduled: "pending",
};
const KIND_ICON: Record<CardKind, IconName> = {
  taken_on_time: "check",
  taken: "check",
  not_confirmed: "xCircle",
  calling: "phone",
  unclear: "question",
  scheduled: "clock",
};

export interface DoseCardViewProps {
  card: DoseCard;
  timezone: string;
  last: boolean;
  /** Names for the "Seen by" line, by member uid. */
  names: Record<string, string>;
  /** The signed-in member; they are left out of the "Seen by" line. */
  viewerUid: string | null;
  /** Owners and editors may mark a scheduled card as taken. */
  canMarkTaken: boolean;
  onMarkTaken: () => void;
  testID?: string;
}

/** One scheduled time on the timeline: a status node on a rail beside the card of that time's doses. */
export function DoseCardView({
  card,
  timezone,
  last,
  names,
  viewerUid,
  canMarkTaken,
  onMarkTaken,
  testID,
}: DoseCardViewProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const status = theme.colors.status[KIND_STATUS[card.kind]];
  const time = clock12(timezone, card.scheduledFor);
  const period = t(`period.${periodKey(wallClock(timezone, card.scheduledFor).hour)}`);
  const taken = card.takenAt !== null ? clock12(timezone, card.takenAt) : "";
  const badge =
    card.kind === "taken_on_time"
      ? t("screens.today.badgeTakenOnTime", { time: taken })
      : card.kind === "taken"
        ? taken.length > 0
          ? t("screens.today.badgeTaken", { time: taken })
          : t("screens.today.badgeTakenNoTime")
        : card.kind === "not_confirmed"
          ? t("screens.today.badgeNotConfirmed")
          : card.kind === "calling"
            ? t("screens.today.badgeCalling")
            : card.kind === "unclear"
              ? t("screens.today.badgeUnclear")
              : t("screens.today.badgeScheduled");
  const seen = card.seen
    .filter((entry) => entry.uid !== viewerUid && (names[entry.uid] ?? "").length > 0)
    .map((entry) => `${names[entry.uid]} ${clock12(timezone, entry.at)}`);

  return (
    <View testID={testID} style={{ flexDirection: "row", gap: theme.spacing.md }}>
      <View style={{ alignItems: "center", width: 32 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: status.bg,
          }}
        >
          <Icon name={KIND_ICON[card.kind]} color={status.icon} size={18} />
        </View>
        {last ? null : (
          <View style={{ flex: 1, width: 2, marginVertical: 4, backgroundColor: theme.colors.border }} />
        )}
      </View>
      <Card style={{ flex: 1, gap: theme.spacing.sm, marginBottom: last ? 0 : theme.spacing.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: theme.spacing.sm }}>
          <View style={{ flexShrink: 1 }}>
            <Text variant="caption" tone="muted" testID={`${testID}-time`}>
              {time}
            </Text>
            <Text variant="title">{period}</Text>
          </View>
          <View
            style={{
              backgroundColor: status.bg,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.spacing.sm + 2,
              paddingVertical: 4,
              flexShrink: 1,
            }}
          >
            <Text variant="caption" style={{ color: status.fg, fontWeight: "600" }} testID={`${testID}-badge`}>
              {badge}
            </Text>
          </View>
        </View>
        {card.medicines.length > 0 ? <Text variant="bodyStrong">{card.medicines}</Text> : null}
        {card.pills.map((pill) => (
          <View
            key={pill}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              alignSelf: "flex-start",
              backgroundColor: theme.colors.background,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.spacing.sm + 2,
              paddingVertical: 4,
            }}
          >
            <View style={{ width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: theme.colors.inkMuted }} />
            <Text variant="caption" tone="muted">
              {pill}
            </Text>
          </View>
        ))}
        {card.notes.map((note) => (
          <View
            key={note}
            testID={`${testID}-note`}
            style={{ backgroundColor: theme.colors.primaryTint, borderRadius: theme.radius.md, padding: theme.spacing.md }}
          >
            <Text variant="body">{note}</Text>
          </View>
        ))}
        {seen.length > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name="eye" color={theme.colors.inkMuted} size={14} />
            <Text variant="caption" tone="muted" testID={`${testID}-seen`} style={{ flexShrink: 1 }}>
              {t("screens.today.seenBy", { names: seen.join(" · ") })}
            </Text>
          </View>
        ) : null}
        {card.pending && canMarkTaken ? (
          <Button
            variant="secondary"
            label={t("screens.today.markTaken")}
            testID={`${testID}-mark`}
            onPress={onMarkTaken}
          />
        ) : null}
      </Card>
    </View>
  );
}
