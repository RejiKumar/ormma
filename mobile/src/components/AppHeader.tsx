import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";

export interface AppHeaderProps {
  /** Name of the parent shown in the location pill; "Amma +1" style suffix when there are several. */
  parentName: string | null;
  extraParents?: number;
  /** True while an unread missed-dose or urgent alert exists: the status dot turns coral-toned. */
  alert: boolean;
}

/**
 * The app bar from the Family Companion prototype: the "Ormma" mark on the left and a pill
 * with the parent's name and a live status dot on the right (green while calm, alert-toned otherwise).
 */
export function AppHeader({ parentName, extraParents = 0, alert }: AppHeaderProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  const dot = alert ? c.urgent.icon : c.status.taken.icon;
  const label = parentName ? (extraParents > 0 ? `${parentName} +${extraParents}` : parentName) : null;
  return (
    <View
      testID="app-header"
      style={{
        paddingTop: insets.top + theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        backgroundColor: c.background,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text variant="brand" accessibilityRole="header" style={{ letterSpacing: -0.3 }}>
        {t("app.brand")}
      </Text>
      {label ? (
        <View
          testID="app-header-pill"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            backgroundColor: c.primaryTint,
            borderRadius: theme.radius.pill,
            paddingVertical: theme.spacing.xs,
            paddingHorizontal: theme.spacing.md,
          }}
        >
          <View
            testID="app-header-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: dot,
            }}
          />
          <Text variant="chip">
            {label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
