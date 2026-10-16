# dose-event-lifecycle Specification

## Purpose
Defines the states a doseEvent moves through, which states are terminal, and how a family member may override a missed dose. Migrated verbatim from the state machine and family override sections of specs/03-call-flow.md.

## Requirements

### Requirement: Call-path state transitions
The following state machine for a doseEvent SHALL hold:
- pending -> calling -> taken
- pending -> calling -> not_taken (parent says not yet; schedule one extra reminder after retryGapMinutes)
- calling -> no_answer -> pending (retry, attempts+1) ... -> missed
- calling -> unclear (reply not understood after DTMF fallback) -> pending (retry) ... -> missed

#### Scenario: Parent confirms
- **WHEN** a pending event is called and the parent confirms
- **THEN** the event goes pending -> calling -> taken

#### Scenario: Parent says not yet
- **WHEN** the parent says not yet
- **THEN** the event goes pending -> calling -> not_taken
- **AND** one extra reminder is scheduled after retryGapMinutes

#### Scenario: No answer
- **WHEN** a call ends no_answer
- **THEN** the event returns to pending with attempts+1, and so on until missed

#### Scenario: Unclear reply
- **WHEN** the reply is not understood after DTMF fallback
- **THEN** the event goes unclear, then pending (retry), and so on until missed

### Requirement: Family transitions
The following state machine for a doseEvent SHALL also hold:
- any non-terminal -> taken (family manually confirms in app)
- missed -> taken (family override only, see below)

(Where this text says "see below", it refers to the requirements on the family override of a missed dose.)

#### Scenario: Family confirms a non-terminal event
- **WHEN** a family member manually confirms an event in a non-terminal state in the app
- **THEN** the event becomes taken

### Requirement: Terminal states
The following SHALL hold: Terminal states: taken, missed. "not_taken" after max retries becomes "missed". The server never moves an event out of `missed`; no call, retry or webhook can change it.

#### Scenario: not_taken after max retries
- **WHEN** an event is not_taken and max retries are reached
- **THEN** the event becomes "missed"

#### Scenario: Server never leaves missed
- **WHEN** a call, retry or webhook arrives for an event that is `missed`
- **THEN** the event stays `missed`

### Requirement: Family override of a missed dose
The following SHALL hold:
- An owner or editor may change a `missed` event to `taken` in the app (resolvedBy "family"). Viewers cannot. `resolvedAt` is set to the override time and `resolvedByUid` to the member who did it.

#### Scenario: Owner or editor override
- **WHEN** an owner or editor changes a `missed` event to `taken` in the app
- **THEN** resolvedBy is "family", `resolvedAt` is the override time and `resolvedByUid` is the member who did it

#### Scenario: Viewer cannot override
- **WHEN** a viewer tries the override
- **THEN** it is not allowed

### Requirement: Override keeps missedAt
The following SHALL hold:
- `missedAt` is set when the event goes missed and is never cleared or changed, so the history shows it was missed and later confirmed by family.

#### Scenario: History after override
- **WHEN** a missed event is overridden to taken
- **THEN** `missedAt` is unchanged, so the history shows it was missed and later confirmed by family

### Requirement: Override and the missed-dose alert
The following SHALL hold:
- The original missed-dose alert is neither retracted nor re-sent. The override never triggers a new alert.

#### Scenario: Alert after override
- **WHEN** a missed event is overridden to taken
- **THEN** the original missed-dose alert is neither retracted nor re-sent
- **AND** no new alert is triggered

### Requirement: Override within a group
The following SHALL hold:
- In a group, the override applies to the one event the member confirmed (see "Grouped calls").

(Where this text says "Grouped calls", it refers to the capability `grouped-calls`.)

#### Scenario: Override of one grouped event
- **WHEN** a member overrides one event of a group
- **THEN** the override applies to the one event the member confirmed

### Requirement: Override changes nothing else
The following SHALL hold:
- An override changes nothing else: `attempts`, `alertSent` and `lastCallSid` stay as they were.

#### Scenario: Other fields after override
- **WHEN** a missed event is overridden to taken
- **THEN** `attempts`, `alertSent` and `lastCallSid` stay as they were

### Requirement: Family override tests
The following tests SHALL exist, numbered as in the source ("Family override tests").

#### Scenario: Family override test 1
- **WHEN** a family override is applied
- **THEN** a family override changes `missed` to `taken` with resolvedBy "family", sets `resolvedAt`, and keeps `missedAt` unchanged

#### Scenario: Family override test 2
- **WHEN** a family override is applied
- **THEN** the override sends no alert and does not reset `alertSent`

#### Scenario: Family override test 3
- **WHEN** a late webhook, retry or dispatcher run arrives for a `missed` event
- **THEN** it cannot move the event out of `missed`

#### Scenario: Family override test 4
- **WHEN** a viewer tries to perform the override
- **THEN** a viewer cannot perform the override (the rule is tested in the emulator, spec 02 test 11; the app also hides the control)

(Where this text says "spec 02 test 11", it refers to Rules test 11 of the capability `access-control`.)
