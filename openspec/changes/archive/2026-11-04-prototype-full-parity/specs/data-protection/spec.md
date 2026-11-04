## ADDED Requirements

### Requirement: New fields in export and delete
The export callable SHALL include the new parent fields, medicine fields, contact notes, member `relationship`, `city` and `notify`, dose event `seenBy` and `lastDigestDate`. The delete callable SHALL remove them with the parent. Member relationship, city, preferences and read receipts are personal data about members: they SHALL be visible only to members of the same parent and SHALL NOT appear in logs.

#### Scenario: Export
- **WHEN** an owner exports a parent
- **THEN** the JSON includes the new fields

#### Scenario: Log content
- **WHEN** the read-receipt, profile, preference, call-history or digest functions log
- **THEN** each line holds ids, counts and statuses only, never names, cities, times of a person's activity, digest text or confirmation notes

### Requirement: Push content
A push notification from the evening digest or a missed-dose alert SHALL contain only the fixed template text. It SHALL NOT contain confirmation notes, medicine names beyond what the template names, or readings.

#### Scenario: Digest push
- **WHEN** the evening digest is sent
- **THEN** its body is the digest template text and nothing else
