## ADDED Requirements

### Requirement: Free-tier daily call limit
`dispatchDueCalls` SHALL place check-in calls for a parent on the free plan only for the first two distinct dose times of that parent's local day; for later dose times the event SHALL be flagged `callSkipped: "plan"` and no call SHALL be placed. Parents of an owner with an active entitlement or inside the 7-day grace period have no such limit. Parents above the owner's free parent limit (the owner's oldest parent is kept) SHALL have every event flagged and no calls. Retries of a call already started are not counted again. The check SHALL run on the server before a call is claimed, and SHALL be idempotent across duplicate scheduler runs.

#### Scenario: Third dose time on the free plan
- **WHEN** a free parent has doses at 08:00, 13:00 and 21:00 on one day
- **THEN** calls are placed for 08:00 and 13:00 and the 21:00 event is flagged `callSkipped` "plan"

#### Scenario: Paid owner
- **WHEN** the owner has an active entitlement
- **THEN** all eligible dose times are called as before

#### Scenario: Grace
- **WHEN** the entitlement ended 3 days ago
- **THEN** all eligible dose times are still called

#### Scenario: Retries
- **WHEN** a call for the 08:00 dose is retried
- **THEN** the retry does not count as another dose time

#### Scenario: Duplicate runs
- **WHEN** the scheduler runs twice in the same minute
- **THEN** each event is flagged or called once
