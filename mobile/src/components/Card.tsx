import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
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

/** Bento-style card: rounded, padded surface. A soft shadow in light mode, a hairline in dark mode. */
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
    ...(name === "light" && tone === "surface"
      ? { shadowColor: c.shadow, ...theme.elevation.card }
      : { borderWidth: 1, borderColor: c.border }),
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [
          base,
          { minHeight: MIN_TOUCH_TARGET, opacity: pressed ? 0.9 : 1 },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel} style={[base, style]}>
      {children}
    </View>
  );
}
