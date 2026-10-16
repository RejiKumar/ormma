# Spec Delta

## MODIFIED Requirements

### Requirement: parents path rule
The following SHALL hold:
- parents/{id}: read by members. Create only through a callable Cloud Function that writes the parent and its owner member in one batch; clients cannot create parents directly. Update by owner only, and the client may NOT modify `consent`.

#### Scenario: Parent creation
- **WHEN** a client tries to create a parent document directly
- **THEN** the create is denied
- **AND** a callable Cloud Function writes the parent and its owner member in one batch

#### Scenario: Consent is not client-writable
- **WHEN** a client updates a parent document
- **THEN** the update is allowed only by an owner and only if `consent` is not modified

### Requirement: medicines path rule
The following SHALL hold:
- medicines: read by members. Create/update by owner or editor. `confirmedByHuman: true` can be written only by an owner or editor (`request.auth.uid` is an editor/owner). Whether the field was set through a review screen is not enforced in rules.

#### Scenario: Prescription-scan medicine confirmation
- **WHEN** a client writes `confirmedByHuman: true` on a medicine, including one with source "prescription_scan"
- **THEN** it is allowed only if `request.auth.uid` is an owner or editor

### Requirement: Rules test suite
The Firebase emulator test suite SHALL include the following tests, numbered as in the source. Tests 15 and 16 were added when decisions #5 and #14 were adopted.

#### Scenario: Rules test 1
- **WHEN** an unauthenticated user tries to read anything
- **THEN** the user cannot read anything

#### Scenario: Rules test 2
- **WHEN** a signed-in non-member tries to read a parent, its medicines, or its logs
- **THEN** the non-member cannot read them

#### Scenario: Rules test 3
- **WHEN** a viewer reads and writes medicines
- **THEN** the viewer can read but cannot write medicines

#### Scenario: Rules test 4
- **WHEN** an editor writes medicines and tries to add members
- **THEN** the editor can write medicines but cannot add members

#### Scenario: Rules test 5
- **WHEN** a client tries to write `consent`, `callSessions` or `auditLogs`
- **THEN** the client cannot write them

#### Scenario: Rules test 6
- **WHEN** a member is removed
- **THEN** the removed member loses access immediately

#### Scenario: Rules test 7
- **WHEN** a client sets a doseEvent status to "missed" or "taken" with resolvedBy "dtmf"
- **THEN** the client cannot

#### Scenario: Rules test 8
- **WHEN** an owner or editor changes a `missed` doseEvent to "taken" with resolvedBy "family" and `resolvedByUid` equal to their own uid
- **THEN** the change is allowed
- **AND** they cannot change `missedAt`, and cannot move `taken` back to `missed`

#### Scenario: Rules test 9
- **WHEN** consent has been revoked
- **THEN** an editor or viewer cannot read a healthLog, alert or doseEvent dated at or after `revokedAt`, and can still read older ones
- **AND** the owner can read all

#### Scenario: Rules test 10
- **WHEN** consent status is "granted" or "pending" (before revocation)
- **THEN** the visibility rule changes nothing for any member

#### Scenario: Rules test 11
- **WHEN** a viewer tries to change a `missed` doseEvent to "taken" (or change any doseEvent)
- **THEN** the viewer cannot

#### Scenario: Rules test 12
- **WHEN** a client update has `resolvedByUid` missing or different from `request.auth.uid`
- **THEN** the update is denied

#### Scenario: Rules test 13
- **WHEN** `revokedAt` = T1 and `regrantedAt` = T2
- **THEN** an editor or viewer can read data dated before T1 and at or after T2, and cannot read data dated from T1 up to T2
- **AND** the owner can read all three

#### Scenario: Rules test 14
- **WHEN** the first `revokedAt` = T1 is kept, `regrantedAt` is null, and data was created between T2 and the later revocation
- **THEN** an editor or viewer cannot read anything dated at or after T1 (including that in-between data), and can read data before T1
- **AND** the owner can read all

#### Scenario: Rules test 15
- **WHEN** a client tries to create a parent document directly
- **THEN** the create is denied, because parents are created only through the callable Cloud Function

#### Scenario: Rules test 16
- **WHEN** a viewer tries to write `confirmedByHuman: true` on a medicine
- **THEN** the write is denied
- **AND** an owner or editor can write it

