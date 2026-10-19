import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { MIN_TOUCH_TARGET, type Theme } from "../design/tokens";
import { getTabRoutes } from "./routes";

const Tab = createBottomTabNavigator();

/** Styling of the bottom tab bar from the tokens. Items are at least 48 dp high (thumb zone). */
export function tabBarStyles(theme: Theme) {
  return {
    bar: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.xs,
    },
    item: { minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET },
  };
}

/** Bottom tab navigation: Today, Medicines, Family (and the gallery in development builds). */
export function AppTabs() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = tabBarStyles(theme);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.inkMuted,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
      }}
    >
      {getTabRoutes(__DEV__).map((route) => (
        <Tab.Screen
          key={route.name}
          name={route.name}
          component={route.component}
          options={{
            tabBarAccessibilityLabel: route.labelKey ? t(route.labelKey) : route.name,
            tabBarIcon: ({ color }) => <Icon name={route.icon} color={color} size={24} />,
            tabBarLabel: ({ color }) => (
              <Text variant="caption" style={{ color }}>
                {route.labelKey ? t(route.labelKey) : route.name}
              </Text>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
