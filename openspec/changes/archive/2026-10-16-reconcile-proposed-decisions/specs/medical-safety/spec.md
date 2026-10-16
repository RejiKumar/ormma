# Spec Delta

## MODIFIED Requirements

### Requirement: Emergency prompt in the family app
The family app SHALL show a prompt to call local emergency services.

#### Scenario: Emergency prompt
- **WHEN** an urgent alert is shown in the family app
- **THEN** the app shows a prompt to call local emergency services

### Requirement: Review before launch
The following SHALL hold:
- A doctor or pharmacist reads: call scripts, alert templates, trend wording, disclaimer, urgent-keyword list.
- This review is a launch gate: the app SHALL NOT be released to real users until each item has been reviewed and the review is recorded in `docs/DECISIONS.md` with the reviewer's role and the date.

#### Scenario: Launch gate
- **WHEN** any of the call scripts, alert templates, trend wording, disclaimer or urgent-keyword list has not been reviewed and recorded
- **THEN** the app is not released to real users

#### Scenario: Pre-launch review
- **WHEN** the app is prepared for launch
- **THEN** a doctor or pharmacist reads the call scripts, alert templates, trend wording, disclaimer and urgent-keyword list

