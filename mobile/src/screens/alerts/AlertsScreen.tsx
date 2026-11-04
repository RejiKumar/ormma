import { useEffect, useState } from "react";
import { Alert, Linking, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  arrayUnion,
  doc,
  getDoc,
  getFirestore,
  Timestamp,
  updateDoc,
} from "@react-native-firebase/firestore";
import type { AlertType } from "../../../../shared/types";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ContactsBlock } from "../../components/ContactsBlock";
import { EscalationTimeline } from "../../components/EscalationTimeline";
import { ProtocolCard } from "../../components/ProtocolCard";
import { Icon } from "../../components/Icon";
import { Screen } from "../../components/Screen";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { useAlerts, type FamilyAlert } from "../../family/useAlerts";
import { clock12, groupCards, nextCard } from "../../family/cards";
import { useParents, type FamilyParent } from "../../family/useParents";
import { useTodayEvents, type TodayDoseEvent } from "../../family/useTodayEvents";

const ALERTS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const ALERT_TYPE_KEY = {
  missed_dose: "alertTypes.missed_dose",
  unclear_reply: "alertTypes.unclear_reply",
  no_answer: "alertTypes.no_answer",
  trend_flag: "alertTypes.trend_flag",
  weekly_summary: "alertTypes.weekly_summary",
  urgent: "alertTypes.urgent",
} as const satisfies Record<AlertType, string>;

function timeLabel(ms: number): string {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "";
  }
}

/** The Escalation tab head for one parent: the calm card or the missed card, then the protocol or the live attempts. */
function ParentEscalation({ parent, events }: { parent: FamilyParent; events: TodayDoseEvent[] }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const cards = groupCards(events, {});
  const missed = cards.find((card) => card.kind === "not_confirmed") ?? null;
  const firstAt = missed?.scheduledFor ?? nextCard(cards, Date.now())?.scheduledFor ?? cards[cards.length - 1]?.scheduledFor ?? null;
  return (
    <View testID={`escalation-section-${parent.id}`} style={{ gap: theme.spacing.md }}>
      {missed ? (
        <Card testID={`escalation-missed-${parent.id}`} tone="tinted" style={{ gap: theme.spacing.xs }}>
          <Text variant="title">
            {t("escalation.missedTitle", { name: parent.name, time: clock12(parent.timezone, missed.scheduledFor) })}
          </Text>
          <Text variant="caption" tone="muted">
            {t("escalation.missedBody")}
          </Text>
        </Card>
      ) : (
        <Card testID={`escalation-calm-${parent.id}`} style={{ alignItems: "center", gap: theme.spacing.sm }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.primaryTint,
            }}
          >
            <Icon name="check" color={theme.colors.primary} size={26} />
          </View>
          <Text variant="title">{t("escalation.calmTitle")}</Text>
          <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>
            {t("escalation.calmBody", { name: parent.name })}
          </Text>
        </Card>
      )}
      <Text variant="title">{t("escalation.protocolTitle")}</Text>
      {missed && missed.events[0] ? (
        <Card>
          <EscalationTimeline parent={parent} doseEventId={missed.events[0].id} />
        </Card>
      ) : (
        <>
          <ProtocolCard parent={parent} firstAt={firstAt} dimmed />
          <ContactsBlock contacts={parent.emergencyContacts} disabled />
        </>
      )}
    </View>
  );
}

