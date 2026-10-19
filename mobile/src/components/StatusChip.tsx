import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useMotion } from "../design/motion";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import type { StatusKey } from "../design/tokens";
import { Icon, type IconName } from "./Icon";

/** One distinct icon per status, so colour is never the only signal. */
export const STATUS_ICON: Record<StatusKey, IconName> = {
  taken: "check",
  pending: "clock",
  missed: "xCircle",
  unclear: "question",
  calling: "phone",
};

export interface StatusChipProps {
  status: StatusKey;
  testID?: string;
}

/**
 * Dose status: icon + text label + status colour, never colour alone. When the status changes the
 * chip morphs (the previous colour fades into the new one with a small spring). "Calling now" has a
 * gentle pulse, the only animation in the app that repeats; under Reduce Motion it is a static ring.
 */
export function StatusChip({ status, testID }: StatusChipProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { reduceMotion, springTo } = useMotion();
  const colors = theme.colors.status[status];
  const label = t(`status.${status}`);

  // morph: an overlay in the previous colour fades out while the chip settles into the new one
  const fade = useSharedValue(0);
  const previousBg = useRef(colors.bg);
  const overlayBg = useSharedValue(colors.bg);
  const morphing = useRef(false);
  useEffect(() => {
    if (previousBg.current === colors.bg) return;
    overlayBg.value = previousBg.current;
    previousBg.current = colors.bg;
    morphing.current = true;
    fade.value = 1;
    fade.value = springTo(0, "snappy");
  }, [colors.bg, fade, overlayBg, springTo]);
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    backgroundColor: overlayBg.value,
  }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.04 * fade.value }] }));

  // pulse: the only repeating animation
  const pulse = useSharedValue(0);
  const pulsing = status === "calling" && !reduceMotion;
  useEffect(() => {
    if (pulsing) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: theme.motion.pulseMs / 2 }),
          withTiming(0, { duration: theme.motion.pulseMs / 2 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }
    return () => cancelAnimation(pulse);
  }, [pulsing, pulse, theme.motion.pulseMs]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.55 - 0.4 * pulse.value,
    transform: [{ scale: 1 + 0.35 * pulse.value }],
  }));

  return (
    <Animated.View
      testID={testID ?? `status-chip-${status}`}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[
        {
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          minHeight: 32,
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.pill,
          backgroundColor: colors.bg,
          overflow: "hidden",
        },
        popStyle,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        testID="status-chip-morph"
        style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, overlayStyle]}
      />
      <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
        {status === "calling" ? (
          <Animated.View
            pointerEvents="none"
            testID="calling-ring"
            style={[
              {
                position: "absolute",
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: colors.icon,
              },
              pulsing ? ringStyle : { opacity: 0.55 },
            ]}
          />
        ) : null}
        <Icon name={STATUS_ICON[status]} color={colors.icon} size={18} />
      </View>
      <Text variant="label" style={{ color: colors.fg }}>
        {label}
      </Text>
    </Animated.View>
  );
}
