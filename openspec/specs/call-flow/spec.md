# call-flow Specification

## Purpose
Phone the parent at each medicine time, learn whether they took it, and alert the family if not. Migrated verbatim from the goal, components, call script, idempotency and safety, edge cases and unit-test sections of specs/03-call-flow.md.

## Requirements

### Requirement: Component 1 generateDoseEvents
The system SHALL have this component:
1. generateDoseEvents (scheduled daily, 00:30 IST): creates doseEvents for the next 24h from active, human-confirmed medicines.

#### Scenario: Daily generation
- **WHEN** generateDoseEvents runs at 00:30 IST
- **THEN** it creates doseEvents for the next 24h from active, human-confirmed medicines

### Requirement: Component 2 dispatchDueCalls
The system SHALL have this component:
2. dispatchDueCalls (scheduled every minute): finds doseEvents with status "pending" and scheduledFor <= now, within quiet-hours rules, and starts calls.

#### Scenario: Due calls
- **WHEN** dispatchDueCalls runs each minute
- **THEN** it finds doseEvents with status "pending" and scheduledFor <= now, within quiet-hours rules, and starts calls

### Requirement: Component 3 exotelWebhook
The system SHALL have this component:
3. exotelWebhook (HTTPS): receives call status and DTMF/voice callbacks.

#### Scenario: Callbacks
- **WHEN** Exotel sends a call status or DTMF/voice callback
- **THEN** exotelWebhook receives it over HTTPS

### Requirement: Component 4 processReply
The system SHALL have this component:
4. processReply: STT, then Claude Haiku structuring, then writes.

#### Scenario: Reply processing order
- **WHEN** a voice reply is processed
- **THEN** processReply runs STT, then Claude Haiku structuring, then writes

### Requirement: Component 5 missedDoseChecker
The system SHALL have this component:
5. missedDoseChecker (scheduled every minute): marks events "missed" after policy window and alerts family.

#### Scenario: Missed marking
- **WHEN** missedDoseChecker runs each minute and an event is past the policy window
- **THEN** it marks the event "missed" and alerts family

