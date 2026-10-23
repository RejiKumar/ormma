# Spec Delta

## ADDED Requirements

### Requirement: Manual medicine creation semantics
A medicine created by the client SHALL be written with `source: "manual"` and `confirmedByHuman: true` at creation, so it is eligible for scheduling without a separate review step.

#### Scenario: Family adds a medicine
- **WHEN** an owner or editor saves a new medicine through the app
- **THEN** the stored document has source "manual", confirmedByHuman true, active true, and createdBy equal to the saving member's uid

### Requirement: Deactivation instead of deletion
Deactivating a medicine SHALL set `active: false` on the medicine document; the document and its history SHALL remain in place.

#### Scenario: Family deactivates a medicine
- **WHEN** a member deactivates a medicine that is currently active
- **THEN** the medicine document exists with active false and its name, doseText, times and history are unchanged
