import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { Card } from "../../components/Card";
import { DoseRing } from "../../components/DoseRing";
import { EmptyState } from "../../components/EmptyState";
import { DigestCard } from "../../components/DigestCard";
import { Icon } from "../../components/Icon";
import { PresenceBar } from "../../components/PresenceBar";
import { ListItem } from "../../components/ListItem";
import { Screen } from "../../components/Screen";
import { STATUS_ICON, StatusChip } from "../../components/StatusChip";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { useAlerts } from "../../family/useAlerts";
import { useMedicines } from "../../family/useMedicines";
import type { DatedParent, FamilyParent } from "../../family/useParents";
import { useParents } from "../../family/useParents";
import { useTodayEvents, type TodayDoseEvent } from "../../family/useTodayEvents";
import { buildDigest, dayLabel } from "../../family/digest";
import { formatLocalClock } from "../../family/visibility";
import type { AlertType } from "../../../../shared/types";

const ALERTS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const CLOCK_SKEW_SLACK_MS = 60 * 1000;

const ALERT_TYPE_KEY = {
  missed_dose: "alertTypes.missed_dose",
  unclear_reply: "alertTypes.unclear_reply",
  no_answer: "alertTypes.no_answer",
  trend_flag: "alertTypes.trend_flag",
  weekly_summary: "alertTypes.weekly_summary",
  urgent: "alertTypes.urgent",
} as const satisfies Record<AlertType, string>;

const ATTENTION: ReadonlySet<string> = new Set(["missed", "no_answer", "not_taken"]);

