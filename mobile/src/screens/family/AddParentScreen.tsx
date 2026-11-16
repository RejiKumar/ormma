import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ComponentRef } from "react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { Button } from "../../components/Button";
import { UpgradeSheet } from "../../components/UpgradeSheet";
import { FormError } from "../../components/FormError";
import { planLimitReason } from "../../family/planErrors";
import { Screen } from "../../components/Screen";
import { PhoneField } from "../../components/PhoneField";
import { TextField } from "../../components/TextField";
import { Text } from "../../design/Text";
import { createParent } from "../../family/callables";
import { addParentId } from "../../family/parentIds";
import type { FamilyStackParamList } from "../../navigation/FamilyStack";
import type { Language } from "../../../../shared/types";
import i18n, { pickLanguage, type AppLanguage } from "../../i18n";
import { CallLanguagePicker } from "./CallLanguagePicker";
import { isValidIndiaMobile, toE164India } from "../../utils/phone";

type Props = NativeStackScreenProps<FamilyStackParamList, "AddParent">;

/** "en" â†’ "en-IN", the shared Language tag the callable validates. */
const toLanguageTag = (code: AppLanguage): Language => `${code}-IN`;

/** Add a parent: name, E.164 phone, language in its own script â†’ createParent. */
export function AddParentScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<AppLanguage>(() => pickLanguage(i18n.language));
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [planLimit, setPlanLimit] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // The error renders below the last field; reveal it so a failed save is never silent.
  const revealError = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

  const save = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError(t("screens.addParent.errors.nameRequired"));
      revealError();
      return;
    }
    if (!isValidIndiaMobile(phone)) {
      setError(t("auth.errors.invalidPhone"));
      revealError();
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      const result = await createParent({
        name: trimmedName,
        phone: toE164India(phone),
        language: toLanguageTag(language),
      });
      await addParentId(result.parentId);
      navigation.goBack();
    } catch (err) {
      // Ids and statuses only in logs (hard rule 6).
      const code = (err as { code?: string } | null)?.code ?? "unknown";
      console.warn(`createParent failed code=${code}`);
      const limited = planLimitReason(err) === "plan_parent_limit";
      setPlanLimit(limited);
      setError(limited ? t("subscription.limitParent") : t("screens.addParent.errors.failed"));
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
        <Button
          label={t("screens.addParent.save")}
          testID="add-save"
          loading={saving}
          onPress={() => void save()}
        />
      }
    >
      <Text tone="muted">{t("screens.addParent.subtitle")}</Text>
      <TextField
        testID="add-name"
        label={t("screens.addParent.nameLabel")}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      <PhoneField
        testID="add-phone"
        label={t("screens.addParent.phoneLabel")}
        value={phone}
        onChangeValue={setPhone}
      />
      <CallLanguagePicker value={language} onChange={setLanguage} />
      {error ? <FormError message={error} testID="add-error" /> : null}
      <UpgradeSheet
        visible={planLimit}
        message={t("subscription.limitParent")}
        onSeePlans={() => {
          setPlanLimit(false);
          navigation.navigate("Subscription");
        }}
        onClose={() => setPlanLimit(false)}
      />
    </Screen>
  );
}
