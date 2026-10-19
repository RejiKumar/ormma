import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { Icon, type IconName } from "./Icon";

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  /** Optional action, for example a secondary Button. */
  action?: ReactNode;
  testID?: string;
}

/** Calm placeholder for a screen or list with nothing in it yet. */
export function EmptyState({ icon = "info", title, description, action, testID }: EmptyStateProps) {
  const { theme } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="summary"
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.md,
        padding: theme.spacing.xl,
      }}
    >
      <Icon name={icon} size={40} color={theme.colors.inkMuted} />
      <Text variant="title" style={{ textAlign: "center" }}>
        {title}
      </Text>
      {description ? (
        <Text variant="body" tone="muted" style={{ textAlign: "center" }}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: theme.spacing.sm }}>{action}</View> : null}
    </View>
  );
}
