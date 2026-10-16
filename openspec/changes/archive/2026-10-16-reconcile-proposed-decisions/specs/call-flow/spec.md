# Spec Delta

## MODIFIED Requirements

### Requirement: Consent and active gate
The following SHALL hold:
- Never call a parent whose consent.status is not "granted" (except a call of type "consent" while consent.status is "pending"; see "Consent call type"), or whose `active` is false.

#### Scenario: Parent not eligible
- **WHEN** a parent's consent.status is not "granted" or `active` is false
- **THEN** the parent is not called, except that a call of type "consent" is allowed while consent.status is "pending" and `active` is true

## ADDED Requirements

### Requirement: Consent call type
A call of type "consent" SHALL be allowed while consent.status is "pending". It SHALL play only the consent script and SHALL write no health data. All other calls still require consent.status "granted".

#### Scenario: Consent call while pending
- **WHEN** consent.status is "pending" and a call of type "consent" is made
- **THEN** the call plays only the consent script
- **AND** no health data is written

#### Scenario: Other calls while pending
- **WHEN** consent.status is "pending" and any other call type would be made
- **THEN** the parent is not called

