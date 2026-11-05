import type { ComponentType } from "react";
import { View } from "react-native";
import { SkeletonForRoute } from "../components/ScreenSkeletons";
import { useTheme } from "../design/ThemeProvider";
import { useParents } from "../family/useParents";
import { useTabPriming } from "./useTabPriming";

/**
 * Wraps a tab's screen. While the tab primes, a skeleton with the screen's layout covers only the
 * body; the screen stays mounted underneath (so it keeps its data and does not refetch). The app
 * bar and the bottom tabs sit outside this view and stay fixed and tappable.
 */
export function withPriming(name: string, Screen: ComponentType): ComponentType {
  function PrimedTab() {
    const { theme } = useTheme();
    const { loading } = useParents();
    const priming = useTabPriming(name, loading);
    return (
      <View style={{ flex: 1 }}>
        <Screen />
        {priming ? (
          <View
            testID={`priming-${name}`}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.background }}
          >
            <SkeletonForRoute name={name} />
          </View>
        ) : null}
      </View>
    );
  }
  PrimedTab.displayName = `Primed(${name})`;
  return PrimedTab;
}
