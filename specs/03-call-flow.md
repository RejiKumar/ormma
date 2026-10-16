# Spec 03: Medicine Reminder Call Flow

## Goal
Phone the parent at each medicine time, learn whether they took it, and alert the family if not.

## Components
1. generateDoseEvents (scheduled daily, 00:30 IST): creates doseEvents for the next 24h from active, human-confirmed medicines.
2. dispatchDueCalls (scheduled every minute): finds doseEvents with status "pending" and scheduledFor <= now, within quiet-hours rules, and starts calls.
3. exotelWebhook (HTTPS): receives call status and DTMF/voice callbacks.
4. processReply: STT, then Claude Haiku structuring, then writes.
5. missedDoseChecker (scheduled every minute): marks events "missed" after policy window and alerts family.

## State machine for doseEvent
pending -> calling -> taken
pending -> calling -> not_taken (parent says not yet; schedule one extra reminder after retryGapMinutes)
calling -> no_answer -> pending (retry, attempts+1) ... -> missed
calling -> unclear (reply not understood after DTMF fallback) -> pending (retry) ... -> missed
any non-terminal -> taken (family manually confirms in app)
missed -> taken (family override only, see below)
Terminal states: taken, missed. "not_taken" after max retries becomes "missed". The server never moves an event out of `missed`; no call, retry or webhook can change it.

## Family override of a missed dose
- An owner or editor may change a `missed` event to `taken` in the app (resolvedBy "family"). Viewers cannot. `resolvedAt` is set to the override time and `resolvedByUid` to the member who did it.
- `missedAt` is set when the event goes missed and is never cleared or changed, so the history shows it was missed and later confirmed by family.
- The original missed-dose alert is neither retracted nor re-sent. The override never triggers a new alert.
- In a group, the override applies to the one event the member confirmed (see "Grouped calls").
- An override changes nothing else: `attempts`, `alertSent` and `lastCallSid` stay as they were.

## Grouped calls (two or more medicines at the same time)
Applies when more than one eligible doseEvent for a parent has the same `scheduledFor`. A single eligible event uses the normal one-medicine flow below.
- One call covers the whole group. Group key: (parentId, scheduledFor). Each medicine keeps its own doseEvent.
- Group members are fixed at claim time, after the medicine re-check (inactive or edited medicines are left out). The dispatcher claims every member in one transaction, all or nothing. A failed claim skips the whole group.
- `callSessions.doseEventIds: string[]` replaces `doseEventId`. All members share attempts, retries and `lastCallSid`.
- Answers apply to every event in the call:
  - Press 1 ("yes, all of them"): every event becomes `taken`, resolvedBy "dtmf", `groupConfirmed: true`.
  - Press 2 ("did not take all of them"): every event becomes `not_taken` (not `missed`), `groupConfirmed: true`, and the usual single extra reminder after retryGapMinutes is scheduled for the whole group.
  - Anything else: `unclear`, handled as in the state machine below.
