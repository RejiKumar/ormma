import type { ComponentType } from "react";
import type { IconName } from "../components/Icon";
import { MedicineStack } from "./MedicineStack";
import { TodayDashboardScreen } from "../screens/today/TodayDashboardScreen";
import { FamilyStack } from "./FamilyStack";
import { AlertsScreen } from "../screens/alerts/AlertsScreen";

export interface TabRoute {
  name: "Today" | "Medicines" | "Alerts" | "Family";
  /** Catalogue key of the tab label. */
  labelKey: "tabs.today" | "tabs.medicines" | "tabs.alerts" | "tabs.family";
  icon: IconName;
  component: ComponentType;
}

/** The bottom tabs: Today, Medicines, Escalation (Alerts) and Family. */
export function getTabRoutes(): TabRoute[] {
  return [
    { name: "Today", labelKey: "tabs.today", icon: "home", component: TodayDashboardScreen },
    { name: "Medicines", labelKey: "tabs.medicines", icon: "pill", component: MedicineStack },
    { name: "Alerts", labelKey: "tabs.alerts", icon: "bell", component: AlertsScreen },
    { name: "Family", labelKey: "tabs.family", icon: "people", component: FamilyStack },
  ];
}
