import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import type { MedicineDraft } from "./medicineInput";

export interface MedicineFormFieldsProps {
  draft: MedicineDraft;
  onChange: (draft: MedicineDraft) => void;
  /** Test ids are prefixed per screen: add-* or edit-*. */
  testIDPrefix: string;
  /** Read-only mode for viewers: fields are shown but cannot be changed. */
  editable?: boolean;
}

/** Shared fields for add and edit: name, dose, dynamic HH:mm rows, start date. */
export function MedicineFormFields({
  draft,
  onChange,
  testIDPrefix,
  editable = true,
}: MedicineFormFieldsProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const setTime = (index: number, value: string) => {
    const times = draft.times.map((time, i) => (i === index ? value : time));
    onChange({ ...draft, times });
  };

  const addTime = () => {
    if (draft.times.length >= 24) return;
    onChange({ ...draft, times: [...draft.times, ""] });
  };

  const removeTime = (index: number) => {
    if (draft.times.length <= 1) return;
    onChange({ ...draft, times: draft.times.filter((_, i) => i !== index) });
  };

  return (
    <View style={{ gap: theme.spacing.md }}>
      <TextField
        testID={`${testIDPrefix}-name`}
        label={t("screens.medicines.nameLabel")}
        value={draft.name}
        onChangeText={(name) => onChange({ ...draft, name })}
        autoCapitalize="words"
        editable={editable}
      />
      <TextField
        testID={`${testIDPrefix}-dose`}
        label={t("screens.medicines.doseLabel")}
        value={draft.doseText}
        onChangeText={(doseText) => onChange({ ...draft, doseText })}
        hint={t("screens.medicines.doseHint")}
        editable={editable}
      />
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="label">{t("screens.medicines.timesLabel")}</Text>
        {draft.times.map((time, index) => (
          <View
            key={index}
            style={{ flexDirection: "row", alignItems: "flex-end", gap: theme.spacing.sm }}
          >
            <View style={{ flex: 1 }}>
              <TextField
                testID={`${testIDPrefix}-time-${index}`}
                label={t("screens.medicines.timeLabel")}
                value={time}
                onChangeText={(value) => setTime(index, value)}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                editable={editable}
              />
            </View>
            {editable && draft.times.length > 1 ? (
              <Button
                label={t("screens.medicines.removeTime")}
                variant="quiet"
                testID={`${testIDPrefix}-time-remove-${index}`}
                onPress={() => removeTime(index)}
              />
            ) : null}
          </View>
        ))}
        {editable ? (
          <Button
            label={t("screens.medicines.addTime")}
            variant="quiet"
            icon="plus"
            testID={`${testIDPrefix}-time-add`}
            onPress={addTime}
            disabled={draft.times.length >= 24}
          />
        ) : null}
      </View>
      <TextField
        testID={`${testIDPrefix}-start`}
        label={t("screens.medicines.startDateLabel")}
        value={draft.startDate}
        onChangeText={(startDate) => onChange({ ...draft, startDate })}
        hint={t("screens.medicines.startDateHint")}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={10}
        editable={editable}
      />
    </View>
  );
}
