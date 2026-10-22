# Spec Delta

## Purpose

Stage 2 makes `invites` real: a callable that creates codes (rules deny all client access) and a callable that redeems them exactly once, atomically, rejecting expired, reused and wrong-user attempts.

## ADDED Requirements

### Requirement: Invite creation callable
An owner of a parent SHALL create an invite only through a callable Cloud Function. The function SHALL write `invites/{code}` with parentId, role ("editor" or "viewer"), createdBy = the caller's uid, expiresAt and `usedBy: null`; the code SHALL be an opaque, unguessable string used as the document id. Clients SHALL continue to have no read or write access to `invites/`.

#### Scenario: Owner creates an invite
- **WHEN** an owner calls the invite creation function for a parent they own
- **THEN** an invite document exists with parentId, the chosen role, createdBy = the caller, a future expiresAt and usedBy null
- **AND** no client rule allows reading or writing it

#### Scenario: Non-owner cannot create an invite
- **WHEN** a caller who is not the owner of the parent calls the function
- **THEN** the call is rejected and no invite document is created

### Requirement: Invite redemption behaviour
The invite redemption callable SHALL redeem an invite atomically: it SHALL reject an unknown code, an invite whose expiresAt has passed, an invite that already has `usedBy` set, and a caller who is already a member of the target parent. On success it SHALL set `usedBy` to the caller's uid and create the member document in one transaction, so that of concurrent redemptions exactly one succeeds.

#### Scenario: Expired invite
- **WHEN** a signed-in caller redeems a code whose expiresAt is in the past
- **THEN** the call is rejected, usedBy stays null and no member document is created

#### Scenario: Reused invite
- **WHEN** a second caller redeems a code that already has usedBy set
- **THEN** the call is rejected and the member set is unchanged

#### Scenario: Wrong user — caller already a member
- **WHEN** a caller who is already a member of the invite's parent redeems the code
- **THEN** the call is rejected and usedBy stays null

#### Scenario: Successful redemption
- **WHEN** a signed-in caller redeems a valid, unused, unexpired invite
- **THEN** usedBy is the caller's uid
- **AND** a member document exists with the invite's role, addedBy = the invite's createdBy, addedAt = now and the caller's displayName
- **AND** of two concurrent redemptions exactly one succeeds
