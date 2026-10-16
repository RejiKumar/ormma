# Spec Delta

## MODIFIED Requirements

### Requirement: Initial consent state
The following SHALL hold:
- A parent record starts with consent.status = "pending". No calls or health logging until "granted", except the consent call (call type "consent"), which plays only the consent script and writes no health data.

#### Scenario: New parent
- **WHEN** a parent record is created
- **THEN** consent.status is "pending"
- **AND** no calls or health logging happen until it is "granted", except the consent call (call type "consent"), which plays only the consent script and writes no health data

