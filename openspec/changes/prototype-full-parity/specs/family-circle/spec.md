## ADDED Requirements

### Requirement: Caregiver circle
The Family tab SHALL list the members of the selected parent under "Caregiver circle" with their count. Each row SHALL show an initial avatar, the display name, a line "<relationship> · <city>" with " · Primary" appended for the owner (showing only the parts that are set), and a presence badge: "Viewing" when the member was seen within 2 minutes, "Seen <time>" for today, "Seen yesterday", or "Seen <date>" otherwise, and no badge when never seen. A member SHALL be able to edit their own relationship (up to 30 characters) and city (up to 40 characters).

#### Scenario: Row content
- **WHEN** Rahul is the owner with relationship "Son" and city "Bengaluru" and is viewing
- **THEN** his row reads "Son · Bengaluru · Primary" with the badge "Viewing"

#### Scenario: Own profile only
- **WHEN** a member edits a profile
- **THEN** only their own relationship and city can change

#### Scenario: Not seen
- **WHEN** a member has never opened Today
- **THEN** their row has no presence badge

### Requirement: Notification preferences
Each member SHALL have three preferences, stored on their member document as `notify`: `missed` (missed-dose push alerts, default on), `summary` (the evening summary at 20:00 parent time, default on) and `quiet` (quiet hours 22:00 to 06:00 in the parent's timezone, default off). A member SHALL change only their own preferences, through a callable function that validates the three booleans and writes nothing else. The Notifications card SHALL show the three toggles with the labels "Missed-dose alerts", "Evening summary" and "Quiet hours" and their short descriptions.

#### Scenario: Defaults
- **WHEN** a member has never saved preferences
- **THEN** missed and summary read as on and quiet reads as off

#### Scenario: Toggle
- **WHEN** a member turns off "Missed-dose alerts"
- **THEN** `notify.missed` is false on their own member document

#### Scenario: Other member
- **WHEN** a member calls the function for another member's uid
- **THEN** it has no effect on that member

#### Scenario: Invalid value
- **WHEN** a call contains a non-boolean value
- **THEN** it fails with invalid-argument and writes nothing

### Requirement: Call history
The Family tab SHALL show "Call history", newest first, limited to the last 10 entries, combining Ormma call attempts and family calls from a read-only callable function. Each Ormma entry SHALL show "Ormma, <time>" and "Answered · <duration>" or "Unanswered"; each family entry SHALL show "<name> called <parent>" and the day and time. The function SHALL return only the time, the outcome, the duration in seconds and the member uid for family calls, SHALL NOT return call SIDs, DTMF input or transcript references, SHALL check membership and consent visibility, and SHALL write nothing.

#### Scenario: Mixed history
- **WHEN** there are two Ormma calls and one family call
- **THEN** all three appear newest first with the wording above

#### Scenario: Fields returned
- **WHEN** the function returns an Ormma entry
- **THEN** it holds only a time, an outcome and a duration

#### Scenario: Non-member
- **WHEN** a user who is not a member calls the function
- **THEN** it fails with permission-denied
