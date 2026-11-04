# check-in-protocol-view Specification

## Purpose
TBD - created by archiving change prototype-full-parity. Update Purpose after archive.

## Requirements

### Requirement: Protocol always visible
The Escalation tab SHALL always show the check-in protocol for the selected parent as an ordered list: Call 1 at the first scheduled time, Retry 1 and Retry 2 at the parent's `callPolicy.retryGapMinutes` after the previous attempt (as many retries as `retryCount`), then the caregiver alert at `callPolicy.missedAfterMinutes` after the first call. Times SHALL be computed from the next or latest dose time of the day and shown in the parent's timezone. The descriptions SHALL be fixed texts: "Ormma rings <name> and speaks in <language>.", "A second gentle call <minutes> minutes later.", "Last attempt before the family is told.", and "If every call goes unanswered, the family is alerted and these contacts are offered."

#### Scenario: Default policy
- **WHEN** the policy is 2 retries, 10 minute gap and 60 minutes to missed, and the dose is at 08:30
- **THEN** the protocol lists 08:30, 08:40, 08:50 and 09:30

#### Scenario: Different policy
- **WHEN** the owner has set 1 retry with a 15 minute gap
- **THEN** the protocol lists Call 1 and one retry 15 minutes later

### Requirement: Calm state
When no dose of today is missed, the tab SHALL show a card "Nothing to escalate today" with the line "<name> replied to every call. These are the steps Ormma follows if a call is not answered." (using the parent's name; the wording avoids a pronoun for the parent), and the protocol SHALL appear dimmed. When a dose is missed, the live attempts for that dose (from the escalation view) SHALL replace the dimmed protocol and the card SHALL name the missed dose time.

#### Scenario: No missed dose
- **WHEN** every dose of today is taken or still pending
- **THEN** the calm card and the dimmed protocol are shown

#### Scenario: Missed dose
- **WHEN** the 08:30 dose is missed
- **THEN** the card says the dose was not confirmed and the real attempts are listed

### Requirement: Contacts block
The contacts shown under the protocol SHALL show an initial avatar, the label, the note when set, and a Call button that opens the dialer. The buttons SHALL be disabled in the calm state and enabled when a dose is missed or an unread urgent alert exists.

#### Scenario: Calm state
- **WHEN** nothing is missed
- **THEN** the Call buttons are disabled

#### Scenario: Missed
- **WHEN** a dose is missed
- **THEN** the Call buttons open the phone dialer with the contact's number
