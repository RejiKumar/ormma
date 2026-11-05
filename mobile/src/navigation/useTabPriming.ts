import { useEffect, useState } from "react";

/** Shortest time the skeleton shows the first time a tab opens, so it does not flash. */
export const TAB_PRIMING_MS = 350;
/** Same floor for the very first screen after launch. */
export const FIRST_PRIMING_MS = 600;

let firstOpen = true;

/**
 * True while a tab primes: from its first render until its data has loaded AND the floor has
 * passed. Only the first open of a tab primes; going back to a tab shows it at once, so there is
 * never a flash of content, then a skeleton, then content again. `dataLoading` is the real data
 * state; the floor only stops a flash.
 */
export function useTabPriming(dataLoading: boolean): boolean {
  const [floorPassed, setFloorPassed] = useState(false);
  useEffect(() => {
    const ms = firstOpen ? FIRST_PRIMING_MS : TAB_PRIMING_MS;
    firstOpen = false;
    const id = setTimeout(() => setFloorPassed(true), ms);
    return () => clearTimeout(id);
  }, []);
  return !floorPassed || dataLoading;
}
