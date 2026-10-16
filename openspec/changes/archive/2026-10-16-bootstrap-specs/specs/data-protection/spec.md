# Spec Delta

## Purpose

Defines data minimisation, the export and delete rights, transparency to family members, and breach readiness (India DPDP Act oriented). Migrated verbatim from the Data minimisation, Rights, Transparency and Breach readiness sections of specs/05-consent-dpdp.md.

## ADDED Requirements

### Requirement: No raw audio
The following SHALL hold:
- Do not store raw audio. Process in memory only.

#### Scenario: Audio handling
- **WHEN** a call recording is processed
- **THEN** raw audio is not stored and is processed in memory only

### Requirement: Transcript storage
The following SHALL hold:
- Transcripts: store only when needed for review, in Storage with a 30-day lifecycle.

(See also `data-model` Retention for the same topic.)

#### Scenario: Transcript for review
- **WHEN** a transcript is needed for review
- **THEN** it is stored in Storage with a 30-day lifecycle
- **AND** it is stored only when needed for review

### Requirement: Claude prompt content
The following SHALL hold:
- Send Claude only the text it needs. No names, phone numbers, or addresses in prompts; use "the parent".

#### Scenario: Prompt text
- **WHEN** a prompt is sent to Claude
- **THEN** it contains only the text Claude needs
- **AND** it has no names, phone numbers, or addresses and uses "the parent"

### Requirement: No health data in logs
The following SHALL hold:
- Do not log health values or transcripts in Cloud Logging.

#### Scenario: Logging
- **WHEN** a function writes to Cloud Logging
- **THEN** health values and transcripts are not logged

### Requirement: Export right
The following SHALL hold:
- Export: callable function returns a parent's data as JSON for owners.

#### Scenario: Export
- **WHEN** an owner calls the export function
- **THEN** it returns the parent's data as JSON

### Requirement: Delete right
The following SHALL hold:
- Delete: callable function recursively deletes the parent and storage files, and writes an auditLog entry that keeps no health data.

(See also `data-model` Retention for the same topic.)

#### Scenario: Delete
- **WHEN** the delete function is called
- **THEN** it recursively deletes the parent and storage files
- **AND** it writes an auditLog entry that keeps no health data

### Requirement: Privacy notice
The following SHALL hold:
- Privacy notice in the app and a short spoken version available on a call.

#### Scenario: Privacy notice
- **WHEN** privacy information is provided
- **THEN** there is a privacy notice in the app and a short spoken version available on a call

### Requirement: Access visibility to family
The following SHALL hold:
- Family members see who else has access.

#### Scenario: Who has access
- **WHEN** access is shown
- **THEN** family members see who else has access

### Requirement: Incident runbook
The following SHALL hold:
- Maintain a short incident runbook in `docs/INCIDENT.md`.

#### Scenario: Runbook
- **WHEN** the incident runbook is maintained
- **THEN** it is a short incident runbook in `docs/INCIDENT.md`
