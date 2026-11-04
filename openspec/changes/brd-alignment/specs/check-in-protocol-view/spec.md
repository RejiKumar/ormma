## MODIFIED Requirements

### Requirement: Contacts block
The contacts shown under the protocol SHALL start with the parent's direct line, labelled "Call <parent name>" with the parent's initial, followed by the emergency contacts. Each emergency contact SHALL show an initial avatar, the label, the note when set, and a Call button that opens the dialer. Every Call button, the parent's included, SHALL be disabled in the calm state and enabled when a dose is missed or an unread urgent alert exists.

#### Scenario: Parent direct line
- **WHEN** the Escalation tab shows the contacts
- **THEN** the first entry is the parent with a Call button that opens the dialer with the parent's phone number

#### Scenario: Calm state
- **WHEN** nothing is missed
- **THEN** the Call buttons are disabled, the parent's included

#### Scenario: Missed
- **WHEN** a dose is missed
- **THEN** the Call buttons open the phone dialer with the contact's number
