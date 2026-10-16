# grouped-calls Specification

## Purpose
Defines how two or more medicines due at the same time for one parent are covered by a single call while each medicine keeps its own doseEvent. Migrated verbatim from the "Grouped calls" parts of specs/03-call-flow.md, including the grouped question from the call script and the grouped-call tests.

## Requirements

### Requirement: Group applicability
The following SHALL hold:
- Applies when more than one eligible doseEvent for a parent has the same `scheduledFor`. A single eligible event uses the normal one-medicine flow below.

(Where this text says "below", it refers to the one-medicine flow in `call-flow`.)

#### Scenario: Single eligible event
- **WHEN** only one eligible doseEvent exists for a parent at a `scheduledFor`
- **THEN** the normal one-medicine flow is used

#### Scenario: More than one eligible event
- **WHEN** more than one eligible doseEvent for a parent has the same `scheduledFor`
- **THEN** the grouped-call rules apply

### Requirement: One call per group
The following SHALL hold:
- One call covers the whole group. Group key: (parentId, scheduledFor). Each medicine keeps its own doseEvent.

#### Scenario: Group key
- **WHEN** eligible events share (parentId, scheduledFor)
- **THEN** one call covers the whole group and each medicine keeps its own doseEvent

### Requirement: All-or-nothing claim
The following SHALL hold:
- Group members are fixed at claim time, after the medicine re-check (inactive or edited medicines are left out). The dispatcher claims every member in one transaction, all or nothing. A failed claim skips the whole group.

#### Scenario: Failed claim
- **WHEN** a claim for one member of the group fails
- **THEN** the whole group is skipped

### Requirement: callSessions doseEventIds and shared attempts
The following SHALL hold:
- `callSessions.doseEventIds: string[]` replaces `doseEventId`. All members share attempts, retries and `lastCallSid`.

#### Scenario: Shared call state
- **WHEN** a grouped call is made
- **THEN** one callSession lists every member in `doseEventIds`
- **AND** all members share attempts, retries and `lastCallSid`

### Requirement: Press 1 answers the whole group
The following SHALL hold:
- Answers apply to every event in the call:
  - Press 1 ("yes, all of them"): every event becomes `taken`, resolvedBy "dtmf", `groupConfirmed: true`.

#### Scenario: Press 1
- **WHEN** the parent presses 1 on a grouped call
- **THEN** every event becomes `taken`, resolvedBy "dtmf", `groupConfirmed: true`

### Requirement: Press 2 answers the whole group
The following SHALL hold:
- Answers apply to every event in the call:
  - Press 2 ("did not take all of them"): every event becomes `not_taken` (not `missed`), `groupConfirmed: true`, and the usual single extra reminder after retryGapMinutes is scheduled for the whole group.

#### Scenario: Press 2
- **WHEN** the parent presses 2 on a grouped call
- **THEN** every event becomes `not_taken` (not `missed`) with `groupConfirmed: true`
- **AND** the usual single extra reminder after retryGapMinutes is scheduled for the whole group

### Requirement: Any other answer on a grouped call
The following SHALL hold:
- Answers apply to every event in the call:
  - Anything else: `unclear`, handled as in the state machine below.

(Where this text says "the state machine below", it refers to `dose-event-lifecycle`.)

#### Scenario: Other input
- **WHEN** the parent gives any answer other than 1 or 2 on a grouped call
- **THEN** every event becomes `unclear`, handled as in the state machine

### Requirement: No partial answers
The following SHALL hold:
- Partial answers are NOT supported in v1. A parent who took only some tablets must press 2. This is a documented limitation.

#### Scenario: Took only some tablets
- **WHEN** a parent took only some of the tablets in the group
- **THEN** the parent must press 2

### Requirement: groupConfirmed meaning
The following SHALL hold:
- `groupConfirmed` is true only when the answer came from a grouped call. It is false for single-medicine events and for family confirmations.

#### Scenario: groupConfirmed values
- **WHEN** an event is resolved by a single-medicine call or by a family confirmation
- **THEN** `groupConfirmed` is false
- **AND** it is true only when the answer came from a grouped call

