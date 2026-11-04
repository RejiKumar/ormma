## ADDED Requirements

### Requirement: Display fields on parents, medicines and contacts
The document `parents/{parentId}` SHALL allow optional `city`, `prescriber` and `refillDue` (YYYY-MM-DD or null). Each document in `parents/{parentId}/medicines` SHALL allow optional `frequencyText`, `pillDescription` and `purpose`. Each emergency contact SHALL allow an optional `note`. Missing values are treated as empty and never defaulted by the system.

#### Scenario: Absent values
- **WHEN** a parent has no city
- **THEN** the app bar pill shows the name alone

### Requirement: Member profile and preferences fields
A members document SHALL allow optional `relationship` (up to 30 characters), `city` (up to 40 characters) and `notify: { missed: boolean, summary: boolean, quiet: boolean }`. A missing `notify` reads as `{ missed: true, summary: true, quiet: false }`.

#### Scenario: Defaults
- **WHEN** a member has no `notify`
- **THEN** missed and summary are treated as on and quiet as off

### Requirement: Read receipts on dose events
A dose event SHALL allow a server-written `seenBy` map from member uid to the timestamp when that member first saw it. An entry is never changed after it is written.

#### Scenario: First entry only
- **WHEN** a member who already has an entry opens Today again
- **THEN** the entry keeps its original time

### Requirement: Digest bookkeeping
A parent document SHALL allow a server-written `lastDigestDate` (local date string YYYY-MM-DD) recording the last local day the evening digest was sent.

#### Scenario: Sent
- **WHEN** the digest is sent for a parent on 2026-11-04
- **THEN** `lastDigestDate` is "2026-11-04"
