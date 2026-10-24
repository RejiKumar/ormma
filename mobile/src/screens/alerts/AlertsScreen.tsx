import { Linking, View } from "react-native";
import { useTranslation } from "react-i18next";
import { arrayUnion, doc, getFirestore, updateDoc } from "@react-native-firebase/firestore";
import type { AlertType } from "../../../../shared/types";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { ListItem } from "../../components/ListItem";
import { Screen } from "../../components/Screen";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { useAlerts } from "../../family/useAlerts";
import { useParents } from "../../family/useParents";

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

export function AlertsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { parents } = useParents();
  const now = Date.now();
  const { alerts } = useAlerts(parents, { start: now - ALERTS_WINDOW_MS, end: now + ALERTS_WINDOW_MS });
  const db = getFirestore();
  const uid = user?.uid;
  const parentById = new Map(parents.map((parent) => [parent.id, parent]));

  const markRead = async (alert: { parentId: string; id: string }) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, "parents", alert.parentId, "alerts", alert.id), {
        readBy: arrayUnion(uid),
      });
    } catch {
      // Read state is best effort; the rules decide who may write it.
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
      <Text variant="title">{t("alerts.title")}</Text>
      <View style={{ gap: theme.spacing.sm }}>
        {alerts.length === 0 ? <Text tone="muted">{t("alerts.none")}</Text> : null}
        {alerts.map((alert) => {
          const parent = parentById.get(alert.parentId);
          const phone = parent?.phone ?? "";
          const isUnread = uid ? !alert.readBy.includes(uid) : false;
          const urgent = alert.type === "urgent";

          return (
            <View key={`${alert.parentId}:${alert.id}`} style={{ gap: theme.spacing.xs }}>
              {urgent ? <Banner variant="urgent" message={t("alerts.emergencyPrompt")} /> : null}
              <ListItem
                title={t(ALERT_TYPE_KEY[alert.type])}
                subtitle={`${timeLabel(alert.createdAt)}\n${alert.message}`}
                leading={<Icon name="bell" color={theme.colors.inkMuted} />}
                trailing={
                  <View
                    style={{ flexDirection: "row", gap: theme.spacing.xs, flexWrap: "wrap" }}
                  >
                    {phone ? (
                      <Button
                        label={t("alerts.callNow")}
                        variant="secondary"
                        onPress={() => callNow(phone)}
                      />
                    ) : null}
                    {alert.type === "missed_dose" && isUnread ? (
                      <Button
                        label={t("alerts.markAsTaken")}
                        variant="secondary"
                        onPress={() => void markRead(alert)}
                      />
                    ) : null}
                  </View>
                }
              />
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
