## ADDED Requirements

### Requirement: parents emergencyContacts field
The document `parents/{parentId}` SHALL allow an optional `emergencyContacts`: an array of at most 3 objects `{ label: string, kind: "neighbour" | "clinic", phone: string }` where phone is in E.164 format. A missing field is the same as an empty list.

#### Scenario: Default
- **WHEN** a parent is created
- **THEN** emergencyContacts is absent or an empty list

### Requirement: members lastSeenAt field
A members document SHALL allow an optional `lastSeenAt: timestamp`, written only by the presence function. It SHALL be absent until the member first opens Today.

#### Scenario: First open
- **WHEN** a member opens Today for the first time
- **THEN** lastSeenAt is set

### Requirement: familyCalls document
The collection `parents/{parentId}/familyCalls/{id}` SHALL have these fields: `byUid: string`, `at: timestamp` (server time). The id SHALL be deterministic from the member uid and the minute of `at`, so a repeated call within one minute updates the same document. (Server-write only.)

#### Scenario: Same minute
- **WHEN** the same member logs a call twice within one minute
- **THEN** one document exists
