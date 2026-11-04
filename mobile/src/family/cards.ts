// Pure display logic for the prototype screens: dose cards, badges, read receipts, the next-dose
// line, the check-in protocol and the presence badge. No I/O and no catalogue lookups here; the
// screens turn the returned keys and values into text.
import type { TodayDoseEvent } from "./useTodayEvents";

/** A dose resolved within this long after its scheduled time counts as taken on time. */
export const ON_TIME_WINDOW_MS = 30 * 60 * 1000;

const NOT_CONFIRMED = new Set(["missed", "no_answer", "not_taken"]);

export type PeriodKey = "morning" | "afternoon" | "evening" | "night";

/** Morning from 05:00, Afternoon from 12:00, Evening from 17:00, Night from 21:00 until 05:00. */
export function periodKey(hour: number): PeriodKey {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

interface Wall {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function wallClock(timeZone: string, ms: number): Wall {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(ms));
  } catch {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(ms));
  }
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: num("year"), month: num("month"), day: num("day"), hour: num("hour") % 24, minute: num("minute") };
}

/** "8:34 AM" in the parent's timezone. */
export function clock12(timeZone: string, ms: number): string {
  const w = wallClock(timeZone, ms);
  const suffix = w.hour >= 12 ? "PM" : "AM";
  const hour = w.hour % 12 === 0 ? 12 : w.hour % 12;
  return `${hour}:${String(w.minute).padStart(2, "0")} ${suffix}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Mon 19 Oct". */
export function shortDay(timeZone: string, ms: number): string {
  const w = wallClock(timeZone, ms);
  const weekday = new Date(Date.UTC(w.year, w.month - 1, w.day)).getUTCDay();
  return `${WEEKDAYS[weekday]} ${w.day} ${MONTHS[w.month - 1]}`;
}

/** "2 Nov" for a YYYY-MM-DD date string; the input unchanged when it is not a date. */
export function shortDate(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return dateKey;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month}` : dateKey;
}

// ------------------------------------------------------------------ dose cards

export interface MedicineInfo {
  /** "Metformin 500mg". */
  label: string;
  /** Family-entered pill appearance, or "". */
  pill: string;
}

export type CardKind = "taken_on_time" | "taken" | "not_confirmed" | "calling" | "unclear" | "scheduled";

export interface DoseCard {
  /** Scheduled time, epoch ms. */
  key: number;
  scheduledFor: number;
  events: TodayDoseEvent[];
  /** Medicine labels joined with " + ". */
  medicines: string;
  /** Distinct, non-empty pill descriptions in order. */
  pills: string[];
  kind: CardKind;
  /** Time the card was resolved as taken, when the kind is taken or taken_on_time. */
  takenAt: number | null;
  /** Distinct confirmation notes, shown as stored. */
  notes: string[];
  /** Members who saw the card, earliest time per member, in time order. */
  seen: Array<{ uid: string; at: number }>;
  pending: boolean;
}

export function cardKind(events: TodayDoseEvent[]): CardKind {
  if (events.some((e) => e.status === "calling")) return "calling";
  if (events.some((e) => NOT_CONFIRMED.has(e.status))) return "not_confirmed";
  if (events.every((e) => e.status === "taken")) {
    const scheduled = events[0].scheduledFor;
    const resolved = events.map((e) => e.resolvedAt).filter((v): v is number => v !== null);
    if (resolved.length > 0 && Math.max(...resolved) - scheduled <= ON_TIME_WINDOW_MS) return "taken_on_time";
    return "taken";
  }
  if (events.some((e) => e.status === "unclear")) return "unclear";
  return "scheduled";
}

