# Spec Delta

## ADDED Requirements

### Requirement: doseEvents dispatch-failure flag
The collection `parents/{parentId}/doseEvents/{eventId}` SHALL also have this field:
- lastDispatchFailure: boolean (server-written; true when the most recent provider call attempt failed
  before the provider accepted the call, false otherwise).

Clients SHALL NOT write it.

#### Scenario: Provider failure recorded
- **WHEN** the dispatcher claims a group and the provider throws
- **THEN** the events return to pending with `lastDispatchFailure: true`, and `attempts` is preserved

#### Scenario: Successful claim clears the flag
- **WHEN** the dispatcher claims a group and the provider accepts the call
- **THEN** `lastDispatchFailure` is false

## MODIFIED Requirements

### Requirement: alerts document
The collection `parents/{parentId}/alerts/{alertId}` SHALL have these fields:
- type: "missed_dose" | "unclear_reply" | "no_answer" | "trend_flag" | "weekly_summary" | "urgent"
- message: string (template text; contains no raw health values beyond what the family needs)
- relatedEventId: string | null
- createdAt: timestamp
- readBy: uid[]

#### Scenario: Alert message content
- **WHEN** an alert is written
- **THEN** its message is template text that contains no raw health values beyond what the family needs
