## ADDED Requirements

### Requirement: New data in export and delete
The export callable SHALL include `familyCalls`, `emergencyContacts` and each member's `lastSeenAt`. The delete callable SHALL delete the `familyCalls` collection with the parent. Emergency contacts hold third-party phone numbers and SHALL NOT be copied anywhere else, SHALL NOT appear in logs and SHALL NOT be shown to users who are not members of the parent.

#### Scenario: Export
- **WHEN** an owner exports a parent
- **THEN** the JSON includes familyCalls and emergencyContacts

#### Scenario: Delete
- **WHEN** an owner deletes a parent
- **THEN** familyCalls are deleted with it and no contact numbers remain

### Requirement: Presence is minimal and visible
Presence SHALL be one timestamp per member, shown only to other members of the same parent. The privacy notice SHALL say that presence is shown. Logs for the presence, family-call and escalation functions SHALL hold ids and statuses only, never contact numbers, digest text or the time of a person's activity.

#### Scenario: Log content
- **WHEN** the presence, family-call or escalation function logs
- **THEN** the log line contains ids and a status only
