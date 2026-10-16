# missed-dose-alerts Specification

## Purpose
Defines when the family is alerted that a dose went missed, the fixed alert wording, and how alerts are delivered. Migrated verbatim from the "Missed-dose alert" section of specs/03-call-flow.md.

## Requirements

### Requirement: Alert once per doseEvent
The following SHALL hold:
- Triggered once per doseEvent (alertSent flag).

#### Scenario: Single alert
- **WHEN** a doseEvent goes missed
- **THEN** the alert is triggered once, tracked by the alertSent flag

### Requirement: Alert text template
The following SHALL hold:
- Text template, no raw medical values: "Amma has not confirmed the 8:00 PM tablets. Last attempt at 8:20 PM. Please check."

#### Scenario: Alert text
- **WHEN** a missed-dose alert is created
- **THEN** its text is a template with no raw medical values: "Amma has not confirmed the 8:00 PM tablets. Last attempt at 8:20 PM. Please check."

### Requirement: Alert delivery
The following SHALL hold:
- Sent via FCM to all members; also written to alerts collection.

#### Scenario: Delivery
- **WHEN** a missed-dose alert is sent
- **THEN** it is sent via FCM to all members
- **AND** it is also written to the alerts collection

### Requirement: Group variant when the parent pressed 2
The following SHALL hold:
- Variant for a group where the parent pressed 2 at any point: "Amma did not confirm all of the 8:00 PM tablets. Please follow up." Still no medicine names or values.

#### Scenario: Group pressed 2 then missed
- **WHEN** a group where the parent pressed 2 at any point goes missed
- **THEN** the alert text is "Amma did not confirm all of the 8:00 PM tablets. Please follow up." with no medicine names or values

### Requirement: Group variant with no answer
The following SHALL hold:
- Variant for a group that went missed with no answer from the parent: the standard text above.

#### Scenario: Group missed with no answer
- **WHEN** a group goes missed with no answer from the parent
- **THEN** the standard text above is used

### Requirement: No immediate alert on pressing 2
The following SHALL hold:
- There is no separate immediate alert when the parent presses 2; the "did not confirm all" wording is used only when the group goes missed.

#### Scenario: Parent presses 2
- **WHEN** the parent presses 2 on a grouped call
- **THEN** no separate immediate alert is sent
- **AND** the "did not confirm all" wording is used only when the group goes missed
