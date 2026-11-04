## MODIFIED Requirements

### Requirement: medicines path rule
The following SHALL hold:
- medicines: read by members. Create/update by owner or editor. `confirmedByHuman: true` can be written only by an owner or editor (`request.auth.uid` is an editor/owner). Whether the field was set through a review screen is not enforced in rules.
- A client SHALL NOT create a medicine with `source` "prescription_scan", and SHALL NOT change `source` or `prescriptionId` of an existing medicine. Medicines with source "prescription_scan" are created only by the server, so the Visual match tag cannot be forged by a client.

#### Scenario: Prescription-scan medicine confirmation
- **WHEN** a client writes `confirmedByHuman: true` on a medicine, including one with source "prescription_scan"
- **THEN** it is allowed only if `request.auth.uid` is an owner or editor

#### Scenario: Client cannot create a scan-sourced medicine
- **WHEN** an owner or editor creates a medicine with source "prescription_scan"
- **THEN** the write is denied

#### Scenario: Source and prescription id are fixed
- **WHEN** an owner or editor changes `source` or `prescriptionId` on an existing medicine
- **THEN** the write is denied
