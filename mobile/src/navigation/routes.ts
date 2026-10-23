import type { ComponentType } from "react";
import type { IconName } from "../components/Icon";
import { GalleryScreen } from "../screens/gallery/GalleryScreen";
import { MedicineStack } from "./MedicineStack";
import { TodayDashboardScreen } from "../screens/today/TodayDashboardScreen";
import { FamilyStack } from "./FamilyStack";

export interface TabRoute {
  name: "Today" | "Medicines" | "Family" | "Gallery";
  /** Catalogue key of the tab label. The gallery tab is dev-only and has no catalogue entry. */
  labelKey: "tabs.today" | "tabs.medicines" | "tabs.family" | null;
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
    { name: "Family", labelKey: "tabs.family", icon: "people", component: FamilyStack },
  ];
  if (isDev)
    routes.push({ name: "Gallery", labelKey: null, icon: "info", component: GalleryScreen });
  return routes;
}
