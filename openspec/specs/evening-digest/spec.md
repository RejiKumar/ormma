# evening-digest Specification

## Purpose
TBD - created by archiving change prototype-full-parity. Update Purpose after archive.

## Requirements

### Requirement: Evening digest function
A scheduled function SHALL run every 15 minutes and, for each active parent with consent granted whose local time has just reached 20:00, send one push notification per member whose `notify.summary` is not false. The text SHALL be the fixed digest template. The function SHALL be idempotent: it SHALL record `lastDigestDate` on the parent (server-written) and send at most one digest per parent per local day. A parent with no dose events that day SHALL receive no digest.

#### Scenario: Once per day
- **WHEN** the function runs twice in the 20:00 window
- **THEN** each member receives one digest

#### Scenario: Opted out
- **WHEN** a member has `notify.summary` false
- **THEN** that member receives no digest

#### Scenario: No doses
- **WHEN** a parent has no dose events today
- **THEN** no digest is sent

#### Scenario: Consent
- **WHEN** a parent's consent is not granted
- **THEN** no digest is sent

### Requirement: Digest wording
The digest text, in the push and in the Today card, SHALL follow one fixed template: a header "Ormma update, <day> <date>", then "<name> is on track: <taken> of <total> doses confirmed." or, when any dose is not confirmed, "<name> has not confirmed <count> dose(s): <times>. Please check in.", then the first taken time as "Morning dose taken at 8:34 AM." when one exists, then "Next: <medicines> at <time>." when a dose is pending. It SHALL contain no free text, no confirmation note content, no readings and no advice. The server text SHALL be in English.

#### Scenario: On track
- **WHEN** 2 of 3 doses are confirmed and the next is Atorvastatin at 9:00 PM
- **THEN** the text reads "Amma is on track: 2 of 3 doses confirmed." and ends with "Next: Atorvastatin at 9:00 PM."

#### Scenario: Not confirmed
- **WHEN** one dose at 8:30 AM is missed
- **THEN** the text names the time and asks the family to check in, with no reason or instruction

### Requirement: Copy for WhatsApp
The Today digest card SHALL offer "Copy update for WhatsApp", which copies the same text to the clipboard and confirms it briefly, alongside the existing Share action. The app SHALL NOT send the text itself.

#### Scenario: Copy
- **WHEN** a member taps "Copy update for WhatsApp"
- **THEN** the digest text is on the clipboard and a short confirmation is shown
