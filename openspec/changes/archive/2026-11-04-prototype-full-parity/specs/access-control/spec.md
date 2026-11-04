## ADDED Requirements

### Requirement: Additional owner-editable parent fields
In addition to the fields listed in "parents client update fields", an owner update to a parent MAY change `city` (a string of at most 40 characters), `prescriber` (at most 60 characters) and `refillDue` (a date string YYYY-MM-DD or null). An update that changes any other field is still denied.

#### Scenario: Owner sets details
- **WHEN** an owner sets city "Thrissur", prescriber "Dr. Nair" and refillDue "2026-11-02"
- **THEN** the update is allowed

#### Scenario: Too long or wrong type
- **WHEN** an owner sets a city of 41 characters, or a refillDue that is not a date string
- **THEN** the update is denied

#### Scenario: Non-owner
- **WHEN** an editor or viewer changes these fields
- **THEN** the update is denied

### Requirement: Additional medicine display fields
In addition to the fields in "medicines document shape", a medicine written by an owner or editor MAY contain `frequencyText` (at most 80 characters), `pillDescription` (at most 80 characters) and `purpose` (at most 40 characters), each a string.

#### Scenario: Valid
- **WHEN** an editor saves a medicine with pillDescription "Small round white tablet in silver strip"
- **THEN** the write is allowed

#### Scenario: Too long
- **WHEN** an editor saves a purpose of 41 characters
- **THEN** the write is denied

#### Scenario: Viewer
- **WHEN** a viewer writes any of these fields
- **THEN** the write is denied

### Requirement: Emergency contact note
The shape of an emergency contact in "parents client update fields" SHALL also allow an optional `note` string of at most 60 characters and no other additional key.

#### Scenario: Note allowed
- **WHEN** an owner saves a contact with a 20 character note
- **THEN** the update is allowed

#### Scenario: Note too long
- **WHEN** an owner saves a contact with a 61 character note
- **THEN** the update is denied

### Requirement: Member profile and preferences are function-written
The member fields `relationship`, `city` and `notify` SHALL be written only by the member profile and preference functions, each acting on the caller's own member document. A client write to any field of a members document SHALL be denied.

#### Scenario: Client write
- **WHEN** a client writes `notify` on its own member document
- **THEN** the write is denied

### Requirement: Read receipts are server-written
The dose event field `seenBy` SHALL be written only by the read-receipt function. A client update that touches `seenBy` SHALL be denied, as for other server-only fields.

#### Scenario: Client write
- **WHEN** an owner or editor includes `seenBy` in a dose event update
- **THEN** the update is denied
