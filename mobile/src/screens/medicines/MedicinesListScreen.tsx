import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { ListItem } from "../../components/ListItem";
import { Screen } from "../../components/Screen";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { useMedicines } from "../../family/useMedicines";
import { useParents } from "../../family/useParents";
import type { MedicineStackParamList } from "../../navigation/MedicineStack";

type Props = NativeStackScreenProps<MedicineStackParamList, "MedicinesList">;

/**
 * Medicines tab root: choose a parent (auto-selected when there is one), see that parent's
 * medicines with times and active state, and - for owners and editors only - add and open rows.
 */
export function MedicinesListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { parents, loading: parentsLoading, reload } = useParents();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useEffect(() => {
    if (parents.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((current) =>
      current !== null && parents.some((parent) => parent.id === current) ? current : parents[0].id,
    );
  }, [parents]);

  const selected = parents.find((parent) => parent.id === selectedId) ?? null;
  const { medicines, loading } = useMedicines(selected?.id ?? null);
  const canEdit = selected?.role === "owner" || selected?.role === "editor";

  return (
    <Screen
      insideTabs
      primaryAction={
        canEdit && selected ? (
          <Button
            label={t("screens.medicines.add")}
            icon="plus"
            testID="medicine-add"
            onPress={() =>
              navigation.navigate("AddMedicine", { parentId: selected.id })
            }
          />
        ) : null
      }
    >
      <Text variant="headline">{t("screens.medicines.title")}</Text>
      {parentsLoading ? (
        <Text tone="muted">{t("common.loading")}</Text>
      ) : parents.length === 0 ? (
        <EmptyState
          testID="medicines-empty"
          icon="pill"
          title={t("screens.medicines.emptyTitle")}
          description={t("screens.medicines.emptyDescription")}
        />
      ) : (
        <>
          {parents.length > 1 ? (
            <View style={{ gap: theme.spacing.xs }}>
              <Text variant="label">{t("screens.medicines.selectParent")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                {parents.map((parent) => {
                  const active = parent.id === selectedId;
                  return (
                    <Pressable
                      key={parent.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={parent.name}
                      testID={`medicine-parent-${parent.id}`}
                      onPress={() => setSelectedId(parent.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: theme.spacing.sm,
                        minHeight: 48,
                        borderRadius: theme.radius.lg,
                        borderWidth: 1.5,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                        backgroundColor: theme.colors.surface,
                        paddingHorizontal: theme.spacing.lg,
                      }}
                    >
                      {active ? <Icon name="check" color={theme.colors.primary} size={18} /> : null}
                      <Text variant="body" lang={parent.language}>
                        {parent.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          {loading ? (
            <Text tone="muted">{t("common.loading")}</Text>
          ) : medicines.length === 0 ? (
            <EmptyState
              testID="medicines-empty"
              icon="pill"
              title={t("screens.medicines.emptyTitle")}
              description={t("screens.medicines.emptyDescription")}
            />
          ) : (
            medicines.map((medicine) => (
              <ListItem
                key={medicine.id}
                testID={`medicine-${medicine.id}`}
                title={medicine.name}
                subtitle={[medicine.doseText, medicine.times.join(", ")]
                  .filter((part) => part.length > 0)
                  .join(" · ")}
                chevron={canEdit}
                onPress={
                  canEdit && selected
                    ? () =>
                        navigation.navigate("EditMedicine", {
                          parentId: selected.id,
                          medicine,
                        })
                    : undefined
                }
                trailing={
                  medicine.active ? undefined : (
                    <Text variant="label" tone="muted">
                      {t("screens.medicines.inactive")}
                    </Text>
                  )
                }
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}
