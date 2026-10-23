import type { DoseStatus, ResolvedBy } from "../../../shared/types";

// Single source of truth for dose-event transitions (dose-event-lifecycle spec). Pure: callers pass
// the current state plus a transition event and write the returned patch. `null` means "not allowed".

export interface DoseEventState {
  status: DoseStatus;
  attempts: number;
  scheduledFor: number;
  lastCallSid: string | null;
  missedAt: number | null;
  resolvedAt: number | null;
  resolvedBy: ResolvedBy | null;
  resolvedByUid: string | null;
  alertSent: boolean;
  groupConfirmed: boolean;
  lastCallAt: number | null;
  reminderAt: number | null;
}

export type CallAnswerVia = Extract<ResolvedBy, "dtmf" | "voice">;

export type DoseTransition =
  | { type: "call_started"; at: number }
  | { type: "answered_yes"; at: number; via: CallAnswerVia; grouped: boolean }
  | {
      type: "answered_not_yet";
      at: number;
      grouped: boolean;
      retryGapMinutes: number;
    }
  | { type: "no_answer"; at: number; retryCount: number }
  | { type: "unclear"; at: number }
  | { type: "reminder_due"; at: number; retryCount: number }
  | { type: "missed_check"; at: number; missedAfterMinutes: number }
  | { type: "family_confirm"; at: number; uid: string }
  | { type: "family_override"; at: number; uid: string };

export interface TransitionEffect {
  /** Set when a one-off reminder instant was scheduled. */
  reminderAt?: number;
  /** Set when this transition moves the event into missed. */
  missed?: boolean;
  /** Set when the missed dose still needs its family alert. */
  alert?: "missed_dose";
}

export interface TransitionResult {
  state: DoseEventState;
  effect: TransitionEffect;
}

const OPEN_FOR_FAMILY: DoseStatus[] = ["pending", "calling", "not_taken", "no_answer", "unclear"];

const missedResult = (state: DoseEventState, at: number): TransitionResult => ({
  state: { ...state, status: "missed", missedAt: at },
  effect: { missed: true, ...(state.alertSent ? {} : { alert: "missed_dose" as const }) },
});

export function applyTransition(
  state: DoseEventState,
  transition: DoseTransition,
): TransitionResult | null {
  switch (transition.type) {
    case "call_started": {
      if (state.status !== "pending") return null;
      return {
        state: {
          ...state,
          status: "calling",
          attempts: state.attempts + 1,
          lastCallAt: transition.at,
        },
        effect: {},
      };
    }

    case "answered_yes": {
      if (state.status !== "calling") return null;
      return {
        state: {
          ...state,
          status: "taken",
          resolvedAt: transition.at,
          resolvedBy: transition.via,
          resolvedByUid: null,
          groupConfirmed: transition.grouped,
        },
        effect: {},
      };
    }

    case "answered_not_yet": {
      if (state.status !== "calling") return null;
      if (state.reminderAt !== null) {
        // One extra reminder per event: a later "not yet" reply cannot schedule another.
        return {
          state: { ...state, status: "not_taken", resolvedAt: null, groupConfirmed: transition.grouped },
          effect: {},
        };
      }
      const reminderAt = transition.at + transition.retryGapMinutes * 60_000;
      return {
        state: {
          ...state,
          status: "not_taken",
          resolvedAt: null,
          groupConfirmed: transition.grouped,
          reminderAt,
        },
        effect: { reminderAt },
      };
    }

    case "no_answer": {
      if (state.status !== "calling") return null;
      if (state.attempts >= 1 + transition.retryCount) {
        return missedResult(state, transition.at);
      }
      return { state: { ...state, status: "pending" }, effect: {} };
    }

    case "unclear": {
      if (state.status !== "calling") return null;
      if (state.reminderAt !== null) {
        return { state: { ...state, status: "unclear" }, effect: {} };
      }
      return {
        state: { ...state, status: "unclear", reminderAt: transition.at },
        effect: { reminderAt: transition.at },
      };
    }

    case "reminder_due": {
      if (state.status !== "not_taken" && state.status !== "unclear") return null;
      if (state.reminderAt === null || transition.at < state.reminderAt) return null;
      if (state.attempts >= 1 + transition.retryCount) {
        return missedResult(state, transition.at);
      }
      return { state: { ...state, status: "pending" }, effect: {} };
    }

    case "missed_check": {
      if (!["pending", "no_answer", "unclear", "not_taken"].includes(state.status)) return null;
      if (transition.at < state.scheduledFor + transition.missedAfterMinutes * 60_000) return null;
      return missedResult(state, transition.at);
    }

    case "family_confirm": {
      if (!OPEN_FOR_FAMILY.includes(state.status)) return null;
      return {
        state: {
          ...state,
          status: "taken",
          resolvedAt: transition.at,
          resolvedBy: "family",
          resolvedByUid: transition.uid,
          groupConfirmed: false,
        },
        effect: {},
      };
    }

    case "family_override": {
      if (state.status !== "missed") return null;
      return {
        state: {
          ...state,
          status: "taken",
          resolvedAt: transition.at,
          resolvedBy: "family",
          resolvedByUid: transition.uid,
        },
        effect: {},
      };
    }

    default:
      return null;
  }
}
