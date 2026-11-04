## ADDED Requirements

### Requirement: Escalation view per dose
For a dose event that is `missed`, `no_answer` or `not_taken`, the family app SHALL show an ordered timeline of Ormma's call attempts for that event (call 1, retry 1, retry 2 and so on), each with its local time and one outcome of "answered", "no answer" or "failed", followed by the time the caregiver alert was created when one exists. Times SHALL be shown in the parent's timezone.

#### Scenario: Missed dose with three unanswered attempts
- **WHEN** a member opens the escalation view for a missed dose with three attempts that were not answered
- **THEN** the timeline lists call 1, retry 1 and retry 2 in time order, each marked "no answer"
- **AND** the alert time follows the last attempt

#### Scenario: No attempts yet
- **WHEN** a dose event has no call attempts
- **THEN** the view says no calls have been made yet and shows no outcome

#### Scenario: Taken dose
- **WHEN** a dose event is `taken`
- **THEN** no escalation view is offered for it

### Requirement: Attempts are served by a read-only callable
The app SHALL obtain attempts from a callable function that checks membership and consent visibility, reads `callSessions` on the member's behalf and returns only the attempt order, start time and outcome. It SHALL NOT return call SIDs, DTMF input, transcript references or any other session field, and it SHALL NOT write anything.

#### Scenario: Non-member
- **WHEN** a signed-in user who is not a member of the parent calls the function
- **THEN** it fails with permission-denied and returns nothing

#### Scenario: Session fields are not leaked
- **WHEN** the function returns attempts
- **THEN** each entry holds only an ordinal, a start time and an outcome

#### Scenario: Consent visibility applies
- **WHEN** the dose event falls in a period the member may not see under the consent visibility rule
- **THEN** the function returns no attempts

### Requirement: Emergency contacts
A parent MAY have up to 3 emergency contacts, each with a label, a kind of "neighbour" or "clinic" and a phone number in E.164 format. Any member SHALL see them in the escalation view with a call button that opens the phone dialer. Only owners SHALL add, change or remove them, from the Family tab.

#### Scenario: Member calls a contact
- **WHEN** a member taps the call button for a contact
- **THEN** the phone dialer opens with that number and the app places no call itself

#### Scenario: Owner edits contacts
- **WHEN** an owner saves a contact with a valid E.164 phone
- **THEN** the contact appears for every member

#### Scenario: Invalid phone
- **WHEN** an owner saves a contact whose phone is not in E.164 format
- **THEN** the save is rejected with a message and nothing is stored

#### Scenario: Non-owner cannot edit
- **WHEN** an editor or viewer opens the Family tab
- **THEN** no control to add or change emergency contacts is shown

### Requirement: Alerts tab dot
The Alerts tab icon SHALL show a pulsing dot while the member has at least one unread alert of type `missed_dose` or `urgent` in the visible window. The pulse SHALL be a static dot when the device asks for reduced motion, and the dot SHALL have an accessible label.

#### Scenario: Unread missed-dose alert
- **WHEN** an unread `missed_dose` alert exists
- **THEN** the Alerts tab shows the dot

#### Scenario: All read
- **WHEN** every such alert has been marked read by the member
- **THEN** the dot is gone
