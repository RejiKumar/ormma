import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { doc, getFirestore, updateDoc } from "@react-native-firebase/firestore";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { FormError } from "../../components/FormError";
import { Screen } from "../../components/Screen";
import { Text } from "../../design/Text";
import { useParents } from "../../family/useParents";
import type { MedicineStackParamList } from "../../navigation/MedicineStack";
import {
  MEDICINE_ERROR_KEY,
  medicineUpdatePayload,
  validateMedicineDraft,
  type MedicineDraft,
  type MedicineDraftError,
} from "./medicineInput";
import { MedicineFormFields } from "./MedicineFormFields";

type Props = NativeStackScreenProps<MedicineStackParamList, "EditMedicine">;

/**
 * Edit a medicine: fields pre-filled, save writes only name/dose/times/startDate, and
 * deactivation (with a confirmation step) flips active to false - the document is never deleted
 * (access-control "Deactivation instead of deletion").
 */
export function EditMedicineScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { medicine, parentId } = route.params;
  const { parents, loading } = useParents();
  const parent = parents.find((p) => p.id === parentId) ?? null;
  const canEdit = parent?.role === "owner" || parent?.role === "editor";

  const [draft, setDraft] = useState<MedicineDraft>({
    name: medicine.name,
    doseText: medicine.doseText,
    times: medicine.times.length > 0 ? medicine.times : [""],
    startDate: medicine.startDate,
  });
  const [errorKey, setErrorKey] = useState<MedicineDraftError | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);

  const [active, setActive] = useState(medicine.active);

  const medicineRef = useMemo(
    () => doc(getFirestore(), "parents", parentId, "medicines", medicine.id),
    [parentId, medicine.id],
  );

  const save = async () => {
    const invalid = validateMedicineDraft(draft);
    setErrorKey(invalid);
    setSaveFailed(false);
    if (invalid) return;
    setSaving(true);
    try {
      await updateDoc(medicineRef, medicineUpdatePayload(draft));
      navigation.goBack();
    } catch (err) {
      // Ids and statuses only in logs (hard rule 6).
      const code = (err as { code?: string } | null)?.code ?? "unknown";
      console.warn(`updateMedicine failed code=${code}`);
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const setActiveState = async (next: boolean) => {
    setSaving(true);
    setSaveFailed(false);
    try {
      await updateDoc(medicineRef, { active: next });
      setActive(next);
      setConfirmingDeactivate(false);
      navigation.goBack();
    } catch (err) {
      const code = (err as { code?: string } | null)?.code ?? "unknown";
      console.warn(`updateMedicine active failed code=${code}`);
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      primaryAction={
        canEdit ? (
          <Button
            label={t("screens.medicines.save")}
            testID="medicine-save"
            loading={saving}
            onPress={() => void save()}
          />
        ) : null
      }
    >
      <Text variant="headline">{t("screens.medicines.editTitle")}</Text>
      {loading ? <Text tone="muted">{t("common.loading")}</Text> : null}
      {parent && !canEdit ? (
        <Banner variant="info" message={t("screens.medicines.readOnly")} testID="medicine-readonly" />
      ) : null}
      <MedicineFormFields
        draft={draft}
        onChange={setDraft}
        testIDPrefix="medicine"
        editable={canEdit}
      />
      {errorKey ? <FormError testID="medicine-error" message={t(MEDICINE_ERROR_KEY[errorKey])} /> : null}
      {saveFailed ? (
        <FormError testID="medicine-save-error" message={t("screens.medicines.errors.failed")} />
      ) : null}
      {canEdit ? (
        <Button
          label={t(active ? "screens.medicines.deactivate" : "screens.medicines.reactivate")}
          variant="secondary"
          testID="medicine-toggle-active"
          onPress={() => (active ? setConfirmingDeactivate(true) : void setActiveState(true))}
        />
      ) : null}
      {canEdit && confirmingDeactivate ? (
        <Banner
          variant="info"
          message={t("screens.medicines.deactivateWarning")}
          actionLabel={t("screens.medicines.confirmDeactivate")}
          onAction={() => void setActiveState(false)}
          testID="medicine-deactivate-confirm"
        />
      ) : null}
      {canEdit && confirmingDeactivate ? (
        <Button
          label={t("screens.medicines.cancel")}
          variant="quiet"
          testID="medicine-deactivate-cancel"
          onPress={() => setConfirmingDeactivate(false)}
        />
      ) : null}
    </Screen>
  );
}
