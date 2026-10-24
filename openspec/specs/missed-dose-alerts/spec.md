# missed-dose-alerts Specification

## Purpose
Defines when the family is alerted that a dose went missed, the fixed alert wording, and how alerts are delivered. Migrated verbatim from the "Missed-dose alert" section of specs/03-call-flow.md.

## Requirements

### Requirement: Alert once per doseEvent
The following SHALL hold:
- Triggered once per doseEvent (alertSent flag).
- The alert document is created in the same transaction that sets `alertSent` on every member of the
  group, so a repeated scheduler run cannot create a second alert.

#### Scenario: Single alert
- **WHEN** a doseEvent goes missed
- **THEN** the alert is triggered once, tracked by the alertSent flag

#### Scenario: Duplicate checker run
- **WHEN** the missed-dose checker runs again for an event that already has `alertSent: true`
- **THEN** no second alert document is created and the original alert is unchanged

### Requirement: Alert text template
The following SHALL hold:
- Text template, no raw medical values: "Amma has not confirmed the 8:00 PM tablets. Last attempt at 8:20 PM. Please check."

#### Scenario: Alert text
- **WHEN** a missed-dose alert is created
- **THEN** its text is a template with no raw medical values: "Amma has not confirmed the 8:00 PM tablets. Last attempt at 8:20 PM. Please check."

### Requirement: Alert delivery
The following SHALL hold:
- Sent via FCM to all members; also written to alerts collection.
- The alerts document SHALL exist whether or not FCM has any registered token.

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

### Requirement: System-failure alert variant
When a dose event goes missed after the telephony provider failed to start a call, the alert SHALL
use distinct fixed text that says the call could not be completed. It SHALL still contain no
medicine names, doses or health values.

#### Scenario: Provider outage
- **WHEN** an event goes missed and its last dispatch attempt failed at the provider
- **THEN** the alert text is the system-failure template, not the standard template

### Requirement: Fixed-template alert builder
Alert text SHALL be produced by a fixed-template function. Only the parent's name and the local
clock times may be interpolated; medicine names, doses and readings SHALL NOT be included.

#### Scenario: Template content
- **WHEN** any missed-dose alert is built
- **THEN** its text comes from a fixed template and contains only the parent's name and local times
