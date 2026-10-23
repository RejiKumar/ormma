# Spec Delta

## ADDED Requirements

### Requirement: callSessions identity
The document id of `parents/{parentId}/callSessions/{sessionId}` SHALL be the Exotel `CallSid`, and
the document SHALL list every dose event covered by that call in `doseEventIds`. Callbacks carry
`CustomField` = parent id, so a callback addresses the session directly without a collection-group
query or an index change.

#### Scenario: Callback routing
- **WHEN** Exotel posts a status or gather callback with CallSid and CustomField parent id
- **THEN** the session is read at `parents/{parentId}/callSessions/{CallSid}`

#### Scenario: Grouped call session
- **WHEN** one call covers several dose events
- **THEN** its session lists all of them in `doseEventIds` and each event stores the same `lastCallSid`
