import { ActivityIndicator } from "react-native";
import { PressableScale } from "../design/PressableScale";
import { Text, type TextTone } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { MIN_TOUCH_TARGET } from "../design/tokens";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "quiet";

export interface ButtonProps {
  /** Visible label and accessible name. Pass text from the i18n catalogue. */
  label: string;
  onPress: () => void;
  /** "primary" is the screen's single main action; use at most one per screen. */
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** 42 dp tall pill; the touch area stays 48 dp through hitSlop. */
  compact?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

/** Primary buttons are 56 dp high (thumb-friendly), the others at least 48 dp. Text grows the button. */
export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  compact = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const inactive = disabled || loading;
  const tone: TextTone = variant === "primary" ? "onPrimary" : "primary";
  const fg = variant === "primary" ? c.inkOnPrimary : c.primary;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      hitSlop={compact ? { top: 3, bottom: 3 } : undefined}
      onPress={onPress}
      testID={testID}
      style={{
        minHeight: compact ? 42 : variant === "primary" ? 56 : MIN_TOUCH_TARGET,
        minWidth: MIN_TOUCH_TARGET,
        borderRadius: theme.radius.lg,
        paddingHorizontal: variant === "quiet" ? theme.spacing.md : theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
        backgroundColor:
          variant === "primary" ? c.primary : variant === "secondary" ? c.surface : c.primaryTint,
        borderWidth: variant === "secondary" ? 1.5 : 0,
        borderColor: c.primary,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {loading ? <ActivityIndicator color={fg} testID="button-spinner" /> : null}
      {icon && !loading ? <Icon name={icon} color={fg} size={22} /> : null}
      <Text variant="bodyStrong" tone={tone} style={{ textAlign: "center", flexShrink: 1 }}>
        {label}
      </Text>
    </PressableScale>
  );
}
