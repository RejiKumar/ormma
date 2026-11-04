import type { TFunction } from "i18next";
import type { TodayDoseEvent } from "./useTodayEvents";
import { formatLocalClock } from "./visibility";

const MISSED = new Set(["missed", "no_answer", "not_taken"]);

/** "Tue, 3 November" in the parent's timezone. */
export function dayLabel(timezone: string, ms: number): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: timezone,
      weekday: "short",
      day: "numeric",
      month: "long",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toDateString();
  }
}

/**
 * The plain-text family update for one parent: a fixed template with the date, doses taken out of the
 * total, the next pending dose time and the times of doses that were not confirmed. No medicine names,
 * values or free text, and nothing generated (family-digest spec). Null when there are no doses today.
 */
export function buildDigest(
  t: TFunction,
  parent: { name: string; timezone: string },
  events: TodayDoseEvent[],
  now: number,
): string | null {
  if (events.length === 0) return null;
  const taken = events.filter((event) => event.status === "taken").length;
  const next = events.find((event) => event.status === "pending" && event.scheduledFor >= now);
  const missed = events
    .filter((event) => MISSED.has(event.status))
    .map((event) => formatLocalClock(parent.timezone, event.scheduledFor));

  const lines = [
    t("digest.header", { name: parent.name, date: dayLabel(parent.timezone, now) }),
    t("digest.progress", { taken, total: events.length }),
  ];
  if (next) lines.push(t("digest.next", { time: formatLocalClock(parent.timezone, next.scheduledFor) }));
  if (missed.length > 0) {
    lines.push(t("digest.missed", { count: missed.length, times: missed.join(", ") }));
  }
  return lines.join("\n");
}