/** Reassurance card: date, progress ring and one sentence on how the day is going. */
function HeroCard({ parent, events }: { parent: FamilyParent; events: TodayDoseEvent[] }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const total = events.length;
  const taken = events.filter((event) => event.status === "taken").length;
  const attention = events.some((event) => ATTENTION.has(event.status));
  const title = attention
    ? t("screens.today.heroAttention", { name: parent.name })
    : taken === total
      ? t("screens.today.heroAllTaken", { name: parent.name })
      : t("screens.today.heroOnTrack", { name: parent.name });
  return (
    <View
      testID={`today-hero-${parent.id}`}
      style={{
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.lg,
        gap: theme.spacing.lg,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <Icon name="home" color={theme.colors.inkOnPrimary} size={18} />
        <Text variant="caption" tone="onPrimary">
          {dayLabel(parent.timezone, Date.now())}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
        <DoseRing onPrimary taken={taken} total={total} size={84} strokeWidth={9} />
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <Text variant="title" tone="onPrimary" lang={parent.language}>
            {title}
          </Text>
          <Text variant="caption" tone="onPrimary">
            {t("screens.today.heroProgress", { taken, total })}
          </Text>
        </View>
      </View>
      {attention ? (
        <Pressable
          accessibilityRole="button"
          testID={`today-see-alerts-${parent.id}`}
          onPress={() => navigation.navigate("Alerts" as never)}
          style={({ pressed }) => ({
            alignSelf: "flex-start",
            minHeight: 44,
            justifyContent: "center",
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.spacing.lg,
            backgroundColor: theme.colors.surface,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text variant="label" tone="primary">
            {t("screens.today.heroSeeAlerts")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** One dose on the timeline: a status node on a rail beside a card with the clock time and chip. */
function DoseRow({
  parent,
  event,
  last,
  medicine,
}: {
  parent: FamilyParent;
  event: TodayDoseEvent;
  last: boolean;
  /** "Metformin 500mg" for the dose, when the medicine is known. */
  medicine?: string;
}) {
  const { theme } = useTheme();
  const status = theme.colors.status[event.status];
  return (
    <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
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
          <Icon name={STATUS_ICON[event.status]} color={status.icon} size={18} />
        </View>
        {last ? null : (
          <View style={{ flex: 1, width: 2, marginVertical: 4, backgroundColor: theme.colors.border }} />
        )}
      </View>
      <Card style={{ flex: 1, paddingVertical: theme.spacing.xs, marginBottom: last ? 0 : theme.spacing.md }}>
        <ListItem
          testID={`today-event-${parent.id}-${event.id}`}
          title={formatLocalClock(parent.timezone, event.scheduledFor)}
          subtitle={medicine}
          chevron={false}
          trailing={<StatusChip status={event.status} testID={`today-chip-${event.id}`} />}
        />
      </Card>
    </View>
  );
}

/** One parent's today: hero summary, then the dose timeline in the parent's timezone. */
function ParentTodaySection({
  parent,
  events,
  loading,
}: {
  parent: FamilyParent;
  events: TodayDoseEvent[];
  loading: boolean;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const digest = buildDigest(t, parent, events, Date.now());
  const { medicines } = useMedicines(parent.id);
  const medicineLabel = (medicineId: string): string | undefined => {
    const m = medicines.find((x) => x.id === medicineId);
    return m ? [m.name, m.doseText].filter((part) => part.length > 0).join(" ") : undefined;
  };
  return (
    <View testID={`today-section-${parent.id}`} style={{ gap: theme.spacing.md }}>
      <Text variant="title" lang={parent.language}>
        {parent.name}
      </Text>
      {loading ? (
        <Text tone="muted">{t("common.loading")}</Text>
      ) : events.length === 0 ? (
        <EmptyState testID={`today-empty-${parent.id}`} icon="pill" title={t("screens.today.noEvents")} />
      ) : (
        <>
          <PresenceBar parent={parent} />
          <HeroCard parent={parent} events={events} />
          <Text variant="label" tone="muted">
            {t("screens.today.dosesTitle")}
          </Text>
          <View>
            {events.map((event, index) => (
              <DoseRow
                key={event.id}
                parent={parent}
                event={event}
                last={index === events.length - 1}
                medicine={medicineLabel(event.medicineId)}
              />
            ))}
          </View>
          {digest && parent.consent?.status === "granted" ? (
            <DigestCard parentId={parent.id} text={digest} />
          ) : null}
        </>
      )}
    </View>
  );
}

/**
 * The family dashboard: today's dose events per parent in the parent's timezone with a status
 * chip per event, the recent alerts newest first, realtime through the hooks, and the
 * medical-safety disclaimer in the footer (via Screen). Read-only for every role.
 */
export function TodayDashboardScreen() {
  const { t } = useTranslation();
  const { parents, loading: parentsLoading, reload } = useParents();
  // One clock reading per mount: the window only rolls at local midnight.
  const [now] = useState(() => Date.now());

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const datedParents: DatedParent[] = parents;
  const { byParent, loading: eventsLoading } = useTodayEvents(datedParents, now);
  const alertsWindow = useMemo(
    () => ({ start: now - ALERTS_WINDOW_MS, end: now + CLOCK_SKEW_SLACK_MS }),
    [now],
  );
  const { alerts, loading: alertsLoading } = useAlerts(datedParents, alertsWindow);

  return (
    <Screen insideTabs>
      {parentsLoading ? (
        <Text tone="muted">{t("common.loading")}</Text>
      ) : parents.length === 0 ? (
        <EmptyState
          testID="today-no-parents"
          icon="home"
          title={t("screens.today.emptyTitle")}
          description={t("screens.today.emptyDescription")}
        />
      ) : (
        <>
          {parents.map((parent) => (
            <ParentTodaySection
              key={parent.id}
              parent={parent}
              events={byParent[parent.id] ?? []}
              loading={eventsLoading}
            />
          ))}
          <Text variant="title">{t("screens.today.alertsTitle")}</Text>
          {alertsLoading ? (
            <Text tone="muted">{t("common.loading")}</Text>
          ) : alerts.length === 0 ? (
            <Text testID="today-no-alerts" tone="muted">
              {t("screens.today.noAlerts")}
            </Text>
          ) : (
            alerts.map((alert) => (
              <ListItem
                key={alert.id}
                testID={`today-alert-${alert.id}`}
                title={alert.message}
                subtitle={t(ALERT_TYPE_KEY[alert.type])}
                chevron={false}
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}
