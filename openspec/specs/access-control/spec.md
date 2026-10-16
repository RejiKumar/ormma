# access-control Specification

## Purpose
Defines who may read and write which Firestore and Storage paths, by role, plus the consent-based visibility rule and the emulator tests that prove it. Migrated verbatim from specs/02-security-rules.md.

## Requirements

### Requirement: Deny by default and membership
The following SHALL hold: Principle: deny by default. A user sees a parent's data only if `parents/{parentId}/members/{uid}` exists.

#### Scenario: Non-member access
- **WHEN** a user has no `parents/{parentId}/members/{uid}` document
- **THEN** the user does not see that parent's data

### Requirement: Role permissions
The roles SHALL have these permissions:

| Role | Read data | Edit medicines | Add/remove members | Delete parent |
|---|---|---|---|---|
| owner | yes | yes | yes | yes |
| editor | yes | yes | no | no |
| viewer | yes | no | no | no |

#### Scenario: Role table
- **WHEN** a member with a given role acts on a parent
- **THEN** the role has the permissions shown in the role table

### Requirement: users path rule
The following SHALL hold:
- users/{uid}: read/write only by that uid.

#### Scenario: Own user document only
- **WHEN** a signed-in user accesses `users/{uid}` for a different uid
- **THEN** the access is denied

### Requirement: parents path rule
The following SHALL hold:
- parents/{id}: read by members. Create by any signed-in user (creator becomes owner via a Cloud Function, not the client). Update by owner only, and the client may NOT modify `consent`.

#### Scenario: Consent is not client-writable
- **WHEN** a client updates a parent document
- **THEN** the update is allowed only by an owner and only if `consent` is not modified

### Requirement: members path rule
The following SHALL hold:
- members: read by members. Writes only via Cloud Function (invite acceptance).

#### Scenario: Member writes
- **WHEN** a client writes a members document directly
- **THEN** the write is denied because writes happen only via Cloud Function

### Requirement: medicines path rule
The following SHALL hold:
- medicines: read by members. Create/update by owner or editor. Client may not set `confirmedByHuman` to true on documents with source "prescription_scan" except through the review screen path (field set only when a human edits the doc; enforce with a rule that requires `request.auth.uid` to be an editor/owner).

#### Scenario: Prescription-scan medicine confirmation
- **WHEN** a client sets `confirmedByHuman` to true on a medicine with source "prescription_scan"
- **THEN** it is allowed only through the review screen path, where a human edits the doc and `request.auth.uid` is an editor/owner

### Requirement: doseEvents read
The following SHALL hold:
- doseEvents: read by members.

#### Scenario: Member reads doseEvents
- **WHEN** a doseEvent is read
- **THEN** doseEvents are read by members

### Requirement: doseEvents client status update
The following SHALL hold:
- Client may update only `status` to "taken" or "not_taken" with resolvedBy "family" (plus the `resolvedAt` that goes with it).

#### Scenario: Client status update scope
- **WHEN** a client updates a doseEvent
- **THEN** only `status` to "taken" or "not_taken" with resolvedBy "family" (plus `resolvedAt`) is allowed

### Requirement: doseEvents resolvedByUid on client updates
The following SHALL hold:
- Every client status update must also set `resolvedByUid` equal to `request.auth.uid`.

#### Scenario: resolvedByUid required
- **WHEN** a client status update omits `resolvedByUid` or sets it to a different uid
- **THEN** the update is denied

### Requirement: doseEvents family override and forbidden fields
The following SHALL hold:
- An owner or editor (not a viewer) may change `missed` to "taken" (family override) but may never set "missed", and may never change `missedAt`, `attempts`, `alertSent`, `lastCallSid`, `groupConfirmed` or `resolvedBy` other than to "family".

#### Scenario: Override limits
- **WHEN** an owner or editor changes a doseEvent
- **THEN** an owner or editor (not a viewer) may change `missed` to "taken" (family override) but may never set "missed", and may never change `missedAt`, `attempts`, `alertSent`, `lastCallSid`, `groupConfirmed` or `resolvedBy` other than to "family"

### Requirement: doseEvents everything else server-only
The following SHALL hold:
- Everything else server-only.

