# Spec Delta

## Purpose

Defines the contract for reading a prescription photo with Sonnet: input, transcription rules, output schema and what happens to the result. Migrated verbatim from section 2 of specs/06-ai-contracts.md.

## ADDED Requirements

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
