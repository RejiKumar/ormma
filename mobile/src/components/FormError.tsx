import { View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { Icon } from "./Icon";

export interface FormErrorProps {
  /** Text from the i18n catalogue. */
  message: string;
  testID?: string;
}

/**
 * Error line for a screen-level form failure (not tied to one field). Validation and server
 * errors are shown in ink with an icon, never in coral (decision #56).
 */
export function FormError({ message, testID }: FormErrorProps) {
  const { theme } = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      testID={testID}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
      }}
    >
      <Icon name="xCircle" color={theme.colors.ink} size={16} />
      <Text variant="bodyStrong" style={{ color: theme.colors.ink, flexShrink: 1 }}>
        {message}
      </Text>
    </View>
  );
}
