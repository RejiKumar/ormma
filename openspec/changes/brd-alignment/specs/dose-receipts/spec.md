## MODIFIED Requirements

### Requirement: Status badge wording
Each card SHALL show one badge. A card whose events are all `taken` SHALL read "Taken on time" followed by the time taken when it was taken within 30 minutes before or after the scheduled time, otherwise "Taken" followed by the time taken. A card with any `missed`, `no_answer` or `not_taken` event SHALL read "Not confirmed". A card with `calling` SHALL read "Calling now", with `unclear` SHALL read "Unclear", and otherwise "Scheduled for" followed by the scheduled time. Times SHALL use the parent's timezone.

#### Scenario: On time
- **WHEN** a dose scheduled at 08:30 was resolved as taken at 08:34
- **THEN** the badge reads "Taken on time · 8:34 AM"

#### Scenario: Late
- **WHEN** a dose scheduled at 13:30 was resolved as taken at 14:20
- **THEN** the badge reads "Taken · 2:20 PM"

#### Scenario: Missed
- **WHEN** a dose is `missed`
- **THEN** the badge reads "Not confirmed"

#### Scenario: Scheduled
- **WHEN** a dose scheduled at 21:00 has not happened yet
- **THEN** the badge reads "Scheduled for 9:00 PM"
