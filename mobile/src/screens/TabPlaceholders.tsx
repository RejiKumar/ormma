import { useTranslation } from "react-i18next";
import { EmptyState } from "../components/EmptyState";
import { Screen } from "../components/Screen";
import type { IconName } from "../components/Icon";

/** Placeholder content of a tab until its stage builds the real screen. Text comes from the catalogue. */
function TabPlaceholder({
  icon,
  titleKey,
  descriptionKey,
  testID,
}: {
  icon: IconName;
  titleKey: "screens.medicines.emptyTitle";
  descriptionKey: "screens.medicines.emptyDescription";
  testID: string;
}) {
  const { t } = useTranslation();
  return (
    <Screen insideTabs>
      <EmptyState testID={testID} icon={icon} title={t(titleKey)} description={t(descriptionKey)} />
    </Screen>
  );
}

export function MedicinesScreen() {
  return (
    <TabPlaceholder
      testID="medicines-empty"
      icon="pill"
      titleKey="screens.medicines.emptyTitle"
      descriptionKey="screens.medicines.emptyDescription"
    />
  );
}

