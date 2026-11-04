import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { Screen } from "../../components/Screen";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { shortDate } from "../../family/cards";
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
  const footerParts = [
    selected && selected.prescriber.length > 0 ? t("screens.medicines.prescribedBy", { name: selected.prescriber }) : "",
    selected && selected.refillDue ? t("screens.medicines.refillDue", { date: shortDate(selected.refillDue) }) : "",
  ].filter((part) => part.length > 0);
  const prescribedFooter = footerParts.join(" · ");

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
          testID="medicines-no-parents"
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
            <>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text variant="title" lang={selected?.language}>
                  {t("screens.medicines.heading", { name: selected?.name ?? "" })}
                </Text>
                <Text variant="caption" tone="muted" testID="medicines-active-count">
                  {t("screens.medicines.activeCount", { count: medicines.filter((m) => m.active).length })}
                </Text>
              </View>
              {medicines.map((medicine) => (
                <Card
                  key={medicine.id}
                  testID={`medicine-${medicine.id}`}
                  onPress={
                    canEdit && selected
                      ? () => navigation.navigate("EditMedicine", { parentId: selected.id, medicine })
                      : undefined
                  }
                  style={{ gap: theme.spacing.sm }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: theme.radius.md,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: theme.colors.primaryTint,
                      }}
                    >
                      <Icon name="pill" color={theme.colors.primary} size={22} />
                    </View>
                    <Text variant="title" style={{ flex: 1 }}>
                      {[medicine.name, medicine.doseText].filter((part) => part.length > 0).join(" ")}
                    </Text>
                    <View
                      style={{
                        backgroundColor: medicine.active ? theme.colors.status.taken.bg : theme.colors.status.pending.bg,
                        borderRadius: theme.radius.pill,
                        paddingHorizontal: theme.spacing.sm + 2,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        variant="caption"
                        style={{
                          color: medicine.active ? theme.colors.status.taken.fg : theme.colors.status.pending.fg,
                          fontWeight: "600",
                        }}
                      >
                        {medicine.active ? t("screens.medicines.active") : t("screens.medicines.inactive")}
                      </Text>
                    </View>
                  </View>
                  <Text variant="body">
                    {medicine.frequencyText.length > 0 ? medicine.frequencyText : medicine.times.join(", ")}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                    {medicine.pillDescription.length > 0 ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: theme.colors.background,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: theme.radius.pill,
                          paddingHorizontal: theme.spacing.sm + 2,
                          paddingVertical: 4,
                        }}
                      >
                        <View style={{ width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: theme.colors.inkMuted }} />
                        <Text variant="caption" tone="muted">
                          {medicine.pillDescription}
                        </Text>
                      </View>
                    ) : null}
                    {medicine.purpose.length > 0 ? (
                      <View
                        style={{
                          backgroundColor: theme.colors.background,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: theme.radius.pill,
                          paddingHorizontal: theme.spacing.sm + 2,
                          paddingVertical: 4,
                        }}
                      >
                        <Text variant="caption" tone="muted">
                          {t("screens.medicines.forPurpose", { purpose: medicine.purpose })}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Card>
              ))}
              {prescribedFooter ? (
                <View
                  testID="medicines-footer"
                  style={{ backgroundColor: theme.colors.primaryTint, borderRadius: theme.radius.lg, padding: theme.spacing.md }}
                >
                  <Text variant="caption" tone="primary">
                    {prescribedFooter}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
