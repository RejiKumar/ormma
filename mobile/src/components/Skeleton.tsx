import { useEffect, useState } from "react";
import type { DimensionValue } from "react-native";
import { View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useMotion } from "../design/motion";
import { useTheme } from "../design/ThemeProvider";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Corner radius. Defaults to the small radius token. */
  radius?: number;
  testID?: string;
}

/** One sweep of the highlight across the block, in milliseconds. */
export const SHIMMER_MS = 1500;

/**
 * Loading placeholder with a soft highlight that sweeps from left to right (a shimmer), like a
 * social feed. The sweep is the only looping motion besides "calling now", and it is replaced by a
 * still block under Reduce Motion. Hidden from screen readers; the screen announces loading.
 */
export function Skeleton({ width = "100%", height = 16, radius, testID }: SkeletonProps) {
  const { theme } = useTheme();
  const { reduceMotion } = useMotion();
  const [boxWidth, setBoxWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(progress);
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: SHIMMER_MS, easing: Easing.inOut(Easing.ease) }), -1, false);
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion]);

  // translateX(-100%) -> translateX(100%) of the block's own width.
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: (progress.value * 2 - 1) * boxWidth }] }));

  return (
    <View
      testID={testID ?? "skeleton"}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event) => setBoxWidth(event.nativeEvent.layout.width)}
      style={{
        width,
        height,
        borderRadius: radius ?? theme.radius.sm,
        backgroundColor: theme.colors.surfaceAlt,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {boxWidth > 0 && !reduceMotion ? (
        <Animated.View
          testID="skeleton-shimmer"
          pointerEvents="none"
          style={[{ position: "absolute", top: 0, bottom: 0, left: 0, width: boxWidth }, sweep]}
        >
          <Svg width={boxWidth} height={height}>
            <Defs>
              <LinearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={theme.name === "dark" ? 0.12 : 0.65} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={boxWidth} height={height} fill="url(#shimmer)" />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}
