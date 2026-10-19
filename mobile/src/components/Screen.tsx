import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../design/ThemeProvider";
import { DisclaimerFooter } from "./DisclaimerFooter";

export interface ScreenProps {
  children: ReactNode;
  /**
   * The screen's single primary action (a primary Button), placed at the bottom in the thumb zone.
   * A screen has at most one.
   */
  primaryAction?: ReactNode;
  /** Scroll the content. Default true. */
  scroll?: boolean;
  /** Set when a bottom tab bar already covers the bottom safe area. Default false. */
  insideTabs?: boolean;
}

/**
 * Layout every screen is built on: safe areas, scrolling content, a bottom slot for the one primary
 * action, and the medical disclaimer footer (always shown).
 */
export function Screen({
  children,
  primaryAction,
  scroll = true,
  insideTabs = false,
}: ScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const content = scroll ? (
    <ScrollView
      testID="screen-scroll"
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: theme.spacing.lg, gap: theme.spacing.lg }}>{children}</View>
  );

  return (
    <View
      testID="screen"
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {content}
      <View
        testID="screen-bottom"
        style={{ paddingBottom: insideTabs ? 0 : insets.bottom, paddingTop: theme.spacing.sm }}
      >
        {primaryAction ? (
          <View testID="screen-primary-action" style={{ paddingHorizontal: theme.spacing.lg }}>
            {primaryAction}
          </View>
        ) : null}
        <DisclaimerFooter />
      </View>
    </View>
  );
}
