import type { ComponentType } from "react";
import type { IconName } from "../components/Icon";
import { GalleryScreen } from "../screens/gallery/GalleryScreen";
import { MedicineStack } from "./MedicineStack";
import { TodayDashboardScreen } from "../screens/today/TodayDashboardScreen";
import { FamilyStack } from "./FamilyStack";
import { AlertsScreen } from "../screens/alerts/AlertsScreen";

export interface TabRoute {
  name: "Today" | "Medicines" | "Alerts" | "Family" | "Gallery";
  /** Catalogue key of the tab label. The gallery tab is dev-only and has no catalogue entry. */
  labelKey: "tabs.today" | "tabs.medicines" | "tabs.alerts" | "tabs.family" | null;
  icon: IconName;
  component: ComponentType;
}

/**
 * The bottom tabs. The component gallery is registered only in development builds: it is a tool for
 * building screens, not part of the shipped app.
 */
export function getTabRoutes(isDev: boolean): TabRoute[] {
  const routes: TabRoute[] = [
    { name: "Today", labelKey: "tabs.today", icon: "home", component: TodayDashboardScreen },
    { name: "Medicines", labelKey: "tabs.medicines", icon: "pill", component: MedicineStack },
    { name: "Alerts", labelKey: "tabs.alerts", icon: "bell", component: AlertsScreen },
    { name: "Family", labelKey: "tabs.family", icon: "people", component: FamilyStack },
  ];
  if (isDev)
    routes.push({ name: "Gallery", labelKey: null, icon: "info", component: GalleryScreen });
  return routes;
}
