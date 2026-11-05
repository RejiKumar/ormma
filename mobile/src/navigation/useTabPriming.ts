import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";

/** Shortest time the skeleton shows when a tab opens, so the switch feels instant and settled. */
export const TAB_PRIMING_MS = 350;
/** Same floor for the first screen after launch, a little longer because more is mounting. */
export const FIRST_PRIMING_MS = 600;

let firstOpen = true;

/**
 * True while a tab is priming: from the moment it gains focus until its data has loaded AND the
 * floor has passed. `dataLoading` comes from the screen's real data; the floor only stops a flash.
 */
export function useTabPriming(dataLoading: boolean): boolean {
  const [floorPassed, setFloorPassed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setFloorPassed(false);
      const ms = firstOpen ? FIRST_PRIMING_MS : TAB_PRIMING_MS;
      firstOpen = false;
      const id = setTimeout(() => setFloorPassed(true), ms);
      return () => clearTimeout(id);
    }, []),
  );
  return !floorPassed || dataLoading;
}