- Partial answers are NOT supported in v1. A parent who took only some tablets must press 2. This is a documented limitation.
- `groupConfirmed` is true only when the answer came from a grouped call. It is false for single-medicine events and for family confirmations.
- A family member confirming one event in the app changes only that event. The other events in the group are unaffected.
- No-answer, busy, dropped call and retries act on the whole group together. The group goes `no_answer` -> `pending` as one.
- Missed-dose alert: one alert per group, not one per medicine (all members' `alertSent` set in the same transaction). Wording variants are under "Missed-dose alert".
- Family app: grouped events are shown as one row, "Morning tablets (2), confirmed together", with a note that medicines in the group were not checked individually. The label ("Morning tablets") is a fixed template per time of day, never AI-generated.

## Call script (spoken in the parent's language via TTS)
1. Greeting using the parent's name and the medicine time. Keep under 10 seconds.
2. Question:
   - Single medicine: "Did you take your tablet? Say yes or no, or press 1 for yes, 2 for no."
   - Grouped call: "Did you take ALL of your morning tablets? Press 1 for yes, all of them. Press 2 if you did not take all of them." (DTMF only. "ALL" is stressed. Voice replies are not accepted on grouped calls in v1, so a vague "yes" cannot confirm several medicines.) The time-of-day word follows the scheduled time (morning, afternoon, evening, night); the translated wording goes in the templates file for native-speaker review.
3. Capture: DTMF first-class. Voice optional.
4. Optional second question (once only): "Any problem today? How was your BP or sugar?" Skippable by pressing 0.
5. Closing: thank-you line. No medical advice. Ever.

## Idempotency and safety
- eventId is deterministic, so regenerating never duplicates.
- Dispatcher claims an event with a Firestore transaction (pending -> calling, attempts+1). If the transaction fails, skip.
- Webhook handlers must be idempotent: duplicate callbacks for the same callSid must not create duplicate logs or alerts.
- Validate webhook authenticity (shared secret or Exotel signature mechanism; confirm in Exotel docs).
- Never call outside quiet hours; defer to the first allowed minute, except missed-dose alerts to family which are always allowed.
- Never call a parent whose consent.status is not "granted", or whose `active` is false.
- Max 1 call per dose event per 10 minutes; max total attempts = 1 + retryCount.

## Edge cases that must be handled
- Parent does not answer, voicemail, busy, switched off.
- Wrong number or another person answers: if reply is not recognised, treat as unclear. Do not store anything from a stranger as health data.
- Call drops mid-script: mark session failed, retry.
- Parent speaks a different language than configured: STT returns low confidence; fall back to DTMF prompt.
- Two medicines at the same time: combine into one call, see "Grouped calls".
- Medicine edited or deactivated after events were generated: dispatcher re-checks the medicine before calling.
- Exotel or Google or Claude API outage: event stays pending, retry with backoff; family is alerted if an event goes missed because of a system failure (distinguish in alert text).
- Daylight and timezone: all schedule math in the parent's timezone.
- Duplicate scheduler invocations (at-least-once delivery).
- Claude returns invalid JSON: store the log with needsReview=true, do not infer dose status from it. DTMF result still stands.

## Missed-dose alert
- Triggered once per doseEvent (alertSent flag).
- Text template, no raw medical values: "Amma has not confirmed the 8:00 PM tablets. Last attempt at 8:20 PM. Please check."
- Sent via FCM to all members; also written to alerts collection.
- Variant for a group where the parent pressed 2 at any point: "Amma did not confirm all of the 8:00 PM tablets. Please follow up." Still no medicine names or values.
- Variant for a group that went missed with no answer from the parent: the standard text above.
- There is no separate immediate alert when the parent presses 2; the "did not confirm all" wording is used only when the group goes missed.

## Tests required
Unit tests for the state machine transitions, the transaction claim, quiet-hours logic, and webhook idempotency, using mocked Exotel, Google, and Claude clients.

Grouped-call tests (2 medicines at the same time):
1. Press 1: both events `taken`, resolvedBy "dtmf", `groupConfirmed` true, one callSession with both ids in `doseEventIds`, no alert.
2. Press 2: both events `not_taken` (not `missed`), `groupConfirmed` true, one extra reminder scheduled for the group, and the "not all confirmed" alert wording used if the group ends missed.
3. No answer: both events return to `pending` together with attempts+1; after max attempts both are `missed` and exactly one alert is sent.
4. Claim is all-or-nothing: if one member's claim fails, none are claimed.
5. Duplicate webhook for the same callSid creates no duplicate logs, alerts or transitions.
6. A medicine deactivated before dispatch is left out; if one eligible event remains, the single-medicine script is used.

Family override tests:
1. A family override changes `missed` to `taken` with resolvedBy "family", sets `resolvedAt`, and keeps `missedAt` unchanged.
2. The override sends no alert and does not reset `alertSent`.
3. A late webhook, retry or dispatcher run cannot move an event out of `missed`.
4. A viewer cannot perform the override (the rule is tested in the emulator, spec 02 test 11; the app also hides the control).
