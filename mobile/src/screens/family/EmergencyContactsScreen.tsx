import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import type { ComponentRef } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, View } from "react-native";
import { doc, getFirestore, updateDoc } from "@react-native-firebase/firestore";
import type { EmergencyContact } from "../../../../shared/types";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormError } from "../../components/FormError";
import { Icon } from "../../components/Icon";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { useParents } from "../../family/useParents";
import type { FamilyStackParamList } from "../../navigation/FamilyStack";
import { DEFAULT_COUNTRY_CODE, isValidE164 } from "../../utils/phone";

type Props = NativeStackScreenProps<FamilyStackParamList, "EmergencyContacts">;

const MAX_CONTACTS = 3;
const MAX_LABEL = 40;
const MAX_NOTE = 60;

interface Row {
  label: string;
  kind: EmergencyContact["kind"];
  phone: string;
  note: string;
}

/** Owner-only editor for up to 3 people the family can call when a dose is missed. */
export function EmergencyContactsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { parents, loading } = useParents();
  const parent = parents.find((p) => p.id === route.params.parentId) ?? null;
  const isOwner = parent?.role === "owner";

  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // Start from what is stored, once the parent has loaded.
  useEffect(() => {
    if (!parent || loaded) return;
    setRows(parent.emergencyContacts.map((c) => ({ label: c.label, kind: c.kind, phone: c.phone, note: c.note ?? "" })));
    setLoaded(true);
  }, [parent, loaded]);

  const revealError = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const save = async () => {
    if (!parent) return;
    const cleaned = rows.map((row) => {
      const note = row.note.trim();
      return { label: row.label.trim(), kind: row.kind, phone: row.phone.trim(), ...(note.length > 0 ? { note } : {}) };
    });
    if (cleaned.some((row) => row.label.length === 0 || row.label.length > MAX_LABEL)) {
      setError(t("screens.contacts.errors.labelRequired"));
      revealError();
      return;
    }
    if (cleaned.some((row) => !isValidE164(row.phone))) {
      setError(t("screens.contacts.errors.invalidPhone"));
      revealError();
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await updateDoc(doc(getFirestore(), "parents", parent.id), { emergencyContacts: cleaned });
      navigation.goBack();
    } catch (err) {
      // Ids and statuses only in logs (hard rule 6): never the numbers.
      console.warn(`saveContacts failed code=${(err as { code?: string } | null)?.code ?? "unknown"}`);
      setError(t("screens.contacts.errors.failed"));
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
            label={t("screens.contacts.save")}
            testID="contacts-save"
            loading={saving}
            onPress={() => void save()}
          />
        ) : null
      }
    >
      <Text variant="headline">{t("screens.contacts.title")}</Text>
      <Text tone="muted">{t("screens.contacts.subtitle", { name: route.params.parentName })}</Text>
      {loading ? <Text tone="muted">{t("common.loading")}</Text> : null}
      {parent && !isOwner ? (
        <Banner message={t("screens.contacts.readOnly")} testID="contacts-readonly" />
      ) : null}
      {rows.map((row, index) => (
        <Card key={index} testID={`contact-${index}`} style={{ gap: theme.spacing.md }}>
          <TextField
            testID={`contact-label-${index}`}
            label={t("screens.contacts.label")}
            value={row.label}
            onChangeText={(label) => update(index, { label })}
            autoCapitalize="words"
            maxLength={MAX_LABEL}
            editable={isOwner}
          />
          <TextField
            testID={`contact-phone-${index}`}
            label={t("screens.contacts.phone")}
            value={row.phone}
            onChangeText={(phone) => update(index, { phone })}
            keyboardType="phone-pad"
            autoCapitalize="none"
            hint={t("screens.contacts.phoneHint")}
            editable={isOwner}
          />
          <TextField
            testID={`contact-note-${index}`}
            label={t("screens.contacts.noteLabel")}
            value={row.note}
            onChangeText={(note) => update(index, { note })}
            hint={t("screens.contacts.noteHint", { name: route.params.parentName })}
            maxLength={MAX_NOTE}
            editable={isOwner}
          />
          <View style={{ gap: theme.spacing.xs }}>
            <Text variant="label">{t("screens.contacts.kind")}</Text>
            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
              {(["neighbour", "clinic"] as const).map((kind) => {
                const selected = row.kind === kind;
                return (
                  <Pressable
                    key={kind}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    testID={`contact-kind-${index}-${kind}`}
                    disabled={!isOwner}
                    onPress={() => update(index, { kind })}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: theme.spacing.sm,
                      minHeight: 48,
                      borderRadius: theme.radius.lg,
                      borderWidth: 1.5,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                      backgroundColor: theme.colors.surface,
                      paddingHorizontal: theme.spacing.md,
                    }}
                  >
                    <View style={{ width: 20 }}>
                      {selected ? <Icon name="check" color={theme.colors.primary} size={20} /> : null}
                    </View>
                    <Text variant="body">
                      {t(kind === "clinic" ? "escalation.kindClinic" : "escalation.kindNeighbour")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {isOwner ? (
            <Button
              variant="quiet"
              label={t("screens.contacts.remove")}
              testID={`contact-remove-${index}`}
              onPress={() => setRows((current) => current.filter((_, i) => i !== index))}
            />
          ) : null}
        </Card>
      ))}
      {isOwner && rows.length < MAX_CONTACTS ? (
        <Button
          variant="secondary"
          icon="plus"
          label={t("screens.contacts.add")}
          testID="contacts-add"
          onPress={() =>
            setRows((current) => [...current, { label: "", kind: "neighbour", phone: DEFAULT_COUNTRY_CODE, note: "" }])
          }
        />
      ) : null}
      {error ? <FormError message={error} testID="contacts-error" /> : null}
    </Screen>
  );
}
