# Spec Delta

## ADDED Requirements

### Requirement: Calls-not-active note
While the call status says calling is off, the Today tab SHALL show one calm note, "Check-in calls will start soon.", in the neutral style (no coral, no warning wording, no count). It SHALL NOT be shown when calling is on or when the status could not be read.

#### Scenario: Calling off
- **WHEN** the status says calling is off
- **THEN** Today shows the note

#### Scenario: Calling on or unknown
- **WHEN** the status says calling is on, or could not be read
- **THEN** no note is shown
