import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Share, View } from "react-native";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ParentCircle } from "../../components/ParentCircle";
import { EmptyState } from "../../components/EmptyState";
import { ListItem } from "../../components/ListItem";
import { Screen } from "../../components/Screen";
import { useTheme } from "../../design/ThemeProvider";
import { useParents } from "../../family/useParents";
import type { FamilyStackParamList } from "../../navigation/FamilyStack";
import {
  deleteParent,
  exportParentData,
  grantConsent,
  revokeConsent,
} from "../../family/callables";
import { removeParentId } from "../../family/parentIds";
import { LoadingState } from "../../components/LoadingState";

type Props = NativeStackScreenProps<FamilyStackParamList, "FamilyList">;

/** "en-IN" → "languages.en", so the catalogue is typed and safe. */
const LANGUAGE_KEY = {
  "en-IN": "languages.en",
  "ml-IN": "languages.ml",
  "ta-IN": "languages.ta",
  "hi-IN": "languages.hi",
} as const;

/**
 * The parents this account knows about, in realtime (decision #57). Each pending-consent parent
 * carries the info banner; owners can open the invite screen from a parent row.
 */
export function FamilyListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { parents, loading, reload } = useParents();
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const onExport = async (parentId: string, parentName: string) => {
    try {
      setBusyId(parentId);
      const data = await exportParentData({ parentId });
      const count = (rows: unknown[]) => rows.length;
      // One countable line per record type, so a single record never reads "1 medicines".
      const lines = [
        t("screens.family.exportMedicines", { count: count(data.medicines) }),
        t("screens.family.exportDoseEvents", { count: count(data.doseEvents) }),
        t("screens.family.exportHealthLogs", { count: count(data.healthLogs) }),
        t("screens.family.exportAlerts", { count: count(data.alerts) }),
      ];
      Alert.alert(
        t("screens.family.exportReadyTitle"),
        [t("screens.family.exportReadyMessage", { name: parentName }), ...lines].join("\n"),
        [
          { text: t("screens.family.exportDone"), style: "cancel" },
          {
            text: t("screens.family.exportShare"),
            // The share sheet hands the file to the user's own app; nothing is logged (hard rule 6).
            onPress: () =>
              void Share.share({
                title: t("screens.family.exportReadyTitle"),
                message: JSON.stringify(data, null, 2),
              }),
          },
        ],
      );
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setBusyId(null);
    }
  };

  const onRevoke = async (parentId: string) => {
    Alert.alert(t("screens.family.revokeConsent"), t("screens.family.revokeConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("screens.family.revokeConsent"),
        style: "destructive",
        onPress: async () => {
          try {
            setBusyId(parentId);
            await revokeConsent({ parentId, method: "family_attested" });
            reload();
          } catch {
            Alert.alert(t("common.error"));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const onGrant = async (parentId: string) => {
    try {
      setBusyId(parentId);
      await grantConsent({ parentId, method: "family_attested" });
      reload();
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (parentId: string) => {
    Alert.alert(t("screens.family.deleteParent"), t("screens.family.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("screens.family.deleteParent"),
        style: "destructive",
        onPress: async () => {
          try {
            setBusyId(parentId);
            await deleteParent({ parentId });
            await removeParentId(parentId);
            reload();
          } catch {
            Alert.alert(t("common.error"));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const rows = parents.map((parent) => (
    <View key={parent.id} style={{ gap: theme.spacing.lg }}>
      <ParentCircle parent={parent} />
      <Card style={{ gap: theme.spacing.sm }}>
        <ListItem
          testID={`parent-${parent.id}`}
          title={parent.name}
          subtitle={t(LANGUAGE_KEY[parent.language] ?? "languages.en")}
          lang={parent.language}
          accessibilityLabel={`${parent.name}, ${t(LANGUAGE_KEY[parent.language] ?? "languages.en")}`}
          trailing={
            parent.role === "owner" ? (
              <Button
                variant="quiet"
                label={t("screens.family.invite")}
                testID={`invite-${parent.id}`}
                onPress={() =>
                  navigation.navigate("Invite", { parentId: parent.id, parentName: parent.name })
                }
              />
            ) : undefined
          }
        />
        {parent.role === "owner" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs }}>
            <Button
              variant="quiet"
              label={t("screens.family.parentDetails")}
              testID={`details-${parent.id}`}
              onPress={() => navigation.navigate("ParentDetails", { parentId: parent.id })}
            />
            <Button
              variant="quiet"
              label={t("screens.family.emergencyContacts")}
              testID={`contacts-${parent.id}`}
              onPress={() =>
                navigation.navigate("EmergencyContacts", {
                  parentId: parent.id,
                  parentName: parent.name,
                })
              }
            />
            <Button
              variant="quiet"
              label={t("screens.family.exportData")}
              testID={`export-${parent.id}`}
              disabled={busyId === parent.id}
              onPress={() => onExport(parent.id, parent.name)}
            />
            {parent.consent?.status === "granted" ? (
              <Button
                variant="quiet"
                label={t("screens.family.revokeConsent")}
                testID={`revoke-${parent.id}`}
                disabled={busyId === parent.id}
                onPress={() => onRevoke(parent.id)}
              />
            ) : (
              <Button
                variant="quiet"
                label={t("screens.family.grantConsent")}
                testID={`grant-${parent.id}`}
                disabled={busyId === parent.id}
                onPress={() => onGrant(parent.id)}
              />
            )}
            <Button
              variant="quiet"
              label={t("screens.family.deleteParent")}
              testID={`delete-${parent.id}`}
              disabled={busyId === parent.id}
              onPress={() => onDelete(parent.id)}
            />
          </View>
        ) : null}
        {parent.consent?.status !== "granted" ? (
          <Banner testID={`consent-${parent.id}`} message={t("screens.family.consentPending")} />
        ) : null}
      </Card>
    </View>
  ));

  return (
    <Screen
      insideTabs
      primaryAction={
        <Button
          label={t("screens.family.addParent")}
          icon="people"
          testID="family-add"
          onPress={() => navigation.navigate("AddParent")}
        />
      }
    >
      {loading ? (
        <LoadingState variant="cards" testID="family-loading" />
      ) : parents.length === 0 ? (
        <EmptyState
          testID="family-empty"
          icon="people"
          title={t("screens.family.emptyTitle")}
          description={t("screens.family.emptyDescription")}
          action={
            <Button
              variant="secondary"
              label={t("screens.family.redeem")}
              testID="family-redeem"
              onPress={() => navigation.navigate("Redeem")}
            />
          }
        />
      ) : (
        <>
          {rows}
          <Button
            variant="secondary"
            label={t("screens.family.redeem")}
            testID="family-redeem"
            onPress={() => navigation.navigate("Redeem")}
          />
        </>
      )}
      {loading ? null : (
        <Button
          variant="quiet"
          label={t("settings.rowTitle")}
          testID="family-settings"
          onPress={() => navigation.navigate("Settings")}
        />
      )}
    </Screen>
  );
}
