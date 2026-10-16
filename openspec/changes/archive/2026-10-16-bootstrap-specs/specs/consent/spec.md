# Spec Delta

## Purpose

Defines how a parent's consent is requested, granted, revoked and re-granted, and what that does to calls and to what family members can see (India DPDP Act oriented). Migrated verbatim from the Consent and Revocation sections of specs/05-consent-dpdp.md; the data protection sections are in `data-protection`.

## ADDED Requirements

### Requirement: Legal review
The following SHALL hold: Not legal advice. Have a lawyer review before launch.

#### Scenario: Before launch
- **WHEN** the app is prepared for launch
- **THEN** a lawyer reviews it

### Requirement: Initial consent state
The following SHALL hold:
- A parent record starts with consent.status = "pending". No calls or health logging until "granted".

#### Scenario: New parent
- **WHEN** a parent record is created
- **THEN** consent.status is "pending"
- **AND** no calls or health logging happen until it is "granted"

### Requirement: Granting by voice or DTMF
The following SHALL hold:
- Granting methods:
  1. Voice or DTMF consent during a first call: a plain-language script in the parent's language naming who will see the data (the listed family members) and why. "Press 1 to agree."

#### Scenario: Consent call
- **WHEN** consent is requested during a first call
- **THEN** a plain-language script in the parent's language names who will see the data (the listed family members) and why
- **AND** the parent can agree with "Press 1 to agree."

### Requirement: Granting by family attestation
The following SHALL hold:
- Granting methods:
  2. Family-attested (fallback): an owner confirms the parent has agreed. Record method = "family_attested" and show a warning that voice consent is preferred.

#### Scenario: Owner attests
- **WHEN** an owner confirms the parent has agreed
- **THEN** method = "family_attested" is recorded
- **AND** a warning is shown that voice consent is preferred

### Requirement: Policy version
The following SHALL hold:
- Store policyVersion with the consent. Re-ask when the policy changes.

#### Scenario: Policy changes
- **WHEN** the policy changes
- **THEN** consent is asked again, and policyVersion is stored with the consent

### Requirement: Revocation by the parent
The following SHALL hold:
- The parent can say or press a key on any call to stop calls and sharing ("Press 9 to stop reminders"). Status becomes "revoked" immediately.

#### Scenario: Parent presses 9
- **WHEN** the parent says or presses a key on any call to stop ("Press 9 to stop reminders")
- **THEN** calls and sharing stop
- **AND** status becomes "revoked" immediately

### Requirement: Revocation by an owner
The following SHALL hold:
- Owner can revoke from the app.

#### Scenario: Owner revokes
- **WHEN** an owner revokes from the app
- **THEN** consent is revoked

### Requirement: Effects of revocation
The following SHALL hold:
- On revocation: set `consent.revokedAt` (at the first revocation only; never overwritten) and clear `regrantedAt`, stop calls, hide new data from non-owners, offer export and deletion.

#### Scenario: Revocation effects
- **WHEN** consent is revoked
- **THEN** `consent.revokedAt` is set at the first revocation only and never overwritten, and `regrantedAt` is cleared
- **AND** calls stop, new data is hidden from non-owners, and export and deletion are offered

### Requirement: Re-grant
The following SHALL hold:
- Re-grant: if consent is granted again (a new consent call or a family attestation by an owner), set `consent.regrantedAt` and keep `revokedAt`. Calls may resume.

#### Scenario: Consent granted again
- **WHEN** consent is granted again by a new consent call or a family attestation by an owner
- **THEN** `consent.regrantedAt` is set and `revokedAt` is kept
- **AND** calls may resume

### Requirement: Visibility rule
The following SHALL hold:
- Visibility rule (enforced in Firestore rules, spec 02): data dated before `revokedAt`, or at or after `regrantedAt`, is visible to existing members. Data dated in between is visible to owners only, permanently.

(Where this text says "spec 02", it refers to the capability `access-control`.)

#### Scenario: Data dated in between
- **WHEN** data is dated between `revokedAt` and `regrantedAt`
- **THEN** it is visible to owners only, permanently
- **AND** data dated before `revokedAt`, or at or after `regrantedAt`, is visible to existing members

### Requirement: One revoke and re-grant cycle
The following SHALL hold:
- v1 limitation (fail closed): only one revoke and re-grant cycle is modelled. A second revocation hides everything after the first revocation from editors and viewers, including history between the re-grant and the later revocation. This is deliberate.

#### Scenario: Second revocation
- **WHEN** a second revocation happens
- **THEN** everything after the first revocation is hidden from editors and viewers, including history between the re-grant and the later revocation
- **AND** this is deliberate

### Requirement: Owner decides on older data
The following SHALL hold:
- The owner decides what happens to the older data: export it, or delete the parent record.

#### Scenario: Older data after revocation
- **WHEN** consent has been revoked
- **THEN** the owner decides whether to export the older data or delete the parent record
