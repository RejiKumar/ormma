import type { QuietHours } from "../../../shared/types";
import { localMinuteOfDay } from "./time";

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DEFAULT_QUIET: QuietHours = { start: "22:00", end: "06:00" };

/** Parses "HH:mm" into minutes since midnight, or null when malformed. */
export function parseClock(value: string): number | null {
  const match = CLOCK.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function windowMinutes(quiet: QuietHours): { start: number; end: number } {
  const start = parseClock(quiet.start);
  const end = parseClock(quiet.end);
  // A broken policy must not silently disable the quiet window: fall back to the default pair.
  if (start === null || end === null) {
    return { start: parseClock(DEFAULT_QUIET.start)!, end: parseClock(DEFAULT_QUIET.end)! };
  }
  return { start, end };
}

/** True when a local minute-of-day falls inside the quiet window (start inclusive, end exclusive, wrap-aware). */
export function isQuietAt(minuteOfDay: number, quiet: QuietHours): boolean {
  const { start, end } = windowMinutes(quiet);
  if (start === end) return false;
  if (start < end) return minuteOfDay >= start && minuteOfDay < end;
  return minuteOfDay >= start || minuteOfDay < end;
}

export function isQuietNow(ms: number, timeZone: string, quiet: QuietHours): boolean {
  return isQuietAt(localMinuteOfDay(ms, timeZone), quiet);
}

/**
 * The instant at which calls may resume. Returns `ms` unchanged when already outside quiet hours.
 * Quiet hours are local wall-clock windows, so the gap is computed on local minutes; DST shifts
 * inside the window are tolerated (India, the launch region, has no DST).
 */
export function firstAllowedAt(ms: number, timeZone: string, quiet: QuietHours): number {
  const minuteOfDay = localMinuteOfDay(ms, timeZone);
  if (!isQuietAt(minuteOfDay, quiet)) return ms;

  const { end } = windowMinutes(quiet);
  const delta = (end - minuteOfDay + 1440) % 1440;
  return ms + (delta === 0 ? 1440 : delta) * 60_000;
}
