## ADDED Requirements

### Requirement: Dispatch timing
A call for a dose event SHALL start no earlier than its scheduled time, and under normal operation no later than 60 seconds after it, because `dispatchDueCalls` runs every minute and picks up every pending event whose `scheduledFor` is at or before now. The time between `scheduledFor` and the call session's start SHALL be recorded so it can be measured (`callSessions.startedAt`), and SHALL NOT be written to logs together with any health data.

#### Scenario: Not early
- **WHEN** the dispatcher runs 1 second before an event's scheduled time
- **THEN** it does not start that call

#### Scenario: Within a minute
- **WHEN** the dispatcher runs 59 seconds after an event's scheduled time and the event is otherwise eligible
- **THEN** it starts that call

#### Scenario: Pilot measure
- **WHEN** a pilot day has completed
- **THEN** the 95th percentile of `startedAt` minus `scheduledFor` is at most 60 seconds
