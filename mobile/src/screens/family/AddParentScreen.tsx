import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ComponentRef } from "react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, View } from "react-native";
import { Button } from "../../components/Button";
import { FormError } from "../../components/FormError";
import { planLimitReason } from "../../family/planErrors";
import { Icon } from "../../components/Icon";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { createParent } from "../../family/callables";
import { addParentId } from "../../family/parentIds";
import type { FamilyStackParamList } from "../../navigation/FamilyStack";
import type { Language } from "../../../../shared/types";
import i18n, { pickLanguage, SUPPORTED_LANGUAGES, type AppLanguage } from "../../i18n";
import { DEFAULT_COUNTRY_CODE, isValidE164 } from "../../utils/phone";

type Props = NativeStackScreenProps<FamilyStackParamList, "AddParent">;

const LANGUAGE_KEY = {
  en: "languages.en",
  ml: "languages.ml",
  ta: "languages.ta",
  hi: "languages.hi",
} as const;

/** "en" â†’ "en-IN", the shared Language tag the callable validates. */
const toLanguageTag = (code: AppLanguage): Language => `${code}-IN`;

/** Add a parent: name, E.164 phone, language in its own script â†’ createParent. */
export function AddParentScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(DEFAULT_COUNTRY_CODE);
  const [language, setLanguage] = useState<AppLanguage>(() => pickLanguage(i18n.language));
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [planLimit, setPlanLimit] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // The error renders below the last field; reveal it so a failed save is never silent.
  const revealError = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

  const save = async () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (trimmedName.length === 0) {
      setError(t("screens.addParent.errors.nameRequired"));
      revealError();
      return;
    }
    if (!isValidE164(trimmedPhone)) {
      setError(t("auth.errors.invalidPhone"));
      revealError();
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      const result = await createParent({
        name: trimmedName,
        phone: trimmedPhone,
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
      <Text variant="headline">{t("screens.addParent.title")}</Text>
      <Text tone="muted">{t("screens.addParent.subtitle")}</Text>
      <TextField
        testID="add-name"
        label={t("screens.addParent.nameLabel")}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      <TextField
        testID="add-phone"
        label={t("screens.addParent.phoneLabel")}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        autoCapitalize="none"
        hint={t("screens.addParent.phoneHint")}
      />
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="label">{t("screens.addParent.languageLabel")}</Text>
        <View style={{ gap: theme.spacing.sm }}>
          {SUPPORTED_LANGUAGES.map((code) => {
            const selected = language === code;
            return (
              <Pressable
                key={code}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={t(LANGUAGE_KEY[code])}
                testID={`lang-${code}`}
                onPress={() => setLanguage(code)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.md,
                  minHeight: 48,
                  borderRadius: theme.radius.lg,
                  borderWidth: 1.5,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  paddingHorizontal: theme.spacing.lg,
                }}
              >
                <View style={{ width: 20 }}>{selected ? <Icon name="check" color={theme.colors.primary} size={20} /> : null}</View>
                <Text variant="body">{t(LANGUAGE_KEY[code])}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {error ? <FormError message={error} testID="add-error" /> : null}
      {planLimit ? (
        <Button
          variant="secondary"
          label={t("subscription.seePlans")}
          testID="add-see-plans"
          onPress={() => navigation.navigate("Subscription")}
        />
      ) : null}
    </Screen>
  );
}
