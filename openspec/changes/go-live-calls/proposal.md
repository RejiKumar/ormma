# Proposal

## Why

Requested by the user on 2026-11-12 ("inside the project nothing should be used for debug, make it real"; Exotel will be recharged after the Play upload). Two things in the backend are not production behaviour today:

1. **A fake call provider is the silent default.** When `CALL_PROVIDER` is not `exotel`, the dispatcher records a fake call and places none. The missed-dose checker treats any dose still `pending` after its window as missed, so a real family that adds a parent before Exotel is live would receive "missed dose" alerts for calls that never happened.
2. **A spoken reply is never captured.** `functions/src/voice/stt.ts` and `functions/src/reply/processReply.ts` exist and are tested, but nothing calls them. The webhook handles keypad presses only, so the product description ("captures the reply") is not met.

## What Changes

This is an addition requested by the user on 2026-11-12, not part of the BRD. The user decided two things up front: before real calls are on, the app **pauses quietly**, and the launch includes **voice reply with keypad fallback**.

- **Calling is either on or off, and off is safe.** Calling is on only when `CALL_PROVIDER=exotel` and the Exotel configuration is complete. In every other production state, calling is off: no dose events are generated, no call is claimed or placed, no missed-dose alert or digest is raised. The log-only provider remains, but only when `CALL_PROVIDER=log` (tests and emulators), never as a fallback.
- **The family app tells the truth.** A new callable `getCallStatus` returns `{ callsEnabled }`. While it says off, Today shows one calm note: "Check-in calls will start soon." If the status cannot be read, nothing is shown.
- **Go-live cutoff.** An optional `CALLS_LIVE_FROM` instant means doses scheduled before it never dispatch and never alert, so nothing created during testing can fire at go-live.
- **Spoken reply, wired end to end.** Exotel records the parent's answer and calls a new token-protected endpoint. It transcribes in memory, runs `processReply`, applies the result once per call, and answers 200 when applied or 422 when the reply was not usable so the Exotel flow plays the keypad prompt.
- **Leftovers and runbook.** The one-off patch scripts and a committed test output were already removed (commit `81d1d05`). Add `docs/GO-LIVE.md` with the exact order, and a dry-run-by-default script that clears dose events scheduled before go-live.

## Capabilities

### New Capabilities
- `call-activation`: when calling is on or off, what is paused while it is off, how the app learns the state, and the go-live cutoff.

### Modified Capabilities
- `call-flow`: the provider boundary no longer falls back to a fake provider; a new spoken-reply endpoint.
- `missed-dose-alerts`: no alert while calling is off or for doses scheduled before the go-live cutoff.
- `dose-event-lifecycle`: a usable spoken reply transitions a dose exactly like a keypad answer, once per call.
- `dashboard`: the calm "calls will start soon" note.
- `reply-structuring`: `processReply` is reached from the spoken reply endpoint.

## Spec changes

Per the project rules, every change to a call-flow, AI-contracts or medical-safety-adjacent requirement is listed here for review.

| Requirement | Old behaviour | New behaviour | Spec file |
| --- | --- | --- | --- |
| Dispatcher eligibility and provider boundary | Provider is Exotel when `CALL_PROVIDER=exotel`, otherwise the log-only provider writes a fake callSid on claimed events | Provider is Exotel only when `CALL_PROVIDER=exotel` and the config is complete; the log-only provider only when `CALL_PROVIDER=log`; any other state is "calling off": nothing is claimed and no call is placed | `call-flow` |
| Spoken reply endpoint (new) | No endpoint; replies are keypad only | Token-protected endpoint: recording in, STT, `processReply`, apply once, 200 usable or 422 not usable | `call-flow` |
| Calling on and off, pause behaviour, go-live cutoff, call status (new) | Not specified | Defined in the new capability | `call-activation` |
| Alerts only while calling is on (new) | A pending dose past its window is alerted as missed whether or not a call could have been placed | No alert while calling is off or for a dose scheduled before the cutoff | `missed-dose-alerts` |
| Voice reply transitions (new) | Only the keypad changes dose status | A usable spoken reply maps to taken, not taken or unclear through the same transition function, once per CallSid | `dose-event-lifecycle` |
| Calls-not-active note (new) | None | One calm, neutral note on Today while calling is off | `dashboard` |
| Live-call wiring (new) | `processReply` has no caller | Called only from the spoken reply endpoint; output validation and review state unchanged | `reply-structuring` |

Unchanged on purpose: the medical-safety rules, the urgent-keyword pre-check order, schema validation, "no transcripts in logs", the keypad flow, and `firestore.rules` (the status is read through a callable, so there is **no access-control change**).

## Out of scope

Exotel pricing and account setup, new brand work, iOS, any change to the keypad answer mapping, any change to `firestore.rules`, and the Exotel flow itself (documented in `docs/EXOTEL-FLOW.md`, built by the owner in the Exotel dashboard).

## Impact

Code: `functions/src/exotel/config.ts`, `schedule/dispatch.ts`, `schedule/generate.ts`, `schedule/missedDose.ts`, `schedule/eveningDigest.ts`, `voice/stt.ts`, a new `voice/reply.ts`, `index.ts`, and a new status callable; app: Today and a status hook. Deploy: functions plus two secrets already listed in `docs/RELEASE.md`.
