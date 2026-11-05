import type { ReactNode } from "react";
import { View } from "react-native";
import { useTheme } from "../design/ThemeProvider";
import { Skeleton } from "./Skeleton";

export interface SkeletonCardProps {
  /** Minimum height of the card. */
  height?: number;
  /** Placeholder text bars inside, when no children are given. Default 3. */
  bars?: number;
  testID?: string;
  children?: ReactNode;
}

/**
 * A card-shaped placeholder: the same white surface, hairline border and radius as a real card,
 * with grey bars inside. It avoids big flat grey blocks while content loads.
 */
export function SkeletonCard({ height = 120, bars = 3, testID, children }: SkeletonCardProps) {
  const { theme } = useTheme();
  return (
    <View
      testID={testID}
      style={{
        minHeight: height,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        gap: theme.spacing.sm,
        justifyContent: "center",
      }}
    >
      {children ??
        Array.from({ length: bars }, (_, i) => (
          <Skeleton key={i} width={i === 0 ? "55%" : i === 1 ? "90%" : "70%"} height={i === 0 ? 18 : 12} radius={theme.radius.pill} />
        ))}
    </View>
  );
}
