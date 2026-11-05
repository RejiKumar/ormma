import { useEffect, useState } from "react";

/** Shortest time the skeleton shows the first time a tab opens, so it does not flash. */
export const TAB_PRIMING_MS = 350;
/** Same floor for the very first screen after launch. */
export const FIRST_PRIMING_MS = 600;

let firstOpen = true;
/** Tabs that have finished priming once. Kept outside React so a remount cannot bring the skeleton back. */
const primedTabs = new Set<string>();

/**
 * True while a tab primes: from its first render until its data has loaded AND the floor has
 * passed. Only the first open of a tab primes; going back to a tab shows it at once, even if the
 * data refreshes or the screen remounts, so there is never a flash of content, then a skeleton,
 * then content again. `dataLoading` is the real data state; the floor only stops a flash.
 */
export function useTabPriming(name: string, dataLoading: boolean): boolean {
  const [floorPassed, setFloorPassed] = useState(false);
  useEffect(() => {
    if (primedTabs.has(name)) return;
    const ms = firstOpen ? FIRST_PRIMING_MS : TAB_PRIMING_MS;
    firstOpen = false;
    const id = setTimeout(() => setFloorPassed(true), ms);
    return () => clearTimeout(id);
  }, [name]);
  const settled = floorPassed && !dataLoading;
  useEffect(() => {
    if (settled) primedTabs.add(name);
  }, [settled, name]);
  return !primedTabs.has(name) && !settled;
}
