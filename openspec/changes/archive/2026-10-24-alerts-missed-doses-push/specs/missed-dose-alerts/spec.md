# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Alert delivery
The following SHALL hold:
- Sent via FCM to all members; also written to alerts collection.
- The alerts document SHALL exist whether or not FCM has any registered token.

#### Scenario: Delivery
- **WHEN** a missed-dose alert is sent
- **THEN** it is sent via FCM to all members
- **AND** it is also written to the alerts collection
