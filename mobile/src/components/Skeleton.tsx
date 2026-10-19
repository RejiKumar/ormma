import { useEffect } from "react";
import type { DimensionValue } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useMotion } from "../design/motion";
import { useTheme } from "../design/ThemeProvider";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Corner radius. Defaults to the small radius token. */
  radius?: number;
  testID?: string;
}

/**
 * Loading placeholder. It is static: it fades in once and never loops (the "calling now" pulse is
 * the only repeating animation in the app). Hidden from screen readers; the screen announces loading.
 */
export function Skeleton({ width = "100%", height = 16, radius, testID }: SkeletonProps) {
  const { theme } = useTheme();
  const { springTo } = useMotion();
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = springTo(1, "soft");
  }, [opacity, springTo]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      testID={testID ?? "skeleton"}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.colors.surfaceAlt,
        },
        style,
      ]}
    />
  );
}
