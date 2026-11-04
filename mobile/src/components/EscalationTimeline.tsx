import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import type { StatusKey } from "../design/tokens";
import type { EscalationAttempt } from "../family/callables";
import type { FamilyParent } from "../family/useParents";
import { useEscalation } from "../family/useEscalation";
import { clock12 } from "../family/cards";
import { ContactsBlock } from "./ContactsBlock";
import { Icon, type IconName } from "./Icon";

// Outcome to the existing status palette and icon, so colour is never the only signal.
const OUTCOME_STATUS: Record<EscalationAttempt["outcome"], StatusKey> = {
  answered: "taken",
  no_answer: "no_answer",
  failed: "not_taken",
  calling: "calling",
};
const OUTCOME_ICON: Record<EscalationAttempt["outcome"], IconName> = {
  answered: "check",
  no_answer: "phoneOff",
  failed: "xCircle",
  calling: "phone",
};
const OUTCOME_LABEL = {
  answered: "escalation.answered",
  no_answer: "escalation.no_answer",
  failed: "escalation.failed_outcome",
  calling: "escalation.calling",
} as const satisfies Record<EscalationAttempt["outcome"], string>;

interface StepProps {
  icon: IconName;
  bg: string;
  fg: string;
  last: boolean;
  title: string;
  meta: string;
  testID?: string;
}

function Step({ icon, bg, fg, last, title, meta, testID }: StepProps) {
  const { theme } = useTheme();
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
            backgroundColor: bg,
          }}
        >
          <Icon name={icon} color={fg} size={18} />
        </View>
        {last ? null : (
          <View style={{ flex: 1, width: 2, marginVertical: 4, backgroundColor: theme.colors.border }} />
        )}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : theme.spacing.md, gap: 2 }}>
        <Text variant="label">{title}</Text>
        <Text variant="small" tone="muted" numeric>
          {meta}
        </Text>
      </View>
    </View>
  );
}

/**
 * The ordered call attempts for one dose (call 1, retry 1, retry 2), the time the family was alerted,
 * and the parent's emergency contacts with dialer buttons. Fixed labels only: no reasons, no advice.
 */
export function EscalationTimeline({
  parent,
  doseEventId,
}: {
  parent: FamilyParent;
  doseEventId: string;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { data, loading, failed } = useEscalation(parent.id, doseEventId, true);
  const clock = (ms: number) => clock12(parent.timezone, ms);

  const steps: Array<{ key: string; node: Omit<StepProps, "last"> }> = [];
  if (data) {
    data.attempts.forEach((attempt, index) => {
      const colors = theme.colors.status[OUTCOME_STATUS[attempt.outcome]];
      steps.push({
        key: `a${attempt.ordinal}`,
        node: {
          icon: OUTCOME_ICON[attempt.outcome],
          bg: colors.bg,
          fg: colors.icon,
          title: index === 0 ? t("escalation.call", { n: 1 }) : t("escalation.retry", { n: index }),
          meta: `${clock(attempt.startedAtMs)} · ${t(OUTCOME_LABEL[attempt.outcome])}`,
          testID: `escalation-attempt-${attempt.ordinal}`,
        },
      });
    });
    if (data.alertAtMs !== null) {
      steps.push({
        key: "alert",
        node: {
          icon: "bell",
          bg: theme.colors.primaryTint,
          fg: theme.colors.primary,
          title: t("escalation.alert"),
          meta: clock(data.alertAtMs),
          testID: "escalation-alert",
        },
      });
    }
  }

  return (
    <View testID={`escalation-${doseEventId}`} style={{ gap: theme.spacing.md }}>
      {loading ? <Text tone="muted">{t("escalation.loading")}</Text> : null}
      {failed ? <Text tone="muted">{t("escalation.failed")}</Text> : null}
      {data && steps.length === 0 ? <Text tone="muted">{t("escalation.none")}</Text> : null}
      {steps.length > 0 ? (
        <View>
          {steps.map((step, index) => (
            <Step key={step.key} {...step.node} last={index === steps.length - 1} />
          ))}
        </View>
      ) : null}
      {data && data.unplaced > 0 ? (
        <Text variant="caption" tone="muted">
          {t("escalation.unplaced", { count: data.unplaced })}
        </Text>
      ) : null}
      <ContactsBlock contacts={parent.emergencyContacts} />
    </View>
  );
}
