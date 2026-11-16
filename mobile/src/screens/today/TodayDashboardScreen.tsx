import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { FadeIn } from "../../design/FadeIn";
import { DoseRing } from "../../components/DoseRing";
import { IllustrationFrame } from "../../components/IllustrationFrame";
import { FirstParentChecklistCard } from "../../onboarding/FirstParentChecklist";
import { useFirstParentChecklist, type ChecklistKey } from "../../onboarding/useFirstParentChecklist";
import { EmptyState } from "../../components/EmptyState";
import { DigestCard } from "../../components/DigestCard";
import { HeroGradient } from "../../components/HeroGradient";
import { Icon } from "../../components/Icon";
import { PresenceBar } from "../../components/PresenceBar";
import { DoseCardView } from "../../components/DoseCardView";
import { ListItem } from "../../components/ListItem";
import { LoadingState } from "../../components/LoadingState";
import { Screen } from "../../components/Screen";
import { PressableScale } from "../../design/PressableScale";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { useAlerts } from "../../family/useAlerts";
import { useCallStatus } from "../../family/useCallStatus";
import { useMedicines } from "../../family/useMedicines";
import type { DatedParent, FamilyParent } from "../../family/useParents";
import { useParents } from "../../family/useParents";
import { useTodayEvents, type TodayDoseEvent } from "../../family/useTodayEvents";
import { doc, getFirestore, Timestamp, updateDoc } from "@react-native-firebase/firestore";
import { useAuth } from "../../auth/AuthProvider";
import { clock12, groupCards, nextCard, type DoseCard, type MedicineInfo } from "../../family/cards";
import { markDosesSeen } from "../../family/callables";
import { buildDigest } from "../../family/digest";
import { useMembers } from "../../family/useMembers";
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

/** The date line in the app language ("Mon, 16 November", "തിങ്കൾ, 16 നവംബർ"). */
function heroDate(timezone: string, ms: number, language: string): string {
  try {
    return new Intl.DateTimeFormat(`${language}-IN`, { timeZone: timezone, weekday: "short", day: "numeric", month: "long" }).format(
      new Date(ms),
    );
  } catch {
    return new Date(ms).toDateString();
  }
}

