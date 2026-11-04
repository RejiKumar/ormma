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
      height: 64 + bottomInset,
      paddingTop: theme.spacing.xs,
      paddingBottom: bottomInset + theme.spacing.xs,
    },
    // The active tab draws a tint pill with a 16 px radius behind its icon and label (see tabBarIcon).
    item: {
      minHeight: MIN_TOUCH_TARGET,
      minWidth: MIN_TOUCH_TARGET,
      paddingVertical: 2,
    },
  };
}

/** Bottom tab navigation: Today, Medicines, Escalation and Family. */
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
        tabBarLabelPosition: "below-icon",
      }}
    >
      {getTabRoutes().map((route) => (
        <Tab.Screen
          key={route.name}
          name={route.name}
          component={route.component}
          options={{
            tabBarAccessibilityLabel: t(route.labelKey),
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                {focused ? (
                  <View
                    testID="tab-active-pill"
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: -6,
                      left: -25,
                      width: 72,
                      height: 52,
                      borderRadius: theme.radius.chip,
                      backgroundColor: theme.colors.primaryTint,
                    }}
                  />
                ) : null}
                <Icon name={route.icon} color={color} size={22} strokeWidth={focused ? 2.3 : 1.8} />
                {route.name === "Alerts" && unreadUrgent > 0 ? <AlertDot /> : null}
              </View>
            ),
            tabBarLabel: ({ color }) => (
              <Text variant="micro" style={{ color }} numberOfLines={1} maxFontSizeMultiplier={1.25}>
                {t(route.labelKey)}
              </Text>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
