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
Terminal states: taken, missed. "not_taken" after max retries becomes "missed".

## Call script (spoken in the parent's language via TTS)
1. Greeting using the parent's name and the medicine time. Keep under 10 seconds.
2. Question: "Did you take your tablet? Say yes or no, or press 1 for yes, 2 for no."
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
- Two medicines at the same time: combine into one call ("morning tablets").
- Medicine edited or deactivated after events were generated: dispatcher re-checks the medicine before calling.
- Exotel or Google or Claude API outage: event stays pending, retry with backoff; family is alerted if an event goes missed because of a system failure (distinguish in alert text).
- Daylight and timezone: all schedule math in the parent's timezone.
- Duplicate scheduler invocations (at-least-once delivery).
- Claude returns invalid JSON: store the log with needsReview=true, do not infer dose status from it. DTMF result still stands.

## Missed-dose alert
- Triggered once per doseEvent (alertSent flag).
- Text template, no raw medical values: "Amma has not confirmed the 8:00 PM tablets. Last attempt at 8:20 PM. Please check."
- Sent via FCM to all members; also written to alerts collection.

## Tests required
Unit tests for the state machine transitions, the transaction claim, quiet-hours logic, and webhook idempotency, using mocked Exotel, Google, and Claude clients.
