# Spec Delta

## ADDED Requirements

### Requirement: Alerts only while calling is on
A missed-dose alert SHALL be raised only while calling is on and only for a dose event scheduled at or after the go-live cutoff, when one is set. A dose that was never eligible for a call because calling was off SHALL NOT be marked missed or alerted.

#### Scenario: Calling off
- **WHEN** a pending dose passes its policy window while calling is off
- **THEN** no alert is raised and the dose is not marked missed

#### Scenario: Before the cutoff
- **WHEN** calling is on and a pending dose is scheduled before the go-live cutoff
- **THEN** no alert is raised for it

#### Scenario: Normal operation
- **WHEN** calling is on, the dose is after the cutoff and the policy window passes
- **THEN** the alert is raised once, as before
