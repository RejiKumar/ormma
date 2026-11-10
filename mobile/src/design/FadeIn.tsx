import { useEffect, type ReactNode } from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import type { StyleProp, ViewStyle } from "react-native";
import { useMotion } from "./motion";
import { motion } from "./tokens";

/** Cross-fade duration for content replacing a skeleton: the `base` motion token (220 ms). */
export const FADE_IN_MS = motion.duration.base;

/** Opacity a FadeIn starts at: fully visible under Reduce Motion, transparent otherwise. */
export const fadeStartOpacity = (reduceMotion: boolean): number => (reduceMotion ? 1 : 0);

/**
 * Fades its children in once when mounted. Under Reduce Motion, or when `instant`, the children are shown at once.
 * It never repeats.
 */
export function FadeIn({
  children,
  style,
  testID,
  instant = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Show at once with no fade, for content that is the first thing on screen after the splash. */
  instant?: boolean;
}) {
  const { reduceMotion } = useMotion();
  const opacity = useSharedValue(instant ? 1 : fadeStartOpacity(reduceMotion));

  useEffect(() => {
    opacity.value = reduceMotion || instant ? 1 : withTiming(1, { duration: FADE_IN_MS, easing: Easing.out(Easing.quad) });
  }, [reduceMotion, instant, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View testID={testID} style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
