import { localWallClock } from "../schedule/time";
import { fill, pick, type MemberLanguage } from "./language";
import { ALERT_LINES, type AlertKey } from "./translations";

// Fixed alert wording from the missed-dose-alerts and medical-safety specs. Only the parent's name
// and local clock times are interpolated: never medicine names, doses, readings or transcripts.

export type MissedDoseVariant = "standard" | "group_not_all" | "system_failure";

export interface MissedDoseTemplateInput {
  parentName: string;
  scheduledFor: number;
  lastAttemptAt: number;
  timeZone: string;
  variant: MissedDoseVariant;
  /** The recipient's language; missing means English. */
  language?: MemberLanguage;
}

export function formatAlertClock(ms: number, timeZone: string): string {
  const wall = localWallClock(ms, timeZone);
  const hour12 = wall.hour % 12 === 0 ? 12 : wall.hour % 12;
  const minute = String(wall.minute).padStart(2, "0");
  const meridiem = wall.hour < 12 ? "AM" : "PM";
  return `${hour12}:${minute} ${meridiem}`;
}

const nameOf = (value: string, language: MemberLanguage): string =>
  value.trim() || pick(ALERT_LINES, language, "fallbackName");

export function buildMissedDoseMessage(input: MissedDoseTemplateInput): string {
  const language = input.language ?? "en";
  const name = nameOf(input.parentName, language);
  const clock = formatAlertClock(input.scheduledFor, input.timeZone);
  const last = formatAlertClock(input.lastAttemptAt, input.timeZone);
  return fill(pick(ALERT_LINES, language, input.variant), { name, clock, last });
}

export function buildUrgentMessage(parentName: string, language: MemberLanguage = "en"): string {
  return fill(pick(ALERT_LINES, language, "urgent"), { name: nameOf(parentName, language) });
}

/** The push title for an alert type, in the recipient's language. */
export function alertTitle(type: string, language: MemberLanguage = "en"): string {
  const key: AlertKey = type === "missed_dose" ? "titleMissed" : type === "urgent" ? "titleUrgent" : "titleOther";
  return pick(ALERT_LINES, language, key);
}
