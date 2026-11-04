## ADDED Requirements

### Requirement: Delivery respects member preferences
The alert document for a missed dose SHALL still be created once per event or group for the whole family, exactly as before. Only the push delivery SHALL be filtered: a member with `notify.missed` false SHALL receive no push for a `missed_dose`, `no_answer` or `unclear_reply` alert, and a member with `notify.quiet` true SHALL receive no push for those alerts between 22:00 and 06:00 in the parent's timezone. The alert remains visible in the app for every member.

#### Scenario: Opted out of missed-dose pushes
- **WHEN** a missed-dose alert is created and a member has `notify.missed` false
- **THEN** the alert document exists and is visible to that member
- **AND** no push is sent to them

#### Scenario: Quiet hours
- **WHEN** a missed-dose alert is created at 23:30 parent time and a member has quiet hours on
- **THEN** no push is sent to that member

#### Scenario: Idempotent
- **WHEN** the checker runs again for an event that already has an alert
- **THEN** no second alert document and no second push are created

### Requirement: Urgent alerts bypass preferences
An `urgent` alert SHALL be pushed to every member regardless of `notify` and quiet hours.

#### Scenario: Urgent during quiet hours
- **WHEN** an urgent alert is created while a member has quiet hours on
- **THEN** the member receives the push
