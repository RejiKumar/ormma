# prescription-reading Specification

## Purpose
Defines the contract for reading a prescription photo with Sonnet: input, transcription rules, output schema and what happens to the result. Migrated verbatim from section 2 of specs/06-ai-contracts.md.

## Requirements

### Requirement: Prescription reading model
The following SHALL hold: Prescription reading (Sonnet 5.5, image input).

#### Scenario: Model
- **WHEN** a prescription photo is read
- **THEN** Sonnet 5.5 is used with image input

### Requirement: Prescription reading input
The following SHALL hold:
- Input: prescription photo.

#### Scenario: Input
- **WHEN** prescription reading is called
- **THEN** its input is a prescription photo

### Requirement: Prescription reading rules
The following SHALL hold:
- Transcribe medicine names exactly as written. Do not correct or substitute.
- doseText is copied text. Do not normalise or infer.
- If handwriting is unclear, put the best guess with confidence below 0.5 and add "illegible": true.
- Return JSON only.

#### Scenario: Names as written
- **WHEN** a medicine name is transcribed
- **THEN** it is exactly as written, not corrected or substituted

#### Scenario: Unclear handwriting
- **WHEN** handwriting is unclear
- **THEN** the best guess is given with confidence below 0.5 and "illegible": true

### Requirement: Prescription reading output schema
The output schema SHALL be:

```
{
  "doctor": string | null,
  "date": string | null,
  "medicines": [ { "name": string, "doseText": string | null, "frequencyText": string | null, "times": string[] | null, "confidence": number, "illegible": boolean } ],
  "overallConfidence": number
}
```

#### Scenario: Output shape
- **WHEN** the model returns a response
- **THEN** it is JSON only and matches the schema above

### Requirement: Prescription reading result handling
The following SHALL hold:
- Handling: result is saved with status "pending_review". Nothing is scheduled until a human confirms each medicine.

#### Scenario: Saved result
- **WHEN** a prescription reading result is saved
- **THEN** its status is "pending_review"
- **AND** nothing is scheduled until a human confirms each medicine

### Requirement: Scan and confirm fail with typed codes
The scan and confirm callables SHALL refuse a bad call with one of `unauthenticated` (no signed-in user), `permission-denied` (not an owner or editor of that parent), `invalid-argument` (a missing or malformed value) or `failed-precondition` (the prescription is not in a state that allows the call), and SHALL NOT surface a plain internal error for these cases.

#### Scenario: Signed out
- **WHEN** a caller who is not signed in calls scan
- **THEN** the call fails with `unauthenticated`

#### Scenario: Viewer
- **WHEN** a viewer calls scan or confirm
- **THEN** the call fails with `permission-denied`

#### Scenario: Malformed
- **WHEN** a required value is missing or the wrong type
- **THEN** the call fails with `invalid-argument`

### Requirement: Scan reads only that parent's image
The scan callable SHALL accept only a storage path that starts with `prescriptions/{parentId}/` for the same parent and contains no `..`. Any other path SHALL fail with `invalid-argument` and nothing SHALL be read.

#### Scenario: Another parent's image
- **WHEN** an editor of parent A asks to scan a path under `prescriptions/B/`
- **THEN** the call fails with `invalid-argument` and nothing is read

#### Scenario: Own image
- **WHEN** an editor scans a path under their own parent's folder
- **THEN** the image is read as before

### Requirement: Confirm never invents a value
The confirm callable SHALL require at least one valid `HH:mm` time and a start date from the caller, SHALL NOT default either, and SHALL require that the prescription belongs to that parent and has not been discarded. A missing or invalid time or start date SHALL fail with `invalid-argument`.

#### Scenario: No time
- **WHEN** confirm is called without a time
- **THEN** it fails with `invalid-argument` and no medicine is created

#### Scenario: Wrong parent
- **WHEN** confirm names a prescription that belongs to another parent
- **THEN** it fails with `failed-precondition` and no medicine is created

#### Scenario: Complete call
- **WHEN** confirm has a name, a valid time and a start date for the parent's own prescription
- **THEN** the medicine is created as a prescription-scan medicine confirmed by that person
