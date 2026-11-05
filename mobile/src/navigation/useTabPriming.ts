import { useEffect, useState } from "react";

/** Shortest time the skeleton shows the first time a tab opens, so it does not flash. */
export const TAB_PRIMING_MS = 150;
/** Same floor for the very first screen after launch. */
export const FIRST_PRIMING_MS = 600;

/** How long the data must stay loaded before the skeleton lifts. */
export const QUIET_MS = 120;
/** The skeleton never stays longer than this, whatever the data does. */
export const MAX_PRIMING_MS = 6000;

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
  const [quiet, setQuiet] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (primedTabs.has(name)) return;
    const ms = firstOpen ? FIRST_PRIMING_MS : TAB_PRIMING_MS;
    firstOpen = false;
    const floor = setTimeout(() => setFloorPassed(true), ms);
    // A screen whose data never arrives must not hide behind the skeleton for ever.
    const ceiling = setTimeout(() => setGaveUp(true), MAX_PRIMING_MS);
    return () => {
      clearTimeout(floor);
      clearTimeout(ceiling);
    };
  }, [name]);
  // Data counts as loaded only once it has stayed loaded for a moment: a hook that starts its
  // query one render after another has finished must not let half-filled content through.
  useEffect(() => {
    if (dataLoading) {
      setQuiet(false);
      return;
    }
    const id = setTimeout(() => setQuiet(true), QUIET_MS);
    return () => clearTimeout(id);
  }, [dataLoading]);
  const settled = floorPassed && ((quiet && !dataLoading) || gaveUp);
  useEffect(() => {
    if (settled) primedTabs.add(name);
  }, [settled, name]);
  return !primedTabs.has(name) && !settled;
}
