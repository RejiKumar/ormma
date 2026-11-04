import { localWallClock } from "./schedule/time";

// The fixed family-update template (evening-digest spec). Pure and English-only on the server; the
// app builds the same text on the device. No free text, notes, readings or advice.

export interface DigestEvent {
  scheduledForMs: number;
  /** Time the dose was resolved as taken, when known. */
  resolvedAtMs: number | null;
  status: string;
  /** "Metformin 500mg" for the event's medicine; empty when unknown. */
  medicine: string;
}

export interface DigestCard {
  scheduledForMs: number;
  medicines: string;
  taken: boolean;
  notConfirmed: boolean;
  pending: boolean;
  resolvedAtMs: number | null;
}

const NOT_CONFIRMED = new Set(["missed", "no_answer", "not_taken"]);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Morning from 05:00, Afternoon from 12:00, Evening from 17:00, Night from 21:00 until 05:00. */
export function periodName(hour: number): "Morning" | "Afternoon" | "Evening" | "Night" {
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

/** "8:34 AM" in the given timezone. */
export function clock12(ms: number, timeZone: string): string {
  const wall = localWallClock(ms, timeZone);
  const suffix = wall.hour >= 12 ? "PM" : "AM";
  const hour = wall.hour % 12 === 0 ? 12 : wall.hour % 12;
  return `${hour}:${String(wall.minute).padStart(2, "0")} ${suffix}`;
}

/** "Mon 19 Oct" in the given timezone. */
export function dayLabel(ms: number, timeZone: string): string {
  const wall = localWallClock(ms, timeZone);
  const weekday = new Date(Date.UTC(wall.year, wall.month - 1, wall.day)).getUTCDay();
  return `${WEEKDAYS[weekday]} ${wall.day} ${MONTHS[wall.month - 1]}`;
}

/** Groups events at the same scheduled time into one card, in time order. */
export function groupCards(events: DigestEvent[]): DigestCard[] {
  const byTime = new Map<number, DigestEvent[]>();
  for (const event of events) {
    const list = byTime.get(event.scheduledForMs) ?? [];
    list.push(event);
    byTime.set(event.scheduledForMs, list);
  }
  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([scheduledForMs, list]) => {
      const resolved = list.map((e) => e.resolvedAtMs).filter((v): v is number => typeof v === "number");
      return {
        scheduledForMs,
        medicines: list.map((e) => e.medicine).filter((m) => m.length > 0).join(" + "),
        taken: list.every((e) => e.status === "taken"),
        notConfirmed: list.some((e) => NOT_CONFIRMED.has(e.status)),
        pending: list.some((e) => e.status === "pending"),
        resolvedAtMs: resolved.length > 0 ? Math.max(...resolved) : null,
      };
    });
}

/** The digest text, or null when there are no doses today. */
export function buildDigestText(input: {
  name: string;
  nowMs: number;
  timeZone: string;
  events: DigestEvent[];
}): string | null {
  const cards = groupCards(input.events);
  if (cards.length === 0) return null;
  const tz = input.timeZone;
  const taken = cards.filter((c) => c.taken);
  const notConfirmed = cards.filter((c) => c.notConfirmed);

  const lines = [`Ormma update, ${dayLabel(input.nowMs, tz)}`];
  if (notConfirmed.length === 0) {
    lines.push(`${input.name} is on track: ${taken.length} of ${cards.length} doses confirmed.`);
  } else {
    const times = notConfirmed.map((c) => clock12(c.scheduledForMs, tz)).join(", ");
    const plural = notConfirmed.length > 1 ? "s" : "";
    lines.push(`${input.name} has not confirmed ${notConfirmed.length} dose${plural}: ${times}. Please check in.`);
  }
  const firstTaken = taken.find((c) => c.resolvedAtMs !== null);
  if (firstTaken && firstTaken.resolvedAtMs !== null) {
    const period = periodName(localWallClock(firstTaken.scheduledForMs, tz).hour);
    lines.push(`${period} dose taken at ${clock12(firstTaken.resolvedAtMs, tz)}.`);
  }
  const next = cards.find((c) => c.pending && c.scheduledForMs >= input.nowMs);
  if (next) {
    const meds = next.medicines.length > 0 ? `${next.medicines} ` : "";
    lines.push(`Next: ${meds}at ${clock12(next.scheduledForMs, tz)}.`.replace("Next:  at", "Next: at"));
  }
  return lines.join("\n");
}
