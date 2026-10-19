import { View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { Button } from "./Button";
import { Icon } from "./Icon";

export type BannerVariant = "info" | "urgent";

export interface BannerProps {
  /** info: calm teal tint. urgent: coral, reserved for urgent alerts. */
  variant?: BannerVariant;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

/** Inline message. Coral (urgent) is only for urgent alerts; never use it for readings or warnings. */
export function Banner({
  variant = "info",
  title,
  message,
  actionLabel,
  onAction,
  testID,
}: BannerProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const urgent = variant === "urgent";
  const bg = urgent ? c.urgent.bg : c.primaryTint;
  const iconColor = urgent ? c.urgent.icon : c.primary;
  const textColor = urgent ? c.urgent.fg : c.ink;

  return (
    <View
      testID={testID}
      accessibilityRole={urgent ? "alert" : undefined}
      accessibilityLiveRegion={urgent ? "assertive" : "polite"}
      style={{
        backgroundColor: bg,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
      }}
    >
      <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
        <Icon name={urgent ? "alert" : "info"} color={iconColor} />
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          {title ? (
            <Text variant="bodyStrong" style={{ color: textColor }}>
              {title}
            </Text>
          ) : null}
          <Text variant="body" style={{ color: textColor }}>
            {message}
          </Text>
        </View>
      </View>
      {actionLabel && onAction ? (
        <Button variant="secondary" label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}
