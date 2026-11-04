## ADDED Requirements

### Requirement: Visual match tag
A medicine card SHALL show a neutral tag "Visual match" only when the medicine has `source` "prescription_scan", a `prescriptionId`, and `confirmedByHuman` true, that is, it was read from a prescription photo and a person confirmed it. The tag SHALL be a fixed label, SHALL NOT name an AI model, SHALL NOT claim the medicine is correct, and SHALL NOT use a status or coral colour. It does not appear for medicines the family typed in.

#### Scenario: Scanned and confirmed
- **WHEN** a medicine has source "prescription_scan", a prescriptionId and confirmedByHuman true
- **THEN** its card shows the tag "Visual match"

#### Scenario: Typed in
- **WHEN** a medicine has source "manual"
- **THEN** its card shows no such tag

#### Scenario: Not yet confirmed
- **WHEN** a scanned medicine has confirmedByHuman false
- **THEN** no tag is shown and no calls are scheduled for it

#### Scenario: No model name
- **WHEN** the tag is shown
- **THEN** no screen text or accessibility label names an AI model
