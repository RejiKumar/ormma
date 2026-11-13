import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormError } from "../../components/FormError";
import { TextField } from "../../components/TextField";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { DATE_PATTERN, MAX_TEXT, TIME_PATTERN } from "./medicineInput";

export interface ReviewDraft {
  name: string;
  doseText: string;
  frequencyText: string;
  times: string[];
  startDate: string;
}

export type ReviewStatus = "open" | "confirmed" | "discarded";

/** A card can be confirmed only with a name, at least one valid time and a valid start date. */
export function isReviewDraftReady(draft: ReviewDraft): boolean {
  const times = draft.times.map((time) => time.trim()).filter((time) => time.length > 0);
  return (
    draft.name.trim().length > 0 &&
    times.length > 0 &&
    times.every((time) => TIME_PATTERN.test(time)) &&
    DATE_PATTERN.test(draft.startDate.trim())
  );
}

export interface PrescriptionReviewCardProps {
  id: string;
  draft: ReviewDraft;
  status: ReviewStatus;
  /** Neutral marker for an illegible or low-confidence reading. Never a warning colour. */
  needsCheck: boolean;
  saving: boolean;
  failed: boolean;
  /** Today in the parent's time zone, offered by "Use today". */
  todayKey: string;
  onChange: (draft: ReviewDraft) => void;
  onConfirm: () => void;
  onDiscard: () => void;
}

/** One medicine read from a prescription: every value is editable, and nothing exists until Confirm. */
export function PrescriptionReviewCard({
  id,
  draft,
  status,
  needsCheck,
  saving,
  failed,
  todayKey,
  onChange,
  onConfirm,
  onDiscard,
}: PrescriptionReviewCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  if (status !== "open") {
    return (
      <Card testID={`review-${id}-${status}`}>
        <Text variant="bodyStrong">{draft.name}</Text>
        <Text variant="body" tone="muted">
          {status === "confirmed" ? t("screens.scan.added") : t("screens.scan.discarded")}
        </Text>
      </Card>
    );
  }

  const setTime = (index: number, value: string) =>
    onChange({ ...draft, times: draft.times.map((time, i) => (i === index ? value : time)) });

  return (
    <Card testID={`review-${id}`}>
      <View style={{ gap: theme.spacing.md }}>
        {needsCheck ? (
          <View
            testID={`review-${id}-check`}
            style={{
              alignSelf: "flex-start",
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: theme.radius.lg,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: 6,
            }}
          >
            <Text variant="micro">{t("screens.scan.checkThis")}</Text>
          </View>
        ) : null}
        <TextField
          testID={`review-${id}-name`}
          label={t("screens.medicines.nameLabel")}
          value={draft.name}
          onChangeText={(name) => onChange({ ...draft, name })}
          autoCorrect={false}
          maxLength={MAX_TEXT}
        />
        <TextField
          testID={`review-${id}-dose`}
          label={t("screens.medicines.doseLabel")}
          value={draft.doseText}
          onChangeText={(doseText) => onChange({ ...draft, doseText })}
          autoCorrect={false}
          maxLength={MAX_TEXT}
        />
        <TextField
          testID={`review-${id}-frequency`}
          label={t("screens.medicines.frequencyLabel")}
          value={draft.frequencyText}
          onChangeText={(frequencyText) => onChange({ ...draft, frequencyText })}
          maxLength={MAX_TEXT}
        />
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label">{t("screens.medicines.timesLabel")}</Text>
          {draft.times.map((time, index) => (
            <TextField
              key={index}
              testID={`review-${id}-time-${index}`}
              label={t("screens.medicines.timeLabel")}
              value={time}
              onChangeText={(value) => setTime(index, value)}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          ))}
          {draft.times.length < 24 ? (
            <Button
              label={t("screens.medicines.addTime")}
              variant="quiet"
              icon="plus"
              testID={`review-${id}-time-add`}
              onPress={() => onChange({ ...draft, times: [...draft.times, ""] })}
            />
          ) : null}
        </View>
        <TextField
          testID={`review-${id}-start`}
          label={t("screens.medicines.startDateLabel")}
          value={draft.startDate}
          onChangeText={(startDate) => onChange({ ...draft, startDate })}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={10}
        />
        <Button
          label={t("screens.scan.useToday")}
          variant="quiet"
          testID={`review-${id}-today`}
          onPress={() => onChange({ ...draft, startDate: todayKey })}
        />
        {failed ? <FormError testID={`review-${id}-error`} message={t("screens.scan.confirmFailed")} /> : null}
        <Button
          label={t("screens.scan.confirm")}
          testID={`review-${id}-confirm`}
          loading={saving}
          disabled={!isReviewDraftReady(draft)}
          onPress={onConfirm}
        />
        <Button
          label={t("screens.scan.discard")}
          variant="secondary"
          testID={`review-${id}-discard`}
          disabled={saving}
          onPress={onDiscard}
        />
      </View>
    </Card>
  );
}
