## MODIFIED Requirements

### Requirement: Sharing the update
The update SHALL be handed to the system share sheet when the member taps "Share update", and SHALL be handed to WhatsApp when the member taps "Share on WhatsApp", which opens `https://wa.me/?text=` followed by the percent-encoded update so the member chooses the chat and taps send. When the link cannot be opened, or the encoded link would be longer than 2000 characters, the app SHALL open the system share sheet instead. The app SHALL NOT send the update to anyone itself, SHALL NOT store it and SHALL NOT log its text or the link.

#### Scenario: Share
- **WHEN** a member taps "Share update"
- **THEN** the system share sheet opens with the text
- **AND** nothing is written to Firestore or logs

#### Scenario: WhatsApp
- **WHEN** a member taps "Share on WhatsApp"
- **THEN** WhatsApp opens with the update as the message text, unsent
- **AND** nothing is written to Firestore or logs

#### Scenario: Fallback
- **WHEN** WhatsApp cannot be opened or the update is too long for a link
- **THEN** the system share sheet opens with the text

#### Scenario: Consent
- **WHEN** the parent's consent is not granted
- **THEN** no update is offered
