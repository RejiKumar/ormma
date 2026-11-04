import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useMotion } from "../design/motion";
import { useTheme } from "../design/ThemeProvider";

/**
 * Dot on the Alerts tab icon while an unread missed-dose or urgent alert exists. It pulses gently;
 * under Reduce Motion it is a static dot. Coral is allowed here because the dot means exactly that.
 */
export function AlertDot() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { reduceMotion } = useMotion();
  const color = theme.colors.urgent.icon;
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 1.6 }],
  }));

  return (
    <View
      testID="alerts-tab-dot"
      accessible
      accessibilityLabel={t("alerts.unreadDot")}
      style={{ position: "absolute", top: -1, right: 6, width: 10, height: 10 }}
    >
      {reduceMotion ? null : (
        <Animated.View
          style={[
            { position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: color },
            ringStyle,
          ]}
        />
      )}
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: theme.colors.surface,
        }}
      />
    </View>
  );
}
