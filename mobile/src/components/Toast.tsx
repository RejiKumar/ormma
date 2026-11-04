import { View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";

export interface ToastProps {
  message: string;
  testID?: string;
}

/**
 * Transient confirmation banner: ink background, white 14 px medium text, 16 px radius, 12 by 16
 * padding and the level 3 shadow. Announced to assistive technology as a polite live region.
 */
export function Toast({ message, testID }: ToastProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: c.ink,
        borderRadius: theme.radius.chip,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        shadowColor: c.shadow,
        ...theme.elevation.toast,
      }}
    >
      <Text variant="note" style={{ color: c.background, fontWeight: "500" }}>
        {message}
      </Text>
    </View>
  );
}
