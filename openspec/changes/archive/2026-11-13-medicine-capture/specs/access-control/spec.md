# Spec Delta

## MODIFIED Requirements

### Requirement: Additional medicine display fields
In addition to the fields in "medicines document shape", a medicine written by an owner or editor MAY contain `frequencyText`, `pillDescription` and `purpose`, each a string of at most 1000 characters. The limit exists only to bound a document; it was 80, 80 and 40 characters before 2026-11-13.

#### Scenario: Valid
- **WHEN** an editor saves a medicine with pillDescription "Small round white tablet in silver strip"
- **THEN** the write is allowed

#### Scenario: Too long
- **WHEN** an editor saves a purpose of 1001 characters
- **THEN** the write is denied

#### Scenario: Viewer
- **WHEN** a viewer writes any of these fields
- **THEN** the write is denied

#### Scenario: Exactly at the limit
- **WHEN** an editor saves a frequencyText of exactly 1000 characters
- **THEN** the write is allowed

#### Scenario: Former limit
- **WHEN** an editor saves a purpose of 41 characters
- **THEN** the write is allowed