### Requirement: Family confirmation affects one event
The following SHALL hold:
- A family member confirming one event in the app changes only that event. The other events in the group are unaffected.

#### Scenario: Family confirms one grouped event
- **WHEN** a family member confirms one event of a group in the app
- **THEN** only that event changes
- **AND** the other events in the group are unaffected

### Requirement: Group-wide no-answer and retries
The following SHALL hold:
- No-answer, busy, dropped call and retries act on the whole group together. The group goes `no_answer` -> `pending` as one.

#### Scenario: No answer on a group
- **WHEN** a grouped call gets no answer, is busy or drops
- **THEN** the whole group acts together and goes `no_answer` -> `pending` as one

### Requirement: One missed-dose alert per group
The following SHALL hold:
- Missed-dose alert: one alert per group, not one per medicine (all members' `alertSent` set in the same transaction). Wording variants are under "Missed-dose alert".

(Where this text says "Missed-dose alert", it refers to the capability `missed-dose-alerts`.)

#### Scenario: Group goes missed
- **WHEN** a group goes missed
- **THEN** one alert is sent for the group, not one per medicine
- **AND** all members' `alertSent` are set in the same transaction

### Requirement: Family app grouped row
The following SHALL hold:
- Family app: grouped events are shown as one row, "Morning tablets (2), confirmed together", with a note that medicines in the group were not checked individually. The label ("Morning tablets") is a fixed template per time of day, never AI-generated.

#### Scenario: Grouped row
- **WHEN** the family app shows grouped events
- **THEN** they are shown as one row, "Morning tablets (2), confirmed together", with a note that medicines in the group were not checked individually
- **AND** the label is a fixed template per time of day, never AI-generated

### Requirement: Grouped call question
The call script step 2 for a grouped call SHALL be:
- Grouped call: "Did you take ALL of your morning tablets? Press 1 for yes, all of them. Press 2 if you did not take all of them." (DTMF only. "ALL" is stressed. Voice replies are not accepted on grouped calls in v1, so a vague "yes" cannot confirm several medicines.)

#### Scenario: Grouped question
- **WHEN** a grouped call asks the question
- **THEN** it asks "Did you take ALL of your morning tablets? Press 1 for yes, all of them. Press 2 if you did not take all of them."
- **AND** it is DTMF only, "ALL" is stressed, and voice replies are not accepted in v1

### Requirement: Grouped question time-of-day word
The following SHALL hold:
- The time-of-day word follows the scheduled time (morning, afternoon, evening, night); the translated wording goes in the templates file for native-speaker review.

#### Scenario: Time-of-day word
- **WHEN** the grouped question is spoken for a scheduled time
- **THEN** the time-of-day word follows the scheduled time (morning, afternoon, evening, night)

### Requirement: Grouped-call tests
The following tests (2 medicines at the same time) SHALL exist, numbered as in the source ("Grouped-call tests").

#### Scenario: Grouped-call test 1
- **WHEN** the parent presses 1
- **THEN** both events are `taken`, resolvedBy "dtmf", `groupConfirmed` true, with one callSession holding both ids in `doseEventIds`, and no alert

#### Scenario: Grouped-call test 2
- **WHEN** the parent presses 2
- **THEN** both events are `not_taken` (not `missed`), `groupConfirmed` true, with one extra reminder scheduled for the group
- **AND** the "not all confirmed" alert wording is used if the group ends missed

#### Scenario: Grouped-call test 3
- **WHEN** there is no answer
- **THEN** both events return to `pending` together with attempts+1
- **AND** after max attempts both are `missed` and exactly one alert is sent

#### Scenario: Grouped-call test 4
- **WHEN** one member's claim fails
- **THEN** the claim is all-or-nothing and none are claimed

#### Scenario: Grouped-call test 5
- **WHEN** a duplicate webhook arrives for the same callSid
- **THEN** it creates no duplicate logs, alerts or transitions

#### Scenario: Grouped-call test 6
- **WHEN** a medicine is deactivated before dispatch
- **THEN** it is left out
- **AND** if one eligible event remains, the single-medicine script is used
