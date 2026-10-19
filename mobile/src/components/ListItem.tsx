import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { Icon } from "./Icon";

export interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Language of the title and subtitle, when it differs from the app language. */
  lang?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  /** Show a chevron when pressable. Default true. */
  chevron?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

/** A list row at least 56 dp high. It grows with larger text. */
export function ListItem({
  title,
  subtitle,
  lang,
  leading,
  trailing,
  onPress,
  chevron = true,
  accessibilityLabel,
  testID,
}: ListItemProps) {
  const { theme } = useTheme();
  const row = (
    <>
      {leading ? <View>{leading}</View> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyLarge" lang={lang}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" tone="muted" lang={lang}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
      {onPress && chevron ? (
        <Icon name="chevronRight" color={theme.colors.inkMuted} size={22} />
      ) : null}
    </>
  );
  const style = {
    minHeight: 56,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  };

  if (!onPress) {
    return (
      <View testID={testID} style={style}>
        {row}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [style, { opacity: pressed ? 0.8 : 1 }]}
    >
      {row}
    </Pressable>
  );
}
