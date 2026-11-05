import { useState, type ComponentType } from "react";
import { View } from "react-native";
import { SkeletonForRoute } from "../components/ScreenSkeletons";
import { useTheme } from "../design/ThemeProvider";
import { useParents } from "../family/useParents";
import { TabLoadingProvider } from "./TabLoading";
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
    // The tab's own data hooks report here; the skeleton stays until they and the parents are done.
    const [tabLoading, setTabLoading] = useState(false);
    const priming = useTabPriming(name, loading || tabLoading);
    return (
      <View style={{ flex: 1 }}>
        <TabLoadingProvider onChange={setTabLoading}>
          <Screen />
        </TabLoadingProvider>
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
