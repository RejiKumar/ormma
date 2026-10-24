import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { EmptyState } from "../../components/EmptyState";
import { ListItem } from "../../components/ListItem";
import { Screen } from "../../components/Screen";
import { StatusChip } from "../../components/StatusChip";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { useAlerts } from "../../family/useAlerts";
import type { DatedParent, FamilyParent } from "../../family/useParents";
import { useParents } from "../../family/useParents";
import { useTodayEvents, type TodayDoseEvent } from "../../family/useTodayEvents";
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

/** One parent's today: clock time in the parent's timezone plus the event's status chip. */
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
  return (
    <View testID={`today-section-${parent.id}`} style={{ gap: theme.spacing.sm }}>
      <Text variant="title" lang={parent.language}>
        {parent.name}
      </Text>
      {loading ? (
        <Text tone="muted">{t("common.loading")}</Text>
      ) : events.length === 0 ? (
        <EmptyState testID={`today-empty-${parent.id}`} icon="pill" title={t("screens.today.noEvents")} />
      ) : (
        events.map((event) => (
          <ListItem
            key={event.id}
            testID={`today-event-${parent.id}-${event.id}`}
            title={formatLocalClock(parent.timezone, event.scheduledFor)}
            chevron={false}
            trailing={<StatusChip status={event.status} testID={`today-chip-${event.id}`} />}
          />
        ))
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
      <Text variant="headline">{t("tabs.today")}</Text>
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
