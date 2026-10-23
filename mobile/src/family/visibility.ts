// Consent-correct date ranges for client list queries (access-control: "Visibility check
// mechanics"). Firestore rules do not filter: a non-owner's query must carry constraints
// the rule can statically prove, exactly shapes pinned by functions/test/rules/paths.test.ts
// (strict `<` only — `<=` and spanning ranges are denied). Also owns the parent-local
// "today" window, because the dashboard shows today in the parent's timezone.
import type { Role } from "../../../shared/types";

export interface DateRange {
  /** Inclusive lower bound in epoch milliseconds. */
  gte: number;
  /** Exclusive upper bound in epoch milliseconds. */
  lt: number;
}

type Ms = number | { toMillis: () => number };

export interface ConsentWindow {
  status?: string;
  revokedAt?: Ms | null;
  regrantedAt?: Ms | null;
}

function toMs(value: Ms | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? value : value.toMillis();
}

function overlap(gte: number, lt: number): DateRange | null {
  return gte < lt ? { gte, lt } : null;
}

/**
 * The date ranges a member may read for a dated field (alerts `createdAt`,
 * doseEvents `scheduledFor`) inside [windowStart, windowEnd).
 *
 * - Owner, or consent never revoked → the whole window.
 * - Non-owner with no consent map → nothing (fail closed; no query is issued,
 *   so rules never see an unprovable read).
 * - Revoked → only `field < revokedAt`, intersected with the window.
 * - Revoked then re-granted → both visible eras as two disjoint ranges; the
 *   caller subscribes to each and merges.
 */
export function visibilityRanges(
  role: Role | null,
  consent: ConsentWindow | null | undefined,
  windowStart: number,
  windowEnd: number,
): DateRange[] {
  if (role === "owner") {
    const whole = overlap(windowStart, windowEnd);
    return whole ? [whole] : [];
  }
  if (consent === null || consent === undefined) return [];
  const revokedAt = toMs(consent.revokedAt);
  if (revokedAt === null) {
    const whole = overlap(windowStart, windowEnd);
    return whole ? [whole] : [];
  }
  const regrantedAt = toMs(consent.regrantedAt);
  const ranges: DateRange[] = [];
  const before = overlap(windowStart, Math.min(windowEnd, revokedAt));
  if (before) ranges.push(before);
  if (regrantedAt !== null) {
    const after = overlap(Math.max(windowStart, regrantedAt), windowEnd);
    if (after) ranges.push(after);
  }
  return ranges;
}

const FALLBACK_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** `YYYY-MM-DD` of the instant in the given IANA timezone; falls back to Asia/Kolkata. */
export function localDateKey(timezone: string, nowMs: number): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(nowMs));
  } catch {
    return new Date(nowMs + FALLBACK_OFFSET_MS).toISOString().slice(0, 10);
  }
}

/** Offset of the timezone from UTC at the given instant, in milliseconds. */
function offsetAt(timezone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`missing ${type}`);
    return Number(part.value);
  };
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - utcMs;
}

function localMidnight(timezone: string, dateKey: string): number {
  const guess = Date.parse(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(guess)) throw new Error(`bad date key ${dateKey}`);
  // Two passes so a DST shift on that day is accounted for.
  const first = guess - offsetAt(timezone, guess);
  return guess - offsetAt(timezone, first);
}

/**
 * The half-open local-day window `[start, end)` for the parent's timezone at
 * `nowMs`, e.g. Asia/Kolkata 2026-10-22 is [2026-10-21T18:30Z, 2026-10-22T18:30Z).
 */
export function localDayWindow(
  timezone: string,
  nowMs: number,
): { start: number; end: number; dateKey: string } {
  const dateKey = localDateKey(timezone, nowMs);
  try {
    const start = localMidnight(timezone, dateKey);
    const nextKey = localDateKey(timezone, Date.parse(`${dateKey}T00:00:00Z`) + 36 * 60 * 60 * 1000);
    const end = nextKey === dateKey ? start + 24 * 60 * 60 * 1000 : localMidnight(timezone, nextKey);
    return { start, end, dateKey };
  } catch {
    const guess = Date.parse(`${dateKey}T00:00:00Z`);
    const start = guess - FALLBACK_OFFSET_MS;
    return { start, end: start + 24 * 60 * 60 * 1000, dateKey };
  }
}

/**
 * "HH:mm" of an instant in the given timezone, for dose-event clock labels; falls back to
 * Asia/Kolkata when Intl data is missing.
 */
export function formatLocalClock(timezone: string, ms: number): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(ms));
    const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hour}:${minute}`;
  } catch {
    const shifted = new Date(ms + FALLBACK_OFFSET_MS);
    return `${String(shifted.getUTCHours()).padStart(2, "0")}:${String(shifted.getUTCMinutes()).padStart(2, "0")}`;
  }
}