/** Reassurance card: date, progress ring and one sentence on how the day is going. */
function HeroCard({ parent, cards }: { parent: FamilyParent; cards: DoseCard[] }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const total = cards.length;
  const taken = cards.filter((card) => card.kind === "taken" || card.kind === "taken_on_time").length;
  const attention = cards.some((card) => card.kind === "not_confirmed");
  const next = nextCard(cards, Date.now());
  const title = attention
    ? t("screens.today.heroAttention", { name: parent.name })
    : taken === total
      ? t("screens.today.heroAllTaken", { name: parent.name })
      : t("screens.today.heroOnTrack", { name: parent.name });
  const subtitle = next
    ? next.medicines.length > 0
      ? t("screens.today.heroNext", { medicines: next.medicines, time: clock12(parent.timezone, next.scheduledFor) })
      : t("screens.today.heroNextNoMedicine", { time: clock12(parent.timezone, next.scheduledFor) })
    : t("screens.today.heroProgress", { taken, total });
  return (
    <View
      testID={`today-hero-${parent.id}`}
      style={{
        borderRadius: theme.radius.lg,
        padding: theme.spacing.hero,
        gap: theme.spacing.lg,
        overflow: "hidden",
        backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.shadow,
        ...theme.elevation.hero,
      }}
    >
      <HeroGradient />
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <Icon name="home" color={theme.colors.inkOnPrimary} size={18} />
        <Text variant="small" tone="onPrimary" numeric style={{ opacity: 0.9 }}>
          {heroDate(parent.timezone, Date.now(), i18n.language)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
        <DoseRing onPrimary taken={taken} total={total} size={76} strokeWidth={8} />
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <Text variant="title" tone="onPrimary" lang={parent.language} style={{ lineHeight: 28, letterSpacing: -0.4 }}>
            {title}
          </Text>
          <Text
            variant="small"
            tone="onPrimary"
            numeric
            testID={`today-hero-sub-${parent.id}`}
            style={{ opacity: 0.8, lineHeight: 16 }}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      {attention ? (
        <PressableScale
          accessibilityRole="button"
          testID={`today-see-alerts-${parent.id}`}
          onPress={() => navigation.navigate("Alerts" as never)}
          style={{
            alignSelf: "flex-start",
            minHeight: 44,
            justifyContent: "center",
            borderRadius: theme.radius.pill,
            paddingVertical: 10,
            paddingHorizontal: theme.spacing.lg,
            backgroundColor: theme.colors.primaryTint,
          }}
        >
          <Text variant="label" tone="primary">
            {t("screens.today.heroSeeAlerts")}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

/** One parent's today: presence, hero summary, the dose timeline, then the family update. */
function ParentTodaySection({
  parent,
  events,
  loading,
  showName,
}: {
  parent: FamilyParent;
  events: TodayDoseEvent[];
  loading: boolean;
  /** Name heading above the section: only needed to tell several parents apart, so the hero leads a single parent. */
  showName: boolean;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { medicines } = useMedicines(parent.id);
  const { members } = useMembers(parent.id);

  const info = useMemo(() => {
    const out: Record<string, MedicineInfo> = {};
    for (const m of medicines) {
      out[m.id] = { label: [m.name, m.doseText].filter((part) => part.length > 0).join(" "), pill: m.pillDescription };
    }
    return out;
  }, [medicines]);
  const cards = useMemo(() => groupCards(events, info), [events, info]);
  const names = useMemo(() => Object.fromEntries(members.map((m) => [m.uid, m.name])), [members]);
  const digest = buildDigest(t, parent, cards, Date.now());
  const canMarkTaken = parent.role === "owner" || parent.role === "editor";

  // Read receipts: tell the server which events this member has now seen (once per event).
  const reported = useRef(new Set<string>());
  useEffect(() => {
    if (!uid || parent.consent?.status !== "granted") return;
    const ids = events
      .filter((e) => e.seenBy[uid] === undefined && !reported.current.has(e.id))
      .map((e) => e.id)
      .slice(0, 30);
    if (ids.length === 0) return;
    ids.forEach((id) => reported.current.add(id));
    void markDosesSeen({ parentId: parent.id, eventIds: ids }).catch(() => undefined);
  }, [events, uid, parent.id, parent.consent?.status]);

  const markTaken = async (card: DoseCard) => {
    if (!uid) return;
    try {
      await Promise.all(
        card.events
          .filter((e) => e.status === "pending")
          .map((e) =>
            updateDoc(doc(getFirestore(), "parents", parent.id, "doseEvents", e.id), {
              status: "taken",
              resolvedAt: Timestamp.now(),
              resolvedBy: "family",
              resolvedByUid: uid,
            }),
          ),
      );
    } catch (err) {
      // Ids and statuses only in logs (hard rule 6).
      console.warn(`markDoseTaken failed code=${(err as { code?: string } | null)?.code ?? "unknown"}`);
    }
  };

  return (
    <View testID={`today-section-${parent.id}`} style={{ gap: theme.spacing.md }}>
      {showName ? (
        <Text variant="title" lang={parent.language}>
          {parent.name}
        </Text>
      ) : null}
      {loading ? (
        <LoadingState variant="cards" testID={`today-loading-${parent.id}`} />
      ) : cards.length === 0 ? (
        <EmptyState testID={`today-empty-${parent.id}`} icon="pill" title={t("screens.today.noEvents")} />
      ) : (
        <>
          <HeroCard parent={parent} cards={cards} />
          <PresenceBar parent={parent} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Text variant="title" style={{ flexShrink: 1 }}>
              {t("screens.today.dosesTitle")}
            </Text>
            <Text variant="caption" tone="muted" style={{ flexShrink: 0, marginLeft: 8 }}>
              {t("screens.today.dosesCount", { count: cards.length })}
            </Text>
          </View>
          <View>
            {cards.map((card, index) => (
              <DoseCardView
                key={card.key}
                testID={`today-card-${parent.id}-${index}`}
                card={card}
                timezone={parent.timezone}
                last={index === cards.length - 1}
                names={names}
                viewerUid={uid}
                canMarkTaken={canMarkTaken}
                onMarkTaken={() => void markTaken(card)}
              />
            ))}
          </View>
          {digest && parent.consent?.status === "granted" ? <DigestCard parentId={parent.id} text={digest} /> : null}
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
  const { theme } = useTheme();
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
  const navigation = useNavigation();
  const checklist = useFirstParentChecklist(parents, parentsLoading);
  const { callsEnabled } = useCallStatus();

  // Each checklist row opens the screen where it is done; without a parent every step starts at Add a parent.
  const go = (tab: string, params: unknown) =>
    (navigation as unknown as { navigate: (name: string, params: unknown) => void }).navigate(tab, params);
  const openChecklist = (key: ChecklistKey) => {
    const owned = checklist.parent;
    if (key === "medicine" && owned) {
      go("Medicines", { screen: "AddMedicine", params: { parentId: owned.id } });
    } else if (key === "invite" && owned) {
      go("Family", { screen: "Invite", params: { parentId: owned.id, parentName: owned.name } });
    } else {
      go("Family", { screen: "AddParent" });
    }
  };

  return (
    <Screen
      insideTabs
      primaryAction={
        checklist.show && checklist.next ? (
          <Button
            testID="today-primary-action"
            label={t(`checklist.${checklist.next}`)}
            onPress={() => openChecklist(checklist.next as ChecklistKey)}
          />
        ) : undefined
      }
    >
      {callsEnabled === false ? <Banner testID="today-calls-soon" message={t("screens.today.callsSoon")} /> : null}
      {parentsLoading ? (
        <LoadingState variant="today" testID="today-loading" />
      ) : parents.length === 0 ? (
        <FadeIn style={{ gap: theme.spacing.lg }}>
          <EmptyState
            testID="today-no-parents"
            icon="home"
            illustration={<IllustrationFrame name="emptyParents" size={180} testID="today-no-parents-illustration" />}
            title={t("screens.today.emptyTitle")}
            description={t("screens.today.emptyDescription")}
          />
          {checklist.show ? <FirstParentChecklistCard items={checklist.items} onOpen={openChecklist} /> : null}
        </FadeIn>
      ) : (
        <FadeIn style={{ gap: theme.spacing.lg }}>
          {checklist.show ? <FirstParentChecklistCard items={checklist.items} onOpen={openChecklist} /> : null}
          {parents.map((parent) => (
            <ParentTodaySection
              key={parent.id}
              parent={parent}
              events={byParent[parent.id] ?? []}
              loading={eventsLoading}
              showName={parents.length > 1}
            />
          ))}
          <Text variant="title">{t("screens.today.alertsTitle")}</Text>
          {alertsLoading ? (
            <LoadingState variant="lines" testID="alerts-loading" />
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
        </FadeIn>
      )}
    </Screen>
  );
}
