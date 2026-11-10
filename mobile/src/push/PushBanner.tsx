import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { MIN_TOUCH_TARGET } from "../design/tokens";
import type { PushBannerContent } from "./pushTarget";

export const PUSH_BANNER_MS = 8000;

/**
 * Banner for a push message that arrives while the app is open. The text is exactly what the server
 * sent; the app adds no wording. Tapping it opens the matching tab. It hides itself after a few seconds.
 */
export function PushBanner({
  banner,
  onOpen,
  onDismiss,
}: {
  banner: PushBannerContent | null;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(onDismiss, PUSH_BANNER_MS);
    return () => clearTimeout(timer);
  }, [banner, onDismiss]);

  if (!banner) return null;
  const label = [banner.title, banner.body].filter((part) => part.length > 0).join(". ");
  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", top: insets.top + theme.spacing.sm, left: theme.spacing.lg, right: theme.spacing.lg }}
    >
      <Pressable
        testID="push-banner"
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityLiveRegion="polite"
        onPress={onOpen}
        style={{
          minHeight: MIN_TOUCH_TARGET,
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: 1,
        }}
      >
        {banner.title.length > 0 ? <Text variant="label">{banner.title}</Text> : null}
        {banner.body.length > 0 ? <Text variant="body">{banner.body}</Text> : null}
      </Pressable>
    </View>
  );
}
