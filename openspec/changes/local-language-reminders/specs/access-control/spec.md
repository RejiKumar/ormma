## MODIFIED Requirements

### Requirement: users document shape
A users document written by its owner SHALL contain only the fields of the data model, and its phone SHALL be in E.164 format. The optional `language` field, when present, SHALL be one of "en", "ml", "ta" or "hi", and it is written only by the owner of the document, like every other field of it.

#### Scenario: Phone format
- **WHEN** a user writes their users document with a phone that is not in E.164 format
- **THEN** the write is denied

#### Scenario: Language value
- **WHEN** a user writes their own users document with a language of "ml"
- **THEN** the write is allowed
- **AND** a language that is not one of the four values is denied

#### Scenario: Language of another member
- **WHEN** a signed-in user writes the language on another member's users document
- **THEN** the write is denied
