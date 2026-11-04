import type { AlertType, NotifyPrefs } from "../../../shared/types";

// Member push preferences (family-circle and missed-dose-alerts specs). A missing value reads as
// missed on, summary on, quiet off. Urgent alerts are never filtered.

export const DEFAULT_NOTIFY: NotifyPrefs = { missed: true, summary: true, quiet: false };

export function effectiveNotify(value: unknown): NotifyPrefs {
  const v = (value ?? {}) as Partial<NotifyPrefs>;
  return {
    missed: typeof v.missed === "boolean" ? v.missed : DEFAULT_NOTIFY.missed,
    summary: typeof v.summary === "boolean" ? v.summary : DEFAULT_NOTIFY.summary,
    quiet: typeof v.quiet === "boolean" ? v.quiet : DEFAULT_NOTIFY.quiet,
  };
}

/** Local hour (0 to 23) in the given IANA timezone; falls back to Asia/Kolkata offset when unknown. */
export function localHour(timezone: string, ms: number): number {
  try {
    const part = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hour12: false })
      .formatToParts(new Date(ms))
      .find((p) => p.type === "hour")?.value;
    return Number(part) % 24;
  } catch {
    return new Date(ms + 330 * 60_000).getUTCHours();
  }
}

/** Quiet hours run 22:00 to 06:00 local time. */
export function inQuietHours(timezone: string, ms: number): boolean {
  const hour = localHour(timezone, ms);
  return hour >= 22 || hour < 6;
}

/**
 * Whether a member should get a push for this alert type. Urgent alerts always go out; the other
 * types respect `notify.missed` and, when quiet hours are on, the 22:00 to 06:00 window.
 */
export function shouldPushAlert(
  notify: NotifyPrefs,
  alertType: AlertType,
  timezone: string,
  ms: number,
): boolean {
  if (alertType === "urgent") return true;
  if (!notify.missed) return false;
  if (notify.quiet && inQuietHours(timezone, ms)) return false;
  return true;
}
