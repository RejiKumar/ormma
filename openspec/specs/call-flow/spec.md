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

Idempotency SHALL be session-scoped: a gather callback SHALL be ignored once the session has a
non-null `dtmfInput`, and a status callback SHALL be ignored once the session is terminal
(`completed`, `failed` or `no_answer`). Ignored callbacks return 200 with an `ignored` code and
write nothing.

#### Scenario: Duplicate callback
- **WHEN** a duplicate callback arrives for the same callSid
- **THEN** no duplicate logs or alerts are created

#### Scenario: Duplicate DTMF
- **WHEN** a second gather callback arrives for a session that already has a dtmfInput
- **THEN** the session and its events are unchanged

#### Scenario: Late terminal callback
- **WHEN** a terminal status callback arrives for a session that is already terminal
- **THEN** the session and its events are unchanged

### Requirement: Webhook authenticity
The following SHALL hold:
- Validate webhook authenticity (shared secret or Exotel signature mechanism; confirm in Exotel docs).

Exotel does not document a callback signature, so the webhook SHALL require an unguessable shared
secret as a query parameter on both the status and gather URLs and compare it in constant time. A
missing or wrong token SHALL return 401 before any Firestore read or write. Other malformed input
SHALL return 400 with a code only.

#### Scenario: Webhook validation
- **WHEN** a webhook request arrives
- **THEN** its authenticity is validated by the shared secret token before any Firestore access

#### Scenario: Invalid token
- **WHEN** the token is missing or does not match the secret
- **THEN** the function responds 401 and writes nothing

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

### Requirement: Generation horizon and eligibility
The daily generation run SHALL create dose events for exactly the 24 hours starting at the run
instant, in each parent's timezone, and SHALL create them only for medicines with `active: true` and
`confirmedByHuman: true` whose local date falls within `startDate..endDate`. Event ids SHALL be
deterministic (`{medicineId}_{yyyyMMddHHmm}` in the parent's timezone) so that reruns and overlapping
horizons create no duplicates.

#### Scenario: Daily run creates the next 24 hours
- **WHEN** the generation run executes at 00:30 Asia/Kolkata
- **THEN** each active, human-confirmed medicine gets one pending event per local time on that date and the next date whose instant falls in the next 24 hours, with ids derived from the parent-local wall clock

#### Scenario: Rerun does not duplicate or overwrite
- **WHEN** the run executes again while some planned events already exist
- **THEN** existing events keep their id, status, attempts and resolution fields, and no duplicate documents are created

#### Scenario: Ineligible medicines produce no events
- **WHEN** a medicine is inactive or not human-confirmed, or its local date is before `startDate` or after `endDate`
- **THEN** the run creates no event for that medicine

### Requirement: Dispatcher eligibility and provider boundary
The minute dispatcher SHALL claim and start calls only for due pending events that pass all gates:
the parent is active and its consent status is granted; the event has fewer than `1 + retryCount`
attempts; at least 10 minutes have passed since `lastCallAt`; the medicine is still active and
human-confirmed and still lists the event's local `HH:mm`; and the parent is not inside quiet hours.
Quiet hours SHALL defer, not mutate: the event stays pending and the first non-quiet run may claim
it. Claiming SHALL be transactional and all-or-nothing per group. Telephony SHALL be reached only
through a `CallProvider` interface. The provider SHALL be Exotel when `CALL_PROVIDER=exotel` and the
log-only implementation otherwise (the default for local and emulator runs). Provider failures SHALL
return the claimed events to pending with attempts preserved and log error codes only.

#### Scenario: Due event inside quiet hours waits
- **WHEN** a pending event is due but the parent's local time is inside quiet hours
- **THEN** the event is neither claimed nor modified, and it is eligible again on the first run after quiet hours end

#### Scenario: Medicine was edited after generation
- **WHEN** an event is due but its medicine was deactivated, unconfirmed, or no longer lists that local time
- **THEN** the dispatcher skips that event without calling

#### Scenario: Attempt limit reached
- **WHEN** a pending event already has `attempts` equal to `1 + retryCount`
- **THEN** the dispatcher does not call it

#### Scenario: Claim is all-or-nothing
- **WHEN** two due events for the same parent and the same `scheduledFor` are claimed and one transaction read no longer sees one of them pending
- **THEN** neither event is claimed in that run

#### Scenario: Default provider does not dial
- **WHEN** the dispatcher runs without `CALL_PROVIDER=exotel`
- **THEN** it writes a fake callSid on the claimed events and logs only parent/event ids and statuses, with no real call placed

### Requirement: Exotel outbound call contract
The Exotel provider SHALL start a call by posting form-encoded values to
`/v1/Accounts/{account_sid}/Calls/connect` with Basic auth: `From` = the parent's E.164 number,
`CallerId` = the configured ExoPhone, `Url` = the configured call-flow URL, `CallType=trans`, a
`StatusCallback` pointing at `exotelWebhook?kind=status`, JSON terminal status events, and
`CustomField` = the parent id. Credentials and the flow URL SHALL come from Firebase secrets or
environment configuration, never source code, and logs SHALL contain ids and error codes only.

#### Scenario: Accepted call
- **WHEN** the dispatcher hands a group to the Exotel provider and Exotel accepts the request
- **THEN** the provider returns the `Call.Sid` from the response as the callSid

#### Scenario: Rejected call
- **WHEN** Exotel responds with a non-2xx status or a payload without `Call.Sid`
- **THEN** the provider throws a coded error, the dispatcher returns the group to pending, and only the code is logged

#### Scenario: Provider selection
- **WHEN** `CALL_PROVIDER=exotel`
- **THEN** the dispatcher uses Exotel and fails fast with a code-only configuration error if any required secret is missing
- **AND** with any other value the logging provider is used and nothing dials

### Requirement: DTMF answer mapping and revocation
The gather webhook SHALL trim surrounding quotes from `digits` and apply the first non-empty digit
to every member of the session: 1 resolves them as taken by DTMF with `groupConfirmed` true only for
grouped calls; 2 resolves them as not_taken with `groupConfirmed` and the one extra reminder after
`retryGapMinutes`; 9 revokes the parent's consent and stops calls; any other non-empty input marks
them unclear. Empty input SHALL change nothing.

#### Scenario: Press 1 on a grouped call
- **WHEN** the parent presses 1 on a grouped call
- **THEN** every member becomes taken with resolvedBy dtmf and groupConfirmed true

#### Scenario: Press 2 on a single call
- **WHEN** the parent presses 2 on a single-medicine call
- **THEN** the event becomes not_taken with groupConfirmed false and its reminder scheduled once

#### Scenario: Press 9
- **WHEN** the parent presses 9 during any call
- **THEN** the parent's consent becomes revoked, revoking stops further calls, and the current members leave the calling state

#### Scenario: Unrecognised key
- **WHEN** the parent presses any other key
- **THEN** the members become unclear and follow the retry path

### Requirement: callSessions created at call start
The dispatcher SHALL create exactly one `parents/{parentId}/callSessions/{callSid}` document after
the provider accepts a call, with the group's `doseEventIds`, status `initiated`, a null
`dtmfInput`, and `startedAt` set; every member SHALL receive the same `lastCallSid`.

#### Scenario: Session after acceptance
- **WHEN** the provider returns a callSid
- **THEN** the session exists with that id and lists every claimed event id
