import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { ListItem } from "../../components/ListItem";
import { Screen } from "../../components/Screen";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { useParents } from "../../family/useParents";
import type { FamilyStackParamList } from "../../navigation/FamilyStack";

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

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const rows = parents.map((parent) => (
    <View key={parent.id} style={{ gap: theme.spacing.sm }}>
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
      {parent.consent?.status !== "granted" ? (
        <Banner testID={`consent-${parent.id}`} message={t("screens.family.consentPending")} />
      ) : null}
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
      <Text variant="headline">{t("screens.family.title")}</Text>
      {loading ? (
        <Text tone="muted">{t("common.loading")}</Text>
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
    </Screen>
  );
}
