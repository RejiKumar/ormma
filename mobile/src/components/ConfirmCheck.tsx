import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { lightHaptic, useMotion } from "../design/motion";
import { useTheme } from "../design/ThemeProvider";
import { Icon } from "./Icon";

export interface ConfirmCheckProps {
  size?: number;
  /** Called once when the confirmation has appeared. */
  onShown?: () => void;
  testID?: string;
}

/**
 * Checkmark confirmation: a taken-coloured disc that pops in with a spring (immediately under Reduce
 * Motion) and gives one light haptic tap. It shows once; nothing loops.
 */
export function ConfirmCheck({ size = 72, onShown, testID }: ConfirmCheckProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { springTo } = useMotion();
  const scale = useSharedValue(0.6);
  useEffect(() => {
    scale.value = springTo(1, "snappy");
    lightHaptic();
    onShown?.();
    // runs once, on mount
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.4 + 0.6 * Math.min(1, scale.value),
  }));
  const colors = theme.colors.status.taken;
  return (
    <Animated.View
      testID={testID ?? "confirm-check"}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t("status.taken")}
      accessibilityLiveRegion="polite"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.bg,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Icon name="check" color={colors.icon} size={Math.round(size * 0.5)} strokeWidth={2.5} />
    </Animated.View>
  );
}