### Requirement: Call script language
The following SHALL hold: Call script (spoken in the parent's language via TTS).

#### Scenario: Script language
- **WHEN** the call script is spoken
- **THEN** it is spoken in the parent's language via TTS

### Requirement: Call script step 1 greeting
The call script SHALL have this step:
1. Greeting using the parent's name and the medicine time. Keep under 10 seconds.

#### Scenario: Greeting
- **WHEN** the call script is spoken
- **THEN** step 1 is a greeting using the parent's name and the medicine time, kept under 10 seconds

### Requirement: Call script step 2 question
The call script SHALL have this step:
2. Question:
   - Single medicine: "Did you take your tablet? Say yes or no, or press 1 for yes, 2 for no."

#### Scenario: Single-medicine question
- **WHEN** a call covers a single medicine
- **THEN** the question is "Did you take your tablet? Say yes or no, or press 1 for yes, 2 for no."

### Requirement: Call script step 3 capture
The call script SHALL have this step:
3. Capture: DTMF first-class. Voice optional.

#### Scenario: Capture
- **WHEN** a reply is captured
- **THEN** DTMF is first-class and voice is optional

### Requirement: Call script step 4 optional second question
The call script SHALL have this step:
4. Optional second question (once only): "Any problem today? How was your BP or sugar?" Skippable by pressing 0.

#### Scenario: Second question
- **WHEN** the optional second question is asked
- **THEN** it is asked once only, as "Any problem today? How was your BP or sugar?"
- **AND** it is skippable by pressing 0

### Requirement: Call script step 5 closing
The call script SHALL have this step:
5. Closing: thank-you line. No medical advice. Ever.

#### Scenario: Closing
- **WHEN** the call closes
- **THEN** the closing is a thank-you line with no medical advice

### Requirement: Deterministic eventId
The following SHALL hold:
- eventId is deterministic, so regenerating never duplicates.

#### Scenario: Regeneration
- **WHEN** doseEvents are regenerated
- **THEN** no duplicate doseEvent is created

### Requirement: Transactional claim
The following SHALL hold:
- Dispatcher claims an event with a Firestore transaction (pending -> calling, attempts+1). If the transaction fails, skip.

#### Scenario: Claim fails
- **WHEN** the claim transaction fails
- **THEN** the dispatcher skips the event

### Requirement: Idempotent webhook handlers
The following SHALL hold:
- Webhook handlers must be idempotent: duplicate callbacks for the same callSid must not create duplicate logs or alerts.

#### Scenario: Duplicate callback
- **WHEN** a duplicate callback arrives for the same callSid
- **THEN** no duplicate logs or alerts are created

### Requirement: Webhook authenticity
The following SHALL hold:
- Validate webhook authenticity (shared secret or Exotel signature mechanism; confirm in Exotel docs).

#### Scenario: Webhook validation
- **WHEN** a webhook request arrives
- **THEN** its authenticity is validated by shared secret or the Exotel signature mechanism

### Requirement: Quiet hours
The following SHALL hold:
- Never call outside quiet hours; defer to the first allowed minute, except missed-dose alerts to family which are always allowed.

#### Scenario: Call due in quiet hours
- **WHEN** a call is due outside the allowed hours
- **THEN** it is deferred to the first allowed minute
- **AND** missed-dose alerts to family are always allowed

### Requirement: Consent and active gate
The following SHALL hold:
- Never call a parent whose consent.status is not "granted" (except a call of type "consent" while consent.status is "pending"; see "Consent call type"), or whose `active` is false.

#### Scenario: Parent not eligible
- **WHEN** a parent's consent.status is not "granted" or `active` is false
- **THEN** the parent is not called, except that a call of type "consent" is allowed while consent.status is "pending" and `active` is true

### Requirement: Call and attempt limits
The following SHALL hold:
- Max 1 call per dose event per 10 minutes; max total attempts = 1 + retryCount.

#### Scenario: Limits
- **WHEN** calls are made for a dose event
- **THEN** there is at most 1 call per 10 minutes
- **AND** total attempts are at most 1 + retryCount

### Requirement: Edge case no answer
The following edge case SHALL be handled:
- Parent does not answer, voicemail, busy, switched off.

#### Scenario: Parent does not answer
- **WHEN** the parent does not answer, reaches voicemail, is busy or the phone is switched off
- **THEN** the case is handled as an edge case

### Requirement: Edge case wrong number
The following edge case SHALL be handled:
- Wrong number or another person answers: if reply is not recognised, treat as unclear. Do not store anything from a stranger as health data.

#### Scenario: Stranger answers
- **WHEN** another person answers and the reply is not recognised
- **THEN** it is treated as unclear
- **AND** nothing from a stranger is stored as health data

### Requirement: Edge case call drops
The following edge case SHALL be handled:
- Call drops mid-script: mark session failed, retry.

#### Scenario: Call drops
- **WHEN** the call drops mid-script
- **THEN** the session is marked failed and the call is retried

### Requirement: Edge case different language
The following edge case SHALL be handled:
- Parent speaks a different language than configured: STT returns low confidence; fall back to DTMF prompt.

#### Scenario: Different language
- **WHEN** the parent speaks a different language than configured and STT returns low confidence
- **THEN** the flow falls back to the DTMF prompt

### Requirement: Edge case two medicines at the same time
The following edge case SHALL be handled:
- Two medicines at the same time: combine into one call, see "Grouped calls".

(Where this text says "Grouped calls", it refers to the capability `grouped-calls`.)

#### Scenario: Two medicines at the same time
- **WHEN** two medicines are due at the same time
- **THEN** they are combined into one call

### Requirement: Edge case medicine edited or deactivated
The following edge case SHALL be handled:
- Medicine edited or deactivated after events were generated: dispatcher re-checks the medicine before calling.

#### Scenario: Medicine changed after generation
- **WHEN** a medicine is edited or deactivated after events were generated
- **THEN** the dispatcher re-checks the medicine before calling

### Requirement: Edge case API outage
The following edge case SHALL be handled:
- Exotel or Google or Claude API outage: event stays pending, retry with backoff; family is alerted if an event goes missed because of a system failure (distinguish in alert text).

#### Scenario: Outage
- **WHEN** the Exotel, Google or Claude API is down
- **THEN** the event stays pending and is retried with backoff
- **AND** the family is alerted, with distinct alert text, if an event goes missed because of a system failure

### Requirement: Edge case daylight and timezone
The following edge case SHALL be handled:
- Daylight and timezone: all schedule math in the parent's timezone.

#### Scenario: Schedule math
- **WHEN** schedule times are computed
- **THEN** all schedule math is in the parent's timezone

### Requirement: Edge case duplicate scheduler invocations
The following edge case SHALL be handled:
- Duplicate scheduler invocations (at-least-once delivery).

#### Scenario: Duplicate invocation
- **WHEN** a scheduler function is invoked more than once for the same time
- **THEN** the duplicate invocation is handled

### Requirement: Edge case Claude returns invalid JSON
The following edge case SHALL be handled:
- Claude returns invalid JSON: store the log with needsReview=true, do not infer dose status from it. DTMF result still stands.

#### Scenario: Invalid JSON
- **WHEN** Claude returns invalid JSON
- **THEN** the log is stored with needsReview=true
- **AND** dose status is not inferred from it and the DTMF result still stands

### Requirement: Unit test coverage
The following tests SHALL exist: Unit tests for the state machine transitions, the transaction claim, quiet-hours logic, and webhook idempotency, using mocked Exotel, Google, and Claude clients.

#### Scenario: Unit tests
- **WHEN** the unit tests run
- **THEN** they cover the state machine transitions, the transaction claim, quiet-hours logic, and webhook idempotency, using mocked Exotel, Google, and Claude clients

### Requirement: Consent call type
A call of type "consent" SHALL be allowed while consent.status is "pending". It SHALL play only the consent script and SHALL write no health data. All other calls still require consent.status "granted".

#### Scenario: Consent call while pending
- **WHEN** consent.status is "pending" and a call of type "consent" is made
- **THEN** the call plays only the consent script
- **AND** no health data is written

#### Scenario: Other calls while pending
- **WHEN** consent.status is "pending" and any other call type would be made
- **THEN** the parent is not called
