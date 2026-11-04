## MODIFIED Requirements

### Requirement: parents client update fields
An owner update to a parent SHALL change only name, phone, language, timezone, active, callPolicy and emergencyContacts. The phone SHALL be in E.164 format and the language SHALL be one of "ml-IN", "ta-IN", "hi-IN", "en-IN". `emergencyContacts` SHALL be a list of at most 3 entries, each with a label (1 to 40 characters), a kind of "neighbour" or "clinic" and a phone in E.164 format, and no other fields.

#### Scenario: Provenance fields
- **WHEN** an owner tries to change `createdBy` or `createdAt` of a parent
- **THEN** the update is denied

#### Scenario: Phone format
- **WHEN** an owner changes the phone of a parent to a value that is not in E.164 format
- **THEN** the update is denied

#### Scenario: Emergency contacts shape
- **WHEN** an owner sets emergencyContacts with four entries, an unknown kind, an extra field or a phone that is not E.164
- **THEN** the update is denied

#### Scenario: Emergency contacts by non-owner
- **WHEN** an editor or viewer updates emergencyContacts
- **THEN** the update is denied

## ADDED Requirements

### Requirement: familyCalls path rule
The collection `parents/{parentId}/familyCalls/{id}` SHALL be readable by members under the consent visibility rule and SHALL NOT be writable by any client. Entries are created only by the family-call function.

#### Scenario: Member reads
- **WHEN** a member reads familyCalls of a parent whose consent is granted
- **THEN** the read is allowed

#### Scenario: Client write
- **WHEN** a client creates, updates or deletes a familyCalls entry
- **THEN** the write is denied

#### Scenario: Non-member
- **WHEN** a user who is not a member reads familyCalls
- **THEN** the read is denied

### Requirement: members lastSeenAt is server-written
`lastSeenAt` on a member document SHALL be written only by the presence function. A client write to a members document, including a change to `lastSeenAt`, SHALL be denied, as for all member fields.

#### Scenario: Client sets lastSeenAt
- **WHEN** a client writes `lastSeenAt` on its own member document
- **THEN** the write is denied
