import type { ReactNode, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, ScrollView, View } from "react-native";
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
  /**
   * Set on screens shown inside a native stack with a visible header: the header already covers
   * the top safe area, so the screen must not apply it a second time.
   */
  belowHeader?: boolean;
  /** Optional ref to the ScrollView, for screens that must scroll a newly revealed control into view. */
  scrollRef?: RefObject<React.ComponentRef<typeof ScrollView> | null>;
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
  belowHeader = false,
  scrollRef,
}: ScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Android edge-to-edge does not resize the window for the IME and KeyboardAvoidingView measures
  // the wrong frame inside the tab navigator, so the screen measures its own bottom edge and pads
  // itself by exactly the overlap with the keyboard. The primary action therefore stays visible
  // and the scroll area shrinks to the part above the keyboard.
  const rootRef = useRef<React.ComponentRef<typeof View>>(null);
  const rootBottom = useRef(0);
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  // `Keyboard.metrics()` is non-null while the keyboard is open. The screen needs it because a
  // keyboard can already be open when the screen mounts (tapping "Send code" moves to the OTP
  // screen with the number pad still up), so no `keyboardDidShow` event arrives for the new screen.
  const applyKeyboardMetrics = useCallback(() => {
    const metrics = typeof Keyboard.metrics === "function" ? Keyboard.metrics() : undefined;
    if (!metrics) {
      setKeyboardPadding(0);
      return;
    }
    const bottom = rootBottom.current || Dimensions.get("window").height;
    setKeyboardPadding(Math.max(0, bottom - metrics.screenY) + theme.spacing.sm);
  }, [theme.spacing.sm]);

  const measure = useCallback(() => {
    rootRef.current?.measureInWindow((_x, y, _width, height) => {
      rootBottom.current = y + height;
      applyKeyboardMetrics();
    });
  }, [applyKeyboardMetrics]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      const bottom = rootBottom.current || Dimensions.get("window").height;
      setKeyboardPadding(
        Math.max(0, bottom - event.endCoordinates.screenY) + theme.spacing.sm,
      );
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardPadding(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [theme.spacing.sm]);

  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
      testID="screen-scroll"
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: theme.spacing.lg, gap: theme.spacing.lg }}>{children}</View>
  );

  return (
    <View
      testID="screen"
      ref={rootRef}
      onLayout={measure}
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: belowHeader ? 0 : insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        paddingBottom: keyboardPadding,
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
