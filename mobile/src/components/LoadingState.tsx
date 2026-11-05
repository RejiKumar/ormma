import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useTheme } from "../design/ThemeProvider";
import { ShimmerProvider, Skeleton } from "./Skeleton";
import { SkeletonCard } from "./SkeletonCard";

export type LoadingVariant =
  /** The Today layout: hero card, presence bar and two dose cards. */
  | "today"
  /** A short stack of card-shaped blocks (lists of medicines, alerts, parents). */
  | "cards"
  /** A few lines of text, for inline content and forms. */
  | "lines";

export interface LoadingStateProps {
  variant?: LoadingVariant;
  /** Number of cards for "cards". Default 2. */
  count?: number;
  testID?: string;
}

/**
 * Loading placeholder shaped like the content that is coming, so the screen does not jump when data
 * arrives. The blocks fade in once and never loop; the group is announced to screen readers as
 * "Loading" and is hidden from them otherwise.
 */
export function LoadingState({ variant = "lines", count = 2, testID }: LoadingStateProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const card = (key: number, height = 120) => (
    <SkeletonCard key={key} height={height} testID={`${testID ?? "loading"}-block-${key}`} />
  );

  return (
    <View
      testID={testID ?? "loading"}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("common.loading")}
      accessibilityLiveRegion="polite"
      style={{ gap: theme.spacing.md }}
    >
      <ShimmerProvider>
        {variant === "today" ? (
          <>
            {card(0, 220)}
            {card(1, 96)}
            {card(2)}
            {card(3)}
          </>
        ) : variant === "cards" ? (
          Array.from({ length: count }, (_, index) => card(index))
        ) : (
          <>
            <Skeleton width="70%" height={16} />
            <Skeleton width="90%" height={16} />
            <Skeleton width="55%" height={16} />
          </>
        )}
      </ShimmerProvider>
    </View>
  );
}
