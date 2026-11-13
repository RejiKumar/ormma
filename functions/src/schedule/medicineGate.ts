import { localClock } from "./time";

/** What the gate needs to know about a medicine. */
export interface GateMedicine {
  active: boolean;
  confirmedByHuman: boolean;
  times: readonly string[];
}

/**
 * True when the medicine exists and no longer asks for a call at this dose time: it was deactivated, is no
 * longer human-confirmed, or no longer lists that local time. The dispatcher already skips such an event; the
 * missed-dose checker uses this so a skipped event is never reported as a missed dose. A medicine that
 * cannot be found is not treated as contradicting the event, so existing behaviour for that case is kept.
 */
export function medicineNoLongerCalls(
  medicine: GateMedicine | undefined,
  scheduledForMs: number,
  timeZone: string,
): boolean {
  if (!medicine) return false;
  return !medicine.active || !medicine.confirmedByHuman || !medicine.times.includes(localClock(scheduledForMs, timeZone));
}
