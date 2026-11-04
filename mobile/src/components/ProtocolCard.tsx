import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { clock12, protocolSteps } from "../family/cards";
import type { FamilyParent } from "../family/useParents";
import { Icon, type IconName } from "./Icon";

const LANGUAGE_KEY = {
  "en-IN": "languages.en",
  "ml-IN": "languages.ml",
  "ta-IN": "languages.ta",
  "hi-IN": "languages.hi",
} as const;

/**
 * Ormma's check-in protocol for one parent: Call 1, the retries at the parent's gap, then the caregiver
 * alert. Times come from the parent's call policy and the dose time. Fixed texts only: it says what
 * Ormma does, never why a dose was missed. Dimmed while nothing is missed.
 */
export function ProtocolCard({
  parent,
  firstAt,
  dimmed,
}: {
  parent: FamilyParent;
  /** Scheduled time the protocol starts from, epoch ms; null hides the times. */
  firstAt: number | null;
  dimmed: boolean;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const policy = parent.callPolicy;
  const steps = protocolSteps(policy, firstAt ?? 0);
  const language = t(LANGUAGE_KEY[parent.language] ?? "languages.en");

  return (
    <View
      testID={`protocol-${parent.id}`}
      style={{
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        opacity: dimmed ? 0.7 : 1,
      }}
    >
      {steps.map((step, index) => {
        const lastRetry = step.kind === "retry" && step.n === policy.retryCount;
        const title =
          step.kind === "call"
            ? t("escalation.stepCall")
            : step.kind === "retry"
              ? t("escalation.stepRetry", { n: step.n })
              : t("escalation.stepAlert");
        const desc =
          step.kind === "call"
            ? t("escalation.descCall", { name: parent.name, language })
            : step.kind === "retry"
              ? lastRetry
                ? t("escalation.descRetryLast")
                : t("escalation.descRetry", { minutes: policy.retryGapMinutes })
              : t("escalation.descAlert");
        const icon: IconName = step.kind === "alert" ? "bell" : "phone";
        const isLast = index === steps.length - 1;
        return (
          <View key={`${step.kind}-${step.n}`} testID={`protocol-step-${index}`} style={{ flexDirection: "row", gap: theme.spacing.md }}>
            <View style={{ alignItems: "center", width: 32 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: step.kind === "alert" ? theme.colors.primaryTint : theme.colors.surfaceAlt,
                }}
              >
                <Icon name={icon} color={step.kind === "alert" ? theme.colors.primary : theme.colors.inkMuted} size={18} />
              </View>
              {isLast ? null : (
                <View style={{ flex: 1, width: 2, marginVertical: 4, backgroundColor: theme.colors.border }} />
              )}
            </View>
            <View style={{ flex: 1, paddingBottom: isLast ? 0 : theme.spacing.md, gap: 2 }}>
              {firstAt !== null ? (
                <Text variant="small" tone="muted" numeric>
                  {clock12(parent.timezone, step.at)}
                </Text>
              ) : null}
              <Text variant="label">{title}</Text>
              <Text variant="small" tone="muted" numeric>
                {desc}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
