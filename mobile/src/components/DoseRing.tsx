import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated, { useAnimatedProps, useSharedValue } from "react-native-reanimated";
import Svg, { Circle, G } from "react-native-svg";
import { useMotion } from "../design/motion";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Share of doses taken, from 0 to 1. No doses means 0. */
export function ringFraction(taken: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.min(1, Math.max(0, taken / total));
}

/** Stroke dash offset that draws `fraction` of a circle of the given circumference. */
export function ringOffset(fraction: number, circumference: number): number {
  return circumference * (1 - fraction);
}

export interface DoseRingProps {
  taken: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  testID?: string;
}

/**
 * Progress ring of today's doses: taken out of total. The arc fills with a spring (immediately under
 * Reduce Motion). It shows the count as text and as an accessible progress value.
 */
export function DoseRing({ taken, total, size = 120, strokeWidth = 12, testID }: DoseRingProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { springTo } = useMotion();
  const fraction = ringFraction(taken, total);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = springTo(fraction, "soft");
  }, [fraction, progress, springTo]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: ringOffset(progress.value, circumference),
  }));
  const label = total > 0 ? t("doseRing.label", { taken, total }) : t("doseRing.none");

  return (
    <View
      testID={testID ?? "dose-ring"}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{
        min: 0,
        max: Math.max(total, 0),
        now: Math.min(taken, Math.max(total, 0)),
      }}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityElementsHidden>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={theme.colors.surfaceAlt}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            testID="dose-ring-arc"
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={theme.colors.primary}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeOpacity={fraction > 0 ? 1 : 0}
            fill="none"
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
      <View
        style={{ position: "absolute", alignItems: "center" }}
        importantForAccessibility="no-hide-descendants"
      >
        <Text variant={size >= 100 ? "headline" : "label"}>{`${taken}/${total}`}</Text>
      </View>
    </View>
  );
}
