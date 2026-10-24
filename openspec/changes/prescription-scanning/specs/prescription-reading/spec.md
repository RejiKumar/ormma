# Spec Delta

## ADDED Requirements

### Requirement: Prescription upload and scanning
An owner or editor SHALL upload a prescription photo to Storage at `prescriptions/{parentId}/...` (image only, <=10 MB). A callable function SHALL send the image to Claude Sonnet 5.5 (claude-sonnet-5-5), validate the output against the prescription-reading schema, and save it as a prescription document with status `pending_review`. Nothing SHALL be scheduled until human confirmation.

#### Scenario: Upload triggers scan
- **WHEN** an owner or editor uploads a prescription photo
- **THEN** the scan function calls Sonnet 5.5 with the image and saves the validated result with status `pending_review` with no medicines scheduled

### Requirement: Human review gate
The family app SHALL show the prescription image beside each extracted medicine with confidence badges. Illegible items SHALL be highlighted. An illegible item SHALL NOT be confirmable until it is edited (made legible/valid). Only on explicit confirmation per medicine SHALL a medicine be created with `source` `prescription_scan`, `confirmedByHuman` true, and `prescriptionId` set.

#### Scenario: Illegible cannot be confirmed without edits
- **WHEN** a medicine is marked illegible
- **THEN** the Confirm action is disabled until the user edits it to a valid non-illegible entry

#### Scenario: Confirmation creates medicine
- **WHEN** the user confirms an edited medicine
- **THEN** a medicine document is created with `source` "prescription_scan", `confirmedByHuman` true, and `prescriptionId` set
