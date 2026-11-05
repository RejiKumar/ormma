import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../design/ThemeProvider";
import { ShimmerProvider, Skeleton } from "./Skeleton";
import { SkeletonCard } from "./SkeletonCard";

const PAD = 16;

/** The Today layout: state pill, hero, presence strip, section title, dose timeline, digest. */
export function TodaySkeleton() {
  const { theme } = useTheme();
  const r = theme.radius;
  return (
    <ShimmerProvider>
      <View testID="today-skeleton" style={{ padding: PAD, gap: theme.spacing.lg }}>
        <Skeleton width={180} height={40} radius={r.pill} />
        <SkeletonCard height={160}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
            <Skeleton width={84} height={84} radius={r.pill} />
            <View style={{ flex: 1, gap: theme.spacing.sm }}>
              <Skeleton width="90%" height={20} radius={r.pill} />
              <Skeleton width="60%" height={14} radius={r.pill} />
              <Skeleton width={150} height={36} radius={r.pill} />
            </View>
          </View>
        </SkeletonCard>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
          <View style={{ flexDirection: "row" }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                <Skeleton width={36} height={36} radius={r.pill} />
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Skeleton height={14} radius={r.pill} />
          </View>
          <Skeleton width={72} height={32} radius={r.pill} />
        </View>
        <Skeleton width={144} height={16} radius={r.pill} />
        {[0, 1].map((i) => (
          <View
            key={i}
            style={{ flexDirection: "row", gap: theme.spacing.md, alignItems: "flex-start" }}
          >
            <Skeleton width={12} height={12} radius={r.pill} />
            <View style={{ flex: 1, gap: theme.spacing.sm }}>
              <Skeleton width={90} height={24} radius={r.pill} />
              <Skeleton width="70%" height={18} radius={r.pill} />
              <SkeletonCard height={56} bars={1} />
            </View>
          </View>
        ))}
        <View style={{ gap: theme.spacing.sm }}>
          <Skeleton width="60%" height={14} radius={r.pill} />
          <Skeleton height={12} radius={r.pill} />
          <Skeleton width="85%" height={12} radius={r.pill} />
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <Skeleton width={110} height={40} radius={r.pill} />
            <Skeleton width={110} height={40} radius={r.pill} />
          </View>
        </View>
      </View>
    </ShimmerProvider>
  );
}

/** Medicines, Escalation and Family: title and subtitle bars, then four list cards. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  const { theme } = useTheme();
  const r = theme.radius;
  return (
    <ShimmerProvider>
      <View testID="list-skeleton" style={{ padding: PAD, gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.sm }}>
          <Skeleton width={160} height={24} radius={r.pill} />
          <Skeleton width={240} height={14} radius={r.pill} />
        </View>
        {Array.from({ length: rows }, (_, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.md,
              padding: theme.spacing.lg,
              borderRadius: r.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Skeleton width={48} height={48} radius={i % 2 === 0 ? r.md : r.pill} />
            <View style={{ flex: 1, gap: theme.spacing.sm }}>
              <Skeleton width={i % 2 === 0 ? "60%" : "45%"} height={16} radius={r.pill} />
              <Skeleton width={i % 2 === 0 ? "85%" : "70%"} height={12} radius={r.pill} />
            </View>
            <Skeleton width={56} height={24} radius={r.pill} />
          </View>
        ))}
      </View>
    </ShimmerProvider>
  );
}

export function SkeletonForRoute({ name }: { name: string }) {
  const { t } = useTranslation();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("common.loading")}
      accessibilityLiveRegion="polite"
      style={{ flex: 1 }}
    >
      {name === "Today" ? <TodaySkeleton /> : <ListSkeleton />}
    </View>
  );
}