/** One card per scheduled time, in time order, with the medicines of that time combined. */
export function groupCards(events: TodayDoseEvent[], medicines: Record<string, MedicineInfo>): DoseCard[] {
  const byTime = new Map<number, TodayDoseEvent[]>();
  for (const event of events) {
    const list = byTime.get(event.scheduledFor) ?? [];
    list.push(event);
    byTime.set(event.scheduledFor, list);
  }
  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([scheduledFor, list]) => {
      const info = list.map((e) => medicines[e.medicineId]).filter((m): m is MedicineInfo => m !== undefined);
      const kind = cardKind(list);
      const resolved = list.map((e) => e.resolvedAt).filter((v): v is number => v !== null);
      const earliest = new Map<string, number>();
      for (const e of list) {
        for (const [uid, at] of Object.entries(e.seenBy)) {
          const prev = earliest.get(uid);
          if (prev === undefined || at < prev) earliest.set(uid, at);
        }
      }
      return {
        key: scheduledFor,
        scheduledFor,
        events: list,
        medicines: info.map((m) => m.label).filter((l) => l.length > 0).join(" + "),
        pills: [...new Set(info.map((m) => m.pill).filter((p) => p.length > 0))],
        kind,
        takenAt: (kind === "taken" || kind === "taken_on_time") && resolved.length > 0 ? Math.max(...resolved) : null,
        notes: [...new Set(list.map((e) => e.confirmationNote).filter((n): n is string => n !== null))],
        seen: [...earliest.entries()].map(([uid, at]) => ({ uid, at })).sort((a, b) => a.at - b.at),
        pending: kind === "scheduled",
      };
    });
}

/** The first pending card at or after `now`. */
export function nextCard(cards: DoseCard[], now: number): DoseCard | null {
  return cards.find((c) => c.pending && c.scheduledFor >= now) ?? null;
}

// ------------------------------------------------------------------ check-in protocol

export interface ProtocolPolicy {
  retryCount: number;
  retryGapMinutes: number;
  missedAfterMinutes: number;
}

export interface ProtocolStep {
  kind: "call" | "retry" | "alert";
  /** 1 for Call 1; the retry number for retries; 0 for the alert. */
  n: number;
  at: number;
}

/** Call 1 at the dose time, retries after each gap, then the caregiver alert at missedAfterMinutes. */
export function protocolSteps(policy: ProtocolPolicy, firstAt: number): ProtocolStep[] {
  const steps: ProtocolStep[] = [{ kind: "call", n: 1, at: firstAt }];
  for (let i = 1; i <= Math.max(0, policy.retryCount); i += 1) {
    steps.push({ kind: "retry", n: i, at: firstAt + i * policy.retryGapMinutes * 60_000 });
  }
  steps.push({ kind: "alert", n: 0, at: firstAt + policy.missedAfterMinutes * 60_000 });
  return steps;
}

// ------------------------------------------------------------------ presence badge

export const VIEWING_WINDOW_MS = 2 * 60 * 1000;

export type PresenceBadge =
  | { kind: "viewing" }
  | { kind: "time"; time: string }
  | { kind: "yesterday" }
  | { kind: "date"; date: string }
  | null;

/** "Viewing" within 2 minutes, "Seen 9:10 AM" today, "Seen yesterday", otherwise "Seen 2 Nov". */
export function presenceBadge(timeZone: string, lastSeenAt: number | null, now: number): PresenceBadge {
  if (lastSeenAt === null) return null;
  if (now - lastSeenAt <= VIEWING_WINDOW_MS) return { kind: "viewing" };
  const seen = wallClock(timeZone, lastSeenAt);
  const today = wallClock(timeZone, now);
  const dayNumber = (w: Wall) => Math.floor(Date.UTC(w.year, w.month - 1, w.day) / 86_400_000);
  const diff = dayNumber(today) - dayNumber(seen);
  if (diff <= 0) return { kind: "time", time: clock12(timeZone, lastSeenAt) };
  if (diff === 1) return { kind: "yesterday" };
  return { kind: "date", date: `${seen.day} ${MONTHS[seen.month - 1]}` };
}

/** "3 min 5 s" style duration for call history: "48 s", "1 min 12 s". */
export function durationLabel(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const minutes = Math.floor(s / 60);
  const rest = s % 60;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}
