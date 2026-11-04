import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import type { ComponentRef } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { doc, getFirestore, updateDoc } from "@react-native-firebase/firestore";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { FormError } from "../../components/FormError";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { Text } from "../../design/Text";
import { useParents } from "../../family/useParents";
import type { FamilyStackParamList } from "../../navigation/FamilyStack";

type Props = NativeStackScreenProps<FamilyStackParamList, "ParentDetails">;

const MAX_CITY = 40;
const MAX_PRESCRIBER = 60;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Owner-only editor for the details the family sees about a parent: city, prescriber and refill date. */
export function ParentDetailsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { parents, loading } = useParents();
  const parent = parents.find((p) => p.id === route.params.parentId) ?? null;
  const isOwner = parent?.role === "owner";

  const [city, setCity] = useState("");
  const [prescriber, setPrescriber] = useState("");
  const [refillDue, setRefillDue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    if (!parent || loaded) return;
    setCity(parent.city);
    setPrescriber(parent.prescriber);
    setRefillDue(parent.refillDue ?? "");
    setLoaded(true);
  }, [parent, loaded]);

  const revealError = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

  const save = async () => {
    if (!parent) return;
    const due = refillDue.trim();
    if (due.length > 0 && !DATE_PATTERN.test(due)) {
      setError(t("screens.parentDetails.errors.invalidDate"));
      revealError();
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await updateDoc(doc(getFirestore(), "parents", parent.id), {
        city: city.trim(),
        prescriber: prescriber.trim(),
        refillDue: due.length > 0 ? due : null,
      });
      navigation.goBack();
    } catch (err) {
      // Ids and statuses only in logs (hard rule 6).
      console.warn(`saveParentDetails failed code=${(err as { code?: string } | null)?.code ?? "unknown"}`);
      setError(t("screens.parentDetails.errors.failed"));
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
        isOwner ? (
          <Button
            label={t("screens.parentDetails.save")}
            testID="details-save"
            loading={saving}
            onPress={() => void save()}
          />
        ) : null
      }
    >
      <Text variant="headline">{t("screens.parentDetails.title")}</Text>
      <Text tone="muted">{t("screens.parentDetails.subtitle")}</Text>
      {loading ? <Text tone="muted">{t("common.loading")}</Text> : null}
      {parent && !isOwner ? <Banner message={t("screens.parentDetails.readOnly")} testID="details-readonly" /> : null}
      <TextField
        testID="parent-city"
        label={t("screens.parentDetails.cityLabel")}
        value={city}
        onChangeText={setCity}
        maxLength={MAX_CITY}
        autoCapitalize="words"
        editable={isOwner}
      />
      <TextField
        testID="parent-prescriber"
        label={t("screens.parentDetails.prescriberLabel")}
        value={prescriber}
        onChangeText={setPrescriber}
        hint={t("screens.parentDetails.prescriberHint")}
        maxLength={MAX_PRESCRIBER}
        autoCapitalize="words"
        editable={isOwner}
      />
      <TextField
        testID="parent-refill"
        label={t("screens.parentDetails.refillLabel")}
        value={refillDue}
        onChangeText={setRefillDue}
        hint={t("screens.parentDetails.refillHint")}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        editable={isOwner}
      />
      {error ? <FormError message={error} testID="details-error" /> : null}
    </Screen>
  );
}
