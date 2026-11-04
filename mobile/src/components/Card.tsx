import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { PressableScale } from "../design/PressableScale";
import { useTheme } from "../design/ThemeProvider";
import { MIN_TOUCH_TARGET } from "../design/tokens";

export type CardTone = "surface" | "alt" | "tinted";

export interface CardProps {
  children: ReactNode;
  /** surface: white bento card; alt: nested tile; tinted: soft sage highlight. */
  tone?: CardTone;
  /** Makes the whole card a button. */
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** Card: 24 px radius, 1 px border, level 1 shadow in light mode (hairline only in dark mode); pressable cards scale on press. */
export function Card({
  children,
  tone = "surface",
  onPress,
  accessibilityLabel,
  testID,
  style,
}: CardProps) {
  const { theme, name } = useTheme();
  const c = theme.colors;
  const base: ViewStyle = {
    backgroundColor: tone === "surface" ? c.surface : tone === "alt" ? c.surfaceAlt : c.primaryTint,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
    ...(name === "light" && tone === "surface" ? { shadowColor: c.shadow, ...theme.elevation.card } : null),
  };

  if (onPress) {
    return (
      <PressableScale
        restShadowOpacity={name === "light" && tone === "surface" ? theme.elevation.card.shadowOpacity : 0}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        testID={testID}
        style={[base, { minHeight: MIN_TOUCH_TARGET }, style]}
      >
        {children}
      </PressableScale>
    );
  }
  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel} style={[base, style]}>
      {children}
    </View>
  );
}