export function AlertsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { parents, loading: parentsLoading } = useParents();
  // One clock reading per mount: a fresh Date.now() every render would re-key the query window and restart the subscription forever.
  const [now] = useState(() => Date.now());
  const { alerts, loading } = useAlerts(parents, {
    start: now - ALERTS_WINDOW_MS,
    end: now + ALERTS_WINDOW_MS,
  });
  const { byParent } = useTodayEvents(parents, now);
  const db = getFirestore();
  const uid = user?.uid;
  const parentById = new Map(parents.map((parent) => [parent.id, parent]));
  const [takenEventIds, setTakenEventIds] = useState<Record<string, true>>({});
  const [openEscalation, setOpenEscalation] = useState<Record<string, true>>({});

  // The missed-dose alert outlives its event, so the card asks the event whether it is already
  // taken (here or on another phone) and hides the action when it is.
  useEffect(() => {
    let cancelled = false;
    const targets = new Map<string, string>();
    for (const alert of alerts) {
      if (alert.type === "missed_dose" && alert.relatedEventId) {
        targets.set(alert.relatedEventId, alert.parentId);
      }
    }
    if (targets.size === 0) {
      setTakenEventIds({});
      return;
    }
    void Promise.all(
      [...targets].map(async ([eventId, parentId]) => {
        try {
          const snap = await getDoc(doc(db, "parents", parentId, "doseEvents", eventId));
          return snap.exists() && (snap.data() as { status?: string }).status === "taken";
        } catch {
          return false;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, true> = {};
      [...targets.keys()].forEach((eventId, index) => {
        if (results[index]) next[eventId] = true;
      });
      setTakenEventIds(next);
    });
    return () => {
      cancelled = true;
    };
  }, [alerts, db]);

  /** Owner/editor only: mark the alert read (rules allow appending only the caller's uid). */
  const markRead = async (alert: FamilyAlert) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, "parents", alert.parentId, "alerts", alert.id), {
        readBy: arrayUnion(uid),
      });
    } catch {
      // Read state is best effort; the rules decide who may write it.
    }
  };

  /**
   * Owner/editor family confirmation for a missed dose: the dose event becomes taken and the
   * alert is marked read, so the open action disappears. The rules allow this narrow update only.
   */
  const markTaken = async (alert: FamilyAlert) => {
    const eventId = alert.relatedEventId;
    if (!uid || !eventId) return;
    // Hide the action immediately; the event watch keeps it hidden after a remount.
    setTakenEventIds((prev) => ({ ...prev, [eventId]: true }));
    try {
      await updateDoc(
        doc(db, "parents", alert.parentId, "doseEvents", eventId),
        {
          status: "taken",
          resolvedAt: Timestamp.now(),
          resolvedBy: "family",
          resolvedByUid: uid,
        },
      );
      await markRead(alert);
    } catch (err) {
      setTakenEventIds((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
      const code = (err as { code?: string } | null)?.code ?? "unknown";
      console.warn(`markDoseTaken failed code=${code}`);
      Alert.alert(t("common.error"));
    }
  };

  const callNow = (phone: string) => {
    if (!phone) return;
    try {
      void Linking.openURL(`tel:${phone}`);
    } catch {
      // Best effort on devices without telephony.
    }
  };

  return (
    <Screen insideTabs>
      {parents.map((parent) => (
        <ParentEscalation key={parent.id} parent={parent} events={byParent[parent.id] ?? []} />
      ))}
      {alerts.length > 0 ? <Text variant="title">{t("screens.today.alertsTitle")}</Text> : null}
      {parentsLoading || loading ? (
        <Text tone="muted">{t("common.loading")}</Text>
      ) : alerts.length === 0 ? (
        <Text tone="muted">{t("alerts.none")}</Text>
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          {alerts.map((alert) => {
            const parent = parentById.get(alert.parentId);
            const phone = parent?.phone ?? "";
            const canEdit = parent?.role === "owner" || parent?.role === "editor";
            const isUnread = uid ? !alert.readBy.includes(uid) : false;
            const urgent = alert.type === "urgent";
            // Calling the parent changes no data, so every family member may use the shortcut.
            const showCall = phone.length > 0;
            const alreadyTaken = !!alert.relatedEventId && !!takenEventIds[alert.relatedEventId];
            const escalationKey = `${alert.parentId}:${alert.id}`;
            const showEscalation =
              !!parent &&
              !!alert.relatedEventId &&
              (alert.type === "missed_dose" || alert.type === "no_answer" || alert.type === "unclear_reply");
            const showTaken =
              alert.type === "missed_dose" && canEdit && !!alert.relatedEventId && !alreadyTaken;

            return (
              <View key={`${alert.parentId}:${alert.id}`} style={{ gap: theme.spacing.sm }}>
                {urgent ? <Banner variant="urgent" message={t("alerts.emergencyPrompt")} /> : null}
                <Card style={{ gap: theme.spacing.sm }}>
                  <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
                    <Icon name="bell" color={theme.colors.inkMuted} />
                    <View style={{ flex: 1, gap: theme.spacing.xs }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                        <Text variant="bodyStrong" style={{ flex: 1 }}>
                          {t(ALERT_TYPE_KEY[alert.type])}
                        </Text>
                        {isUnread ? (
                          <Text variant="label" tone="primary">
                            {t("alerts.unread")}
                          </Text>
                        ) : null}
                      </View>
                      <Text variant="caption" tone="muted">
                        {timeLabel(alert.createdAt)}
                      </Text>
                      <Text variant="body">{alert.message}</Text>
                    </View>
                  </View>
                  {showCall || showTaken || isUnread ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                      {showCall ? (
                        <Button
                          label={t("alerts.callNow")}
                          variant="secondary"
                          onPress={() => callNow(phone)}
                        />
                      ) : null}
                      {showTaken ? (
                        <Button
                          label={t("alerts.markAsTaken")}
                          variant="secondary"
                          onPress={() => void markTaken(alert)}
                        />
                      ) : null}
                      {isUnread ? (
                        <Button
                          label={t("alerts.markAsRead")}
                          variant="quiet"
                          onPress={() => void markRead(alert)}
                        />
                      ) : null}
                    </View>
                  ) : null}
                  {showEscalation ? (
                    <View style={{ gap: theme.spacing.sm }}>
                      <Button
                        variant="quiet"
                        label={openEscalation[escalationKey] ? t("escalation.hide") : t("escalation.show")}
                        testID={`escalation-toggle-${alert.id}`}
                        onPress={() =>
                          setOpenEscalation((prev) => {
                            const next = { ...prev };
                            if (next[escalationKey]) delete next[escalationKey];
                            else next[escalationKey] = true;
                            return next;
                          })
                        }
                      />
                      {openEscalation[escalationKey] && parent && alert.relatedEventId ? (
                        <EscalationTimeline parent={parent} doseEventId={alert.relatedEventId} />
                      ) : null}
                    </View>
                  ) : null}
                </Card>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
