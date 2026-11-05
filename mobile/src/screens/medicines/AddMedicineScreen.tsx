import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ComponentRef } from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { getAuth } from "@react-native-firebase/auth";
import { doc, getFirestore, setDoc, Timestamp } from "@react-native-firebase/firestore";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { FormError } from "../../components/FormError";
import { Screen } from "../../components/Screen";
import { Text } from "../../design/Text";
import { useParents } from "../../family/useParents";
import { localDateKey } from "../../family/visibility";
import type { MedicineStackParamList } from "../../navigation/MedicineStack";
import {
  MEDICINE_ERROR_KEY,
  medicineCreatePayload,
  newMedicineId,
  validateMedicineDraft,
  type MedicineDraft,
  type MedicineDraftError,
} from "./medicineInput";
import { MedicineFormFields } from "./MedicineFormFields";
import { LoadingState } from "../../components/LoadingState";

type Props = NativeStackScreenProps<MedicineStackParamList, "AddMedicine">;

/**
 * Add a medicine by hand: validation, then a create with source "manual" and
 * confirmedByHuman true (access-control "Manual medicine creation semantics").
 */
export function AddMedicineScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { parents, loading } = useParents();
  const parent = parents.find((p) => p.id === route.params.parentId) ?? null;
  const canEdit = parent?.role === "owner" || parent?.role === "editor";

  const [draft, setDraft] = useState<MedicineDraft>({
    name: "",
    doseText: "",
    times: [""],
    startDate: "",
    frequencyText: "",
    pillDescription: "",
    purpose: "",
  });
  const [errorKey, setErrorKey] = useState<MedicineDraftError | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // Errors render below the last field; reveal them so a failed save is never silent.
  const revealError = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

  useEffect(() => {
    if (!parent) return;
    setDraft((current) =>
      current.startDate.length === 0
        ? { ...current, startDate: localDateKey(parent.timezone, Date.now()) }
        : current,
    );
  }, [parent]);

  const save = async () => {
    if (!parent) return;
    const invalid = validateMedicineDraft(draft);
    setErrorKey(invalid);
    setSaveFailed(false);
    if (invalid) {
      revealError();
      return;
    }

    const uid = getAuth().currentUser?.uid;
    setSaving(true);
    try {
      const db = getFirestore();
      await setDoc(
        doc(db, "parents", parent.id, "medicines", newMedicineId()),
        medicineCreatePayload(draft, String(uid ?? ""), Timestamp.now()),
      );
      navigation.goBack();
    } catch (err) {
      // Ids and statuses only in logs (hard rule 6).
      const code = (err as { code?: string } | null)?.code ?? "unknown";
      console.warn(`createMedicine failed code=${code}`);
      setSaveFailed(true);
      revealError();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      belowHeader
      scrollRef={scrollRef}
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
      <Text variant="headline">{t("screens.medicines.addTitle")}</Text>
      {loading ? <LoadingState variant="lines" testID="add-medicine-loading" /> : null}
      {parent && !canEdit ? (
        <Banner variant="info" message={t("screens.medicines.readOnly")} testID="medicine-readonly" />
      ) : null}
      <MedicineFormFields draft={draft} onChange={setDraft} testIDPrefix="medicine" editable={canEdit} />
      {errorKey ? <FormError testID="medicine-error" message={t(MEDICINE_ERROR_KEY[errorKey])} /> : null}
      {saveFailed ? (
        <FormError testID="medicine-save-error" message={t("screens.medicines.errors.failed")} />
      ) : null}
    </Screen>
  );
}
