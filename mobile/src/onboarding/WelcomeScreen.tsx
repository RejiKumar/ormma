import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "../components/Button";
import { IllustrationFrame } from "../components/IllustrationFrame";
import { Screen } from "../components/Screen";
import { FadeIn } from "../design/FadeIn";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import type { IllustrationName } from "../illustrations/Illustration";

const STEPS = [
  { key: "calls", illustration: "welcomeCalls" },
  { key: "replies", illustration: "welcomeReplies" },
  { key: "family", illustration: "welcomeFamily" },
] as const satisfies ReadonlyArray<{ key: "calls" | "replies" | "family"; illustration: IllustrationName }>;

/**
 * First-run intro: three short steps. Each step can be skipped; finishing or skipping calls `onDone`.
 * The illustration is decorative (the step text says the same), and the step changes without
 * animation when Reduce Motion is on (FadeIn handles that).
 */
export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Screen
      primaryAction={
        <View style={{ gap: theme.spacing.xs }}>
          <Button
            testID="welcome-next"
            label={last ? t("welcome.getStarted") : t("welcome.next")}
            onPress={() => (last ? onDone() : setStep(step + 1))}
          />
          <Button variant="quiet" testID="welcome-skip" label={t("welcome.skip")} onPress={onDone} />
        </View>
      }
    >
      <FadeIn key={step} testID={`welcome-step-${step}`} style={{ gap: theme.spacing.lg }}>
        <View style={{ paddingTop: theme.spacing.sm }}>
          <IllustrationFrame name={current.illustration} size={140} testID={`welcome-illustration-${step}`} />
        </View>
        <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>
          {t("welcome.stepOf", { current: step + 1, total: STEPS.length })}
        </Text>
        <Text variant="headline" accessibilityRole="header" style={{ textAlign: "center" }}>
          {t(`welcome.${current.key}.title`)}
        </Text>
        <Text variant="body" tone="muted" style={{ textAlign: "center" }}>
          {t(`welcome.${current.key}.text`)}
        </Text>
      </FadeIn>
    </Screen>
  );
}
