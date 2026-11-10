import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { doc, getDoc, getFirestore } from "@react-native-firebase/firestore";
import { getAuth, signOut } from "@react-native-firebase/auth";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { useAuth } from "../../auth/AuthProvider";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ListItem } from "../../components/ListItem";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { Text } from "../../design/Text";
import { useTheme, type ThemePreference } from "../../design/ThemeProvider";
import { deleteMyAccount, setMyDisplayName } from "../../family/callables";
import { useSubscription } from "../../family/useSubscription";
import type { FamilyStackParamList } from "../../navigation/FamilyStack";

type Props = NativeStackScreenProps<FamilyStackParamList, "Settings">;

const CHOICES: Array<{ value: ThemePreference; label: "settings.light" | "settings.dark" | "settings.system" }> = [
  { value: "light", label: "settings.light" },
  { value: "dark", label: "settings.dark" },
  { value: "system", label: "settings.system" },
];

const shortDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Settings: Account (name, plan, sign out, delete), Appearance, Privacy policy and Terms. */
export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme, preference, setPreference } = useTheme();
  const { user } = useAuth();
  const { plan, entitlement } = useSubscription();
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getDoc(doc(getFirestore(), "users", user.uid))
      .then((snap) => {
        const stored = snap.exists() ? (snap.data() as { displayName?: unknown }).displayName : "";
        if (active && typeof stored === "string") {
          setName(stored);
          setSavedName(stored);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user]);

  const saveName = async () => {
    setSaving(true);
    setNameMessage(null);
    try {
      await setMyDisplayName(name.trim());
      setSavedName(name.trim());
      setNameMessage(t("settings.nameSaved"));
    } catch (error) {
      // Ids and statuses only in logs (hard rule 6).
      console.warn(`setMyDisplayName failed code=${(error as { code?: string } | null)?.code ?? "unknown"}`);
      setNameMessage(t("settings.nameFailed"));
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = () => {
    Alert.alert(t("settings.signOut"), t("settings.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.signOut"),
        style: "destructive",
        // AuthProvider sees the change and the navigator returns to the sign-in screen.
        onPress: () => void signOut(getAuth()).catch(() => Alert.alert(t("common.error"))),
      },
    ]);
  };

  const confirmDelete = async () => {
    setDeleteMessage(null);
    try {
      await deleteMyAccount();
      await signOut(getAuth()).catch(() => undefined);
    } catch (error) {
      const e = error as { code?: string; details?: { reason?: string } } | null;
      console.warn(`deleteMyAccount failed code=${e?.code ?? "unknown"}`);
      setDeleteMessage(e?.details?.reason === "owns_parents" ? t("settings.ownsParents") : t("settings.deleteFailed"));
    }
  };

  const onDelete = () => {
    Alert.alert(t("settings.deleteTitle"), t("settings.deleteMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("settings.deleteConfirm"), style: "destructive", onPress: () => void confirmDelete() },
    ]);
  };

  const planLine =
    plan === "family"
      ? entitlement && Date.now() < entitlement.expiresAtMs
        ? `${t("settings.planFamily")} · ${t("settings.planUntil", { date: shortDate(entitlement.expiresAtMs) })}`
        : `${t("settings.planFamily")} · ${t("settings.planGrace", { date: shortDate(entitlement?.expiresAtMs ?? Date.now()) })}`
      : t("settings.planFree");

  return (
    <Screen belowHeader>
      <Text variant="section" accessibilityRole="header">
        {t("settings.accountTitle")}
      </Text>
      <Card style={{ gap: theme.spacing.md }}>
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="label" tone="muted">
            {t("settings.phoneLabel")}
          </Text>
          <Text variant="body" testID="settings-phone">
            {user?.phoneNumber ?? ""}
          </Text>
        </View>
        <TextField
          testID="settings-name"
          label={t("settings.nameLabel")}
          value={name}
          onChangeText={(value) => {
            setName(value);
            setNameMessage(null);
          }}
          maxLength={60}
        />
        <Button
          variant="secondary"
          label={t("settings.saveName")}
          testID="settings-save-name"
          loading={saving}
          disabled={name.trim().length === 0 || name.trim() === savedName}
          onPress={() => void saveName()}
        />
        {nameMessage ? (
          <Text variant="caption" tone="muted" testID="settings-name-message">
            {nameMessage}
          </Text>
        ) : null}
        <ListItem
          testID="settings-plan"
          title={t("settings.planLabel")}
          subtitle={planLine}
          onPress={() => navigation.navigate("Subscription")}
          accessibilityLabel={`${t("settings.planLabel")}, ${planLine}`}
        />
        <Button variant="quiet" label={t("settings.signOut")} testID="settings-sign-out" onPress={onSignOut} />
        <Button variant="quiet" label={t("settings.deleteAccount")} testID="settings-delete" onPress={onDelete} />
        {deleteMessage ? <Banner testID="settings-delete-message" message={deleteMessage} /> : null}
      </Card>

      <Text variant="section" accessibilityRole="header">
        {t("settings.appearanceTitle")}
      </Text>
      <Card style={{ gap: theme.spacing.sm }}>
        {CHOICES.map((choice) => (
          <Button
            key={choice.value}
            variant={preference === choice.value ? "primary" : "secondary"}
            label={t(choice.label)}
            testID={`settings-theme-${choice.value}`}
            onPress={() => setPreference(choice.value)}
          />
        ))}
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <ListItem
          testID="settings-privacy"
          title={t("settings.privacyTitle")}
          onPress={() => navigation.navigate("Legal", { doc: "privacy" })}
        />
        <ListItem
          testID="settings-terms"
          title={t("settings.termsTitle")}
          onPress={() => navigation.navigate("Legal", { doc: "terms" })}
        />
      </Card>
    </Screen>
  );
}
