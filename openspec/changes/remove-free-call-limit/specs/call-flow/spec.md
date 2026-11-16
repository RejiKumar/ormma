# Spec Delta

## REMOVED Requirements

### Requirement: Free-tier daily call limit
**Reason**: Requested by the user on 2026-11-16: every record must be called on every plan. The rule that flagged later dose times `callSkipped: "plan"` for Free parents is removed. The paused-parent rule it also contained continues in the requirement added below.
**Migration**: Events flagged under the old rule that are still pending have the flag cleared when the dispatcher plans their call.

## ADDED Requirements

### Requirement: No call-time limit, and paused parents
`dispatchDueCalls` SHALL place check-in calls for every eligible dose time of a parent on every plan. The only plan rule applied to calls SHALL be that parents above the owner's free parent limit (the owner's oldest parent is kept) are paused: every event of a paused parent SHALL be flagged `callSkipped: "plan"` and no call placed, unless the owner has an active entitlement or is inside the 7-day grace period. When the dispatcher plans a call for an event that still carries a `callSkipped: "plan"` flag, it SHALL clear the flag as part of claiming the event. The check SHALL run on the server before a call is claimed, and SHALL be idempotent across duplicate scheduler runs.

#### Scenario: Five dose times on the free plan
- **WHEN** a free parent has five dose times on one day
- **THEN** all five are called, and none is flagged `callSkipped`

#### Scenario: Paused parent
- **WHEN** an owner on the free plan has two parents
- **THEN** every event of the newer parent is flagged `callSkipped` "plan" and no call is placed for it, and the older parent is called for every dose time

#### Scenario: Stale flag cleared
- **WHEN** a pending event carries `callSkipped` "plan" from the old rule and its parent is not paused
- **THEN** it is called, and the flag is cleared when it is claimed

#### Scenario: Duplicate runs
- **WHEN** the scheduler runs twice in the same minute
- **THEN** each event is flagged or called once
