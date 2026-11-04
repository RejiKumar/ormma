## ADDED Requirements

### Requirement: Family-entered text is shown as entered
Pill appearance, purpose, frequency text, prescriber and contact notes SHALL be family-entered text. The system SHALL show it exactly as entered and SHALL NOT interpret it, complete it, translate it, suggest values, or generate it with AI. The confirmation note SHALL be shown exactly as stored, and the app SHALL NOT edit or extend it.

#### Scenario: Shown as entered
- **WHEN** a purpose is entered as "Sugar"
- **THEN** the app shows "For Sugar" and does not add or change medical content

#### Scenario: No suggestions
- **WHEN** a member opens the medicine form
- **THEN** the optional fields have no suggested or pre-filled medical text

### Requirement: Protocol, receipts and history wording
The protocol descriptions, status badges, read receipts, call history labels and digest text SHALL be fixed templates built from times, counts and outcomes. They SHALL NOT explain why a dose was missed, comment on a dose, timing or medicine, or contain health values. The disclaimer "This app does not provide medical advice." SHALL stay visible on every screen that shows them.

#### Scenario: Missed wording
- **WHEN** a dose is missed
- **THEN** the screens say it was not confirmed and give no reason or instruction

### Requirement: Urgent alerts are never filtered
Notification preferences and quiet hours SHALL NOT suppress an urgent alert or its emergency prompt.

#### Scenario: Quiet hours and urgent
- **WHEN** a member has quiet hours on and an urgent alert is created at 23:00
- **THEN** the member still receives the push
