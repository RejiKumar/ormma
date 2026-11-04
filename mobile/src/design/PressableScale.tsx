import type { ComponentProps } from "react";
import { Pressable, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "./motion";

/** Scale while pressed. */
export const PRESS_SCALE = 0.97;
/** Transform duration in ms. */
export const PRESS_TRANSFORM_MS = 150;
/** Shadow duration in ms. */
export const PRESS_SHADOW_MS = 200;

/** Duration of the press animation in ms: 150 in, 200 out, and 0 (immediate) under Reduce Motion. */
export function pressDuration(to: 0 | 1, reduceMotion: boolean): number {
  if (reduceMotion) return 0;
  return to === 1 ? PRESS_TRANSFORM_MS : PRESS_SHADOW_MS;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<ComponentProps<typeof Pressable>, "style"> {
  style?: StyleProp<ViewStyle>;
  /** Shadow opacity at rest. It eases to half of this while pressed. Ignored when there is no shadow. */
  restShadowOpacity?: number;
}

/**
 * A pressable that scales to 0.97 while held (transform 150 ms, shadow 200 ms) and returns on
 * release. Under Reduce Motion the change is applied at once, without animation.
 */
export function PressableScale({
  style,
  restShadowOpacity = 0,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - PRESS_SCALE) * pressed.value }],
    ...(restShadowOpacity > 0 ? { shadowOpacity: restShadowOpacity * (1 - 0.5 * pressed.value) } : null),
  }));

  const set = (to: 0 | 1) => {
    if (disabled) return;
    pressed.value = reduceMotion ? to : withTiming(to, { duration: pressDuration(to, false) });
  };

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(event: GestureResponderEvent) => {
        set(1);
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        set(0);
        onPressOut?.(event);
      }}
      style={[style, animated]}
      {...rest}
    />
  );
}
