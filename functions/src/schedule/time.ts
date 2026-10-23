// Timezone-aware wall-clock helpers for the scheduling functions.
// The app stores local "HH:mm" medicine times and date strings, so every conversion goes through
// Intl instead of the server's own timezone. All instants returned to callers are epoch milliseconds.

export const FALLBACK_TIME_ZONE = "Asia/Kolkata";

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached) return cached;

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: FALLBACK_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  }
  formatters.set(timeZone, formatter);
  return formatter;
}

export function localWallClock(ms: number, timeZone: string): WallClock {
  const parts = formatterFor(timeZone).formatToParts(new Date(ms));
  const value = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((candidate) => candidate.type === type);
    return part ? Number(part.value) : 0;
  };
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

const pad = (value: number, size = 2): string => String(value).padStart(size, "0");

/** Local calendar date of an instant, as "YYYY-MM-DD". */
export function localDateKey(ms: number, timeZone: string): string {
  const wall = localWallClock(ms, timeZone);
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;
}

/** Local wall clock of an instant, as "HH:mm". */
export function localClock(ms: number, timeZone: string): string {
  const wall = localWallClock(ms, timeZone);
  return `${pad(wall.hour)}:${pad(wall.minute)}`;
}

/** Local minutes since midnight (0-1439). */
export function localMinuteOfDay(ms: number, timeZone: string): number {
  const wall = localWallClock(ms, timeZone);
  return wall.hour * 60 + wall.minute;
}

/** Deterministic event-id suffix for an instant: local "yyyyMMddHHmm". */
export function localEventIdSuffix(ms: number, timeZone: string): string {
  const wall = localWallClock(ms, timeZone);
  return `${wall.year}${pad(wall.month)}${pad(wall.day)}${pad(wall.hour)}${pad(wall.minute)}`;
}

function zoneOffsetMs(ms: number, timeZone: string): number {
  const wall = localWallClock(ms, timeZone);
  const wallMs = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return wallMs - Math.floor(ms / 1000) * 1000;
}

/**
 * Converts a local date ("YYYY-MM-DD") and clock ("HH:mm") in `timeZone` to epoch ms.
 * Returns null for malformed input or a wall clock that does not exist (DST spring-forward gap).
 */
export function zonedTimeToMs(dateKey: string, clock: string, timeZone: string): number | null {
  const dateMatch = DATE_KEY.exec(dateKey);
  const clockMatch = CLOCK.exec(clock);
  if (!dateMatch || !clockMatch) return null;

  const [, ys, ms, ds] = dateMatch;
  const [, hs, mins] = clockMatch;
  const guess = Date.UTC(Number(ys), Number(ms) - 1, Number(ds), Number(hs), Number(mins));

  const first = guess - zoneOffsetMs(guess, timeZone);
  const second = guess - zoneOffsetMs(first, timeZone);

  for (const candidate of [second, first]) {
    if (localDateKey(candidate, timeZone) === dateKey && localClock(candidate, timeZone) === clock) {
      return candidate;
    }
  }
  return null;
}

/** Next local calendar date key, independent of the server timezone. */
export function nextDateKey(dateKey: string): string | null {
  const match = DATE_KEY.exec(dateKey);
  if (!match) return null;
  const [, y, m, d] = match;
  const next = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}