#### Scenario: Other doseEvent writes
- **WHEN** a client attempts any doseEvent write not permitted above
- **THEN** the write is denied because everything else is server-only

### Requirement: Consent visibility
The following SHALL hold:
- Consent visibility: a non-owner member (editor, viewer) can read a healthLog or alert only if `consent.revokedAt` is null, or `createdAt < consent.revokedAt`, or (`consent.regrantedAt` is not null and `createdAt >= consent.regrantedAt`). The same test applies to doseEvents using `scheduledFor`. Data dated between revocation and re-grant stays hidden from non-owners. Owners always read everything.

#### Scenario: Visibility test
- **WHEN** an editor or viewer reads a healthLog or alert (or a doseEvent, using `scheduledFor`)
- **THEN** the read is allowed only if `consent.revokedAt` is null, or `createdAt < consent.revokedAt`, or (`consent.regrantedAt` is not null and `createdAt >= consent.regrantedAt`)
- **AND** owners always read everything

### Requirement: Second revocation fails closed
The following SHALL hold:
- v1 limitation, fail closed: only one revoke and re-grant cycle is modelled. A second revocation keeps the FIRST `revokedAt` and clears `regrantedAt`, so non-owners see only data from before the first revocation.

#### Scenario: Second revocation
- **WHEN** a second revocation happens
- **THEN** the FIRST `revokedAt` is kept and `regrantedAt` is cleared
- **AND** non-owners see only data from before the first revocation

### Requirement: Fail-closed rationale
The following SHALL hold:
- History between a re-grant and a later revocation is hidden from non-owners on purpose, because one pair of timestamps cannot describe two gaps and overwriting `revokedAt` would expose the first gap.

#### Scenario: History between re-grant and later revocation
- **WHEN** data is dated between a re-grant and a later revocation
- **THEN** it is hidden from non-owners on purpose

### Requirement: Visibility check mechanics
The following SHALL hold:
- The check reads the parent doc with `get()`. Rules do not filter, so mobile queries must include the same `where` clause or they will be denied.

#### Scenario: Query without the where clause
- **WHEN** a mobile query omits the same `where` clause
- **THEN** the query is denied

### Requirement: healthLogs path rule
The following SHALL hold:
- healthLogs: read by members. Create by owner/editor with source "family". Server writes voice logs.

#### Scenario: Family health log
- **WHEN** an owner or editor creates a healthLog
- **THEN** it is allowed with source "family"
- **AND** voice logs are written by the server

### Requirement: callSessions and auditLogs path rule
The following SHALL hold:
- callSessions, auditLogs: no client access at all.

#### Scenario: Client access
- **WHEN** a client reads or writes callSessions or auditLogs
- **THEN** the access is denied

### Requirement: prescriptions path rule
The following SHALL hold:
- prescriptions: read by members; create by owner/editor; status changes to "confirmed" by owner/editor only.

#### Scenario: Prescription confirmation
- **WHEN** a prescription status changes to "confirmed"
- **THEN** it is allowed by owner or editor only

### Requirement: alerts path rule
The following SHALL hold:
- alerts: read by members; client may only append own uid to `readBy`.

#### Scenario: readBy append
- **WHEN** a client updates an alert
- **THEN** only appending its own uid to `readBy` is allowed

### Requirement: invites path rule
The following SHALL hold:
- invites: no client access. Redeemed through a callable function.

#### Scenario: Invite redemption
- **WHEN** a client accesses an invite directly
- **THEN** the access is denied
- **AND** invites are redeemed through a callable function

### Requirement: Storage rules for prescriptions
The following SHALL hold:
- `/prescriptions/{parentId}/*`: read/write only by owner/editor members. Max 10 MB, images only.

#### Scenario: Prescription upload
- **WHEN** a file is uploaded under `/prescriptions/{parentId}/*`
- **THEN** it is allowed only for owner/editor members, at most 10 MB, images only

### Requirement: Storage rules for transcripts
The following SHALL hold:
- `/transcripts/*`: no client access.

#### Scenario: Transcript access
- **WHEN** a client accesses `/transcripts/*`
- **THEN** the access is denied

### Requirement: Rules test suite
The Firebase emulator test suite SHALL include the following tests, numbered as in the source.

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
