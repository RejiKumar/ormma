# Spec Delta

## ADDED Requirements

### Requirement: Pure transition function
All dose-event transitions SHALL be produced by one pure function that takes the current event state
and a transition event (call started, answered yes/not yet, no answer, unclear, reminder due, missed
check, family confirm, family override) and returns the next state plus effects, or no change for an
invalid transition. `taken` SHALL be terminal except for the family override path, and `missed` SHALL
be terminal except for the family override. The family override SHALL keep `missedAt`, `attempts`,
`alertSent` and `lastCallSid` unchanged. A `not_taken` event SHALL schedule at most one extra
reminder, at `reminderAt = at + retryGapMinutes`.

#### Scenario: Answer yes resolves through the call path
- **WHEN** a calling event receives the answer-yes transition by DTMF or voice
- **THEN** the next state is taken with `resolvedBy` dtmf or voice, `resolvedAt` set, and `groupConfirmed` true only for grouped calls

#### Scenario: Invalid transition changes nothing
- **WHEN** a transition is applied that is not allowed from the current status
- **THEN** the function returns no change and the stored event is untouched

#### Scenario: Missed marking is time based
- **WHEN** the missed check runs at or after `scheduledFor + missedAfterMinutes` for an event that is pending, no_answer, unclear or not_taken
- **THEN** the next state is missed with `missedAt` set and an alert effect produced only if `alertSent` is false

#### Scenario: Family override after missed
- **WHEN** a family member overrides a missed event
- **THEN** the event becomes taken with `resolvedBy: family`, while `missedAt`, `attempts`, `alertSent` and `lastCallSid` keep their values

#### Scenario: One extra reminder only
- **WHEN** the same event becomes not_taken a second time
- **THEN** no second reminder time is scheduled
