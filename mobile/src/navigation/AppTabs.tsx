import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertDot } from "../components/AlertDot";
import { AppHeader } from "../components/AppHeader";
import { Icon } from "../components/Icon";
import { useParents } from "../family/useParents";
import { useUnreadUrgentAlertCount } from "../family/useUnreadAlerts";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { MIN_TOUCH_TARGET, type Theme } from "../design/tokens";
import { getTabRoutes } from "./routes";

const Tab = createBottomTabNavigator();

/**
 * Styling of the bottom tab bar from the tokens. Items are at least 48 dp high (thumb zone).
 * The bar reserves the gesture area plus a little breathing room, so labels never sit on the
 * gesture pill.
 */
export function tabBarStyles(theme: Theme, bottomInset = 0) {
  return {
    bar: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      height: 62 + bottomInset,
      paddingTop: theme.spacing.xs,
      paddingBottom: bottomInset + theme.spacing.xs,
    },
    item: { minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET },
  };
}

/** Bottom tab navigation: Today, Medicines, Family (and the gallery in development builds). */
export function AppTabs() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = tabBarStyles(theme, insets.bottom);
  const unreadUrgent = useUnreadUrgentAlertCount();
  const { parents } = useParents();
  return (
    <Tab.Navigator
      screenOptions={{
        // The prototype app bar: brand mark and the parent pill with a live status dot.
        headerShown: true,
        header: () => (
          <AppHeader
            parentName={parents[0] ? [parents[0].name, parents[0].city].filter((part) => part.length > 0).join(" · ") : null}
            extraParents={Math.max(0, parents.length - 1)}
            alert={unreadUrgent > 0}
          />
        ),
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
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  backgroundColor: focused ? theme.colors.primaryTint : "transparent",
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: 3,
                  borderRadius: theme.radius.pill,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  name={route.icon}
                  color={color}
                  size={22}
                  strokeWidth={focused ? 2.3 : 1.8}
                />
                {route.name === "Alerts" && unreadUrgent > 0 ? <AlertDot /> : null}
              </View>
            ),
            tabBarLabel: ({ color, focused }) => (
              <Text
                variant="caption"
                style={{
                  color,
                  fontWeight: focused ? "600" : "400",
                }}
              >
                {route.labelKey ? t(route.labelKey) : route.name}
              </Text>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
