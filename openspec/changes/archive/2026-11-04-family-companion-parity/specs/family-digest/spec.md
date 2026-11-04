## ADDED Requirements

### Requirement: Daily family update
The Today screen SHALL offer, per parent with doses today, a plain-text update built on the device from today's dose events that the member can already read. The text SHALL be a fixed template with the parent's name, the date, the number of doses taken out of the total, the time of the next pending dose and the times of any missed doses. It SHALL contain no medicine names, doses, transcripts, readings or free text, and SHALL NOT be produced by AI.

#### Scenario: On track
- **WHEN** 2 of 3 doses are taken and the next is at 21:00
- **THEN** the text states 2 of 3 doses taken and the next dose time

#### Scenario: Missed dose
- **WHEN** a dose at 08:30 is missed
- **THEN** the text names the missed time and asks the family to check in, without saying why or what to do medically

#### Scenario: No doses today
- **WHEN** a parent has no doses today
- **THEN** no update is offered for that parent

### Requirement: Sharing the update
The update SHALL be handed to the system share sheet when the member taps "Share update". The app SHALL NOT send it to anyone itself, SHALL NOT store it and SHALL NOT log its text.

#### Scenario: Share
- **WHEN** a member taps "Share update"
- **THEN** the system share sheet opens with the text
- **AND** nothing is written to Firestore or logs

#### Scenario: Consent
- **WHEN** the parent's consent is not granted
- **THEN** no update is offered
