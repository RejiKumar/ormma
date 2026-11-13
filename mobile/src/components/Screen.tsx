import type { ReactNode, RefObject } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Keyboard, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../design/ThemeProvider";
import { DisclaimerFooter } from "./DisclaimerFooter";

/**
 * Lets a text field ask its screen to scroll it into view when it gets focus, so the field being typed
 * in is never hidden behind the keyboard. Outside a Screen it does nothing.
 */
const ScrollIntoViewContext = createContext<(() => void) | null>(null);
export const useScrollFocusedIntoView = () => useContext(ScrollIntoViewContext);

type ScrollViewInstance = React.ComponentRef<typeof ScrollView>;

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
  const innerScrollRef = useRef<ScrollViewInstance | null>(null);
  const scrollOffset = useRef(0);
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

  // Scrolls the focused input into the visible part of the scroll area (above the keyboard). Waits a
  // moment so the keyboard padding has been applied and the input has its final position.
  const revealFocused = useCallback(() => {
    setTimeout(() => {
      const input = TextInput.State?.currentlyFocusedInput?.();
      const scroller = innerScrollRef.current;
      if (!input || !scroller) return;
      const margin = theme.spacing.lg;
      scroller.measureInWindow((_sx, sy, _sw, sh) => {
        input.measureInWindow((_ix, iy, _iw, ih) => {
          const visibleTop = sy + margin;
          const visibleBottom = sy + sh - margin;
          if (iy + ih > visibleBottom) {
            scroller.scrollTo({ y: scrollOffset.current + (iy + ih - visibleBottom), animated: true });
          } else if (iy < visibleTop) {
            scroller.scrollTo({ y: Math.max(0, scrollOffset.current - (visibleTop - iy)), animated: true });
          }
        });
      });
    }, 150);
  }, [theme.spacing.lg]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      const bottom = rootBottom.current || Dimensions.get("window").height;
      setKeyboardPadding(
        Math.max(0, bottom - event.endCoordinates.screenY) + theme.spacing.sm,
      );
      revealFocused();
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardPadding(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [theme.spacing.sm, revealFocused]);

  const setScroller = useCallback(
    (node: ScrollViewInstance | null) => {
      innerScrollRef.current = node;
      if (scrollRef) (scrollRef as { current: ScrollViewInstance | null }).current = node;
    },
    [scrollRef],
  );
  const revealContext = useMemo(() => revealFocused, [revealFocused]);

  const content = scroll ? (
    <ScrollView
      ref={setScroller}
      onScroll={(event) => {
        scrollOffset.current = event.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
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
    <ScrollIntoViewContext.Provider value={revealContext}>
    <View
      testID="screen"
      ref={rootRef}
      onLayout={measure}
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        // Tab screens sit under the app bar, which already covers the top safe area.
        paddingTop: belowHeader || insideTabs ? 0 : insets.top,
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
    </ScrollIntoViewContext.Provider>
  );
}
