import { localWallClock } from "../schedule/time";

// Fixed alert wording from the missed-dose-alerts and medical-safety specs. Only the parent's name
// and local clock times are interpolated: never medicine names, doses, readings or transcripts.

export type MissedDoseVariant = "standard" | "group_not_all" | "system_failure";

export interface MissedDoseTemplateInput {
  parentName: string;
  scheduledFor: number;
  lastAttemptAt: number;
  timeZone: string;
  variant: MissedDoseVariant;
}

export function formatAlertClock(ms: number, timeZone: string): string {
  const wall = localWallClock(ms, timeZone);
  const hour12 = wall.hour % 12 === 0 ? 12 : wall.hour % 12;
  const minute = String(wall.minute).padStart(2, "0");
  const meridiem = wall.hour < 12 ? "AM" : "PM";
  return `${hour12}:${minute} ${meridiem}`;
}

const nameOf = (value: string): string => value.trim() || "The parent";

export function buildMissedDoseMessage(input: MissedDoseTemplateInput): string {
  const name = nameOf(input.parentName);
  const clock = formatAlertClock(input.scheduledFor, input.timeZone);

  if (input.variant === "group_not_all") {
    return `${name} did not confirm all of the ${clock} tablets. Please follow up.`;
  }
  if (input.variant === "system_failure") {
    return `We could not complete the call to ${name} about the ${clock} tablets. Please check.`;
  }
  const lastAttempt = formatAlertClock(input.lastAttemptAt, input.timeZone);
  return `${name} has not confirmed the ${clock} tablets. Last attempt at ${lastAttempt}. Please check.`;
}

export function buildUrgentMessage(parentName: string): string {
  return `${nameOf(parentName)} mentioned something urgent. Please call them now.`;
}
