import { createNavigationContainerRef } from "@react-navigation/native";

export type TabParamList = {
  Today: undefined;
  Medicines: undefined;
  Alerts: undefined;
  Family: undefined;
};

/** Lets code outside a screen, such as a tapped push notification, switch tabs. */
export const navigationRef = createNavigationContainerRef<TabParamList>();
