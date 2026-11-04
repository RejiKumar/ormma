## ADDED Requirements

### Requirement: Member last seen
Each member SHALL have a `lastSeenAt` timestamp that records the last time that member opened the Today screen. It SHALL be written only by a callable function that is rate-limited to one write per member per 5 minutes, SHALL hold a time and nothing else about the member's activity, and SHALL NOT record location, device or screen contents.

#### Scenario: Throttled update
- **WHEN** a member opens Today twice within 5 minutes
- **THEN** `lastSeenAt` is written once

#### Scenario: Client cannot write it
- **WHEN** a client writes `lastSeenAt` directly
- **THEN** the write is denied

#### Scenario: Non-member
- **WHEN** a user who is not a member calls the presence function
- **THEN** it fails with permission-denied and writes nothing

### Requirement: Presence bar
The Today screen SHALL show, per parent, the family members as initials avatars and one line of text. A member whose `lastSeenAt` is within the last 2 minutes SHALL be described as viewing ("Rahul is viewing"). When nobody else is viewing, the line SHALL name the most recently active other member with a relative time. The line SHALL also show the time of the latest family call when one exists, in the parent's timezone.

#### Scenario: Another member is viewing
- **WHEN** another member's `lastSeenAt` is 40 seconds old
- **THEN** the bar says that member is viewing

#### Scenario: Nobody else active
- **WHEN** no other member was seen in the last 2 minutes
- **THEN** the bar names the most recently active other member with a relative time such as "seen 3 h ago"

#### Scenario: Consent not granted
- **WHEN** the parent's consent is not granted
- **THEN** the presence bar is not shown

### Requirement: Family call log
A member SHALL be able to log that they called the parent, using "I called Amma". The entry SHALL be created by a callable function as `parents/{parentId}/familyCalls/{id}` with the member uid and a server timestamp, and SHALL be idempotent: the same member logging twice within one minute creates one entry.

#### Scenario: Member logs a call
- **WHEN** a member taps "I called Amma"
- **THEN** one familyCalls entry is created with that member's uid and the time

#### Scenario: Double tap
- **WHEN** the same member taps twice within one minute
- **THEN** only one entry exists

#### Scenario: Viewer role
- **WHEN** a member with the viewer role taps "I called Amma"
- **THEN** it works, because it records a fact and changes no dose or medicine

#### Scenario: Logged call does not change doses
- **WHEN** a family call is logged
- **THEN** no dose event status, alert or call policy changes
