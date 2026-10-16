# Spec Delta

## ADDED Requirements

### Requirement: doseEvents client updates and terminal states
A client update to a doseEvent SHALL NOT change an event whose status is `taken`, and SHALL change an event whose status is `missed` only to `taken`.

#### Scenario: taken is terminal for clients
- **WHEN** an owner or editor tries to change a `taken` doseEvent to `not_taken`
- **THEN** the update is denied

#### Scenario: missed only to taken
- **WHEN** an owner or editor tries to change a `missed` doseEvent to `not_taken`
- **THEN** the update is denied
- **AND** changing it to `taken` (family override) is allowed

#### Scenario: non-terminal events
- **WHEN** an owner or editor sets a `pending` doseEvent to `taken` or `not_taken` with resolvedBy "family" and `resolvedByUid` equal to their own uid
- **THEN** the update is allowed

### Requirement: healthLogs client create shape
A healthLog created by a client SHALL contain only the fields of the data model, with type one of "bp", "sugar", "symptom", "note", source "family", needsReview a boolean, no transcript reference, and `createdAt` equal to the request time.

#### Scenario: Backdated createdAt
- **WHEN** an owner or editor creates a healthLog whose `createdAt` is not the request time
- **THEN** the create is denied

#### Scenario: Extra field
- **WHEN** a client creates a healthLog with a field that is not in the data model
- **THEN** the create is denied

#### Scenario: Log edits
- **WHEN** a client tries to update a healthLog
- **THEN** the update is denied

### Requirement: prescriptions client create and update
A prescription created by a client SHALL have status "pending_review", and a client update to a prescription SHALL change only `status`, to one of "pending_review", "confirmed", "rejected", and only by an owner or editor.

#### Scenario: Create already confirmed
- **WHEN** an owner or editor creates a prescription with status "confirmed"
- **THEN** the create is denied

#### Scenario: Other fields
- **WHEN** an owner or editor tries to change a prescription field other than `status`
- **THEN** the update is denied

#### Scenario: Viewer update
- **WHEN** a viewer tries to change a prescription status
- **THEN** the update is denied

### Requirement: parents client update fields
An owner update to a parent SHALL change only name, phone, language, timezone, active and callPolicy. The phone SHALL be in E.164 format and the language SHALL be one of "ml-IN", "ta-IN", "hi-IN", "en-IN".

#### Scenario: Provenance fields
- **WHEN** an owner tries to change `createdBy` or `createdAt` of a parent
- **THEN** the update is denied

#### Scenario: Phone format
- **WHEN** an owner changes the phone of a parent to a value that is not in E.164 format
- **THEN** the update is denied

### Requirement: medicines document shape
A medicine written by a client SHALL contain only the fields of the data model with valid types and enum values, `createdBy` SHALL equal the creating uid, and `createdBy` and `createdAt` SHALL never change.

#### Scenario: Invalid source
- **WHEN** an owner or editor writes a medicine whose source is not "manual" or "prescription_scan"
- **THEN** the write is denied

#### Scenario: createdBy
- **WHEN** an owner or editor creates a medicine whose `createdBy` is another uid
- **THEN** the create is denied

### Requirement: users document shape
A users document written by its owner SHALL contain only the fields of the data model, and its phone SHALL be in E.164 format.

#### Scenario: Phone format
- **WHEN** a user writes their users document with a phone that is not in E.164 format
- **THEN** the write is denied

### Requirement: Client deletes denied
A client SHALL NOT delete a parent, medicine, doseEvent, healthLog, prescription or alert document. Deleting a parent is done by the owner through a callable Cloud Function with recursive delete.

#### Scenario: Client delete
- **WHEN** an owner tries to delete a parent, medicine, doseEvent, healthLog, prescription or alert document
- **THEN** the delete is denied

### Requirement: Rules coverage beyond the numbered tests
The Firebase emulator test suite SHALL also cover every path rule of this capability and the Storage rules, including list queries for the consent visibility rule.

#### Scenario: Path rule coverage
- **WHEN** the emulator test suite runs
- **THEN** each path rule and Storage rule has at least one test that passes
