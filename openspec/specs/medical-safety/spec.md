# medical-safety Specification

## Purpose
Defines what the app never and always does around medical content: it records and relays, it does not advise. Migrated verbatim from specs/04-medical-safety.md (the trend flagging section is in `trend-flagging`).

## Requirements

### Requirement: Records and relays only
The following SHALL hold: This app records and relays. It does not advise.

#### Scenario: Advice
- **WHEN** the app handles medical content
- **THEN** it records and relays and does not advise

### Requirement: Prohibited behaviour
The system SHALL NOT:
- Suggest, change, or comment on a dose, timing, or medicine choice.
- Say a reading is "normal", "safe", "dangerous", or diagnose a condition.
- Auto-schedule any medicine extracted from AI without a human confirming it on screen.
- Tell the parent anything medical during calls. Scripts are fixed templates only.
- Fill in a missing value (dose, time, name) from the model's own knowledge.

#### Scenario: AI-extracted medicine
- **WHEN** a medicine is extracted from AI
- **THEN** it is not auto-scheduled without a human confirming it on screen

#### Scenario: Reading wording
- **WHEN** the app says anything about a reading
- **THEN** it does not say the reading is "normal", "safe" or "dangerous", and does not diagnose a condition

#### Scenario: Call content
- **WHEN** a call is made to the parent
- **THEN** nothing medical is said and scripts are fixed templates only

#### Scenario: Missing value
- **WHEN** a dose, time or name is missing from an extraction
- **THEN** it is not filled in from the model's own knowledge

### Requirement: Show extractions beside the source
The system SHALL:
- Show AI-extracted data beside the source (photo or transcript snippet) for human confirmation.
- Mark uncertain extractions with low confidence and require explicit review.

#### Scenario: Reviewing an extraction
- **WHEN** AI-extracted data is shown for confirmation
- **THEN** it is shown beside the source (photo or transcript snippet)
- **AND** uncertain extractions are marked with low confidence and require explicit review

### Requirement: Implausible values
The system SHALL:
- When a value looks implausible (e.g. BP 1500/90), flag needsReview instead of storing silently.

#### Scenario: Implausible BP
- **WHEN** a value looks implausible (e.g. BP 1500/90)
- **THEN** needsReview is flagged instead of storing silently

### Requirement: Trend note wording
The system SHALL:
- Phrase trend notes factually: "BP readings this week were higher than last week." Add: "Please share with the doctor."

#### Scenario: Trend note
- **WHEN** a trend note is written
- **THEN** it is phrased factually, for example "BP readings this week were higher than last week."
- **AND** it adds "Please share with the doctor."

### Requirement: Visible disclaimer
The system SHALL:
- Include a visible disclaimer: "This app does not provide medical advice."

#### Scenario: Disclaimer
- **WHEN** the disclaimer is included
- **THEN** it is a visible disclaimer: "This app does not provide medical advice."

### Requirement: Emergency urgent alert
The system SHALL:
- Provide a path for emergencies: if the parent says words indicating chest pain, breathlessness, fall, or unconsciousness, send an urgent alert to family immediately with the text "Amma mentioned something urgent. Please call her now." Do not attempt to assess it.

#### Scenario: Urgent words
- **WHEN** the parent says words indicating chest pain, breathlessness, fall, or unconsciousness
- **THEN** an urgent alert is sent to family immediately with the text "Amma mentioned something urgent. Please call her now."
- **AND** no attempt is made to assess it

### Requirement: Emergency prompt in the family app
The family app SHALL show a prompt to call local emergency services.

#### Scenario: Emergency prompt
- **WHEN** an urgent alert is shown in the family app
- **THEN** the app shows a prompt to call local emergency services

### Requirement: Urgent keyword list
The following SHALL hold:
- Maintain the keyword list per language in `functions/src/urgent-keywords.ts` and have a human who speaks each language review it.

#### Scenario: Keyword list
- **WHEN** the urgent keyword list is maintained
- **THEN** it is kept per language in `functions/src/urgent-keywords.ts`
- **AND** a human who speaks each language reviews it

### Requirement: Review before launch
The following SHALL hold:
- A doctor or pharmacist reads: call scripts, alert templates, trend wording, disclaimer, urgent-keyword list.
- This review is a launch gate: the app SHALL NOT be released to real users until each item has been reviewed and the review is recorded in `docs/DECISIONS.md` with the reviewer's role and the date.

#### Scenario: Launch gate
- **WHEN** any of the call scripts, alert templates, trend wording, disclaimer or urgent-keyword list has not been reviewed and recorded
- **THEN** the app is not released to real users

#### Scenario: Pre-launch review
- **WHEN** the app is prepared for launch
- **THEN** a doctor or pharmacist reads the call scripts, alert templates, trend wording, disclaimer and urgent-keyword list

### Requirement: Urgent alert creation path
The urgent path SHALL create an alert of type `urgent` with the fixed urgent template and deliver it
through the same alert writer and FCM sender as a missed-dose alert. The urgent callback SHALL run
before the Anthropic request when a keyword matches. The system SHALL NOT attempt to assess the
emergency.

#### Scenario: Keyword before the model
- **WHEN** a transcript contains an urgent keyword
- **THEN** the urgent alert is created before reply structuring calls the model
- **AND** the alert contains the fixed urgent text and no assessment

### Requirement: Emergency prompt action
The family app SHALL show a prompt to call local emergency services whenever an alert of type
`urgent` is visible.

#### Scenario: Urgent alert visible
- **WHEN** the alerts screen renders an urgent alert
- **THEN** it shows the prompt to call local emergency services

### Requirement: Digest and escalation wording
The family digest text, the escalation timeline labels and the presence line SHALL be fixed templates. They SHALL NOT suggest, comment on or explain a dose, timing or medicine, SHALL NOT interpret why a dose was missed, SHALL NOT contain health values, and SHALL NOT be generated by AI. The disclaimer "This app does not provide medical advice." SHALL remain visible on every screen that shows them.

#### Scenario: Missed dose wording
- **WHEN** a digest or timeline mentions a missed dose
- **THEN** it states the time and that it was not confirmed, and asks the family to check in
- **AND** it gives no medical reason or instruction

#### Scenario: Emergency contacts
- **WHEN** emergency contacts are shown
- **THEN** they are listed for the family to call
- **AND** nothing says whether the situation is an emergency, and an urgent alert still shows the prompt to call local emergency services

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

### Requirement: No safety feature depends on a plan
No safety behaviour SHALL depend on the plan: urgent alerts, missed-dose alerts for calls that were placed, the escalation view, Call buttons, emergency contacts and consent controls work the same on every plan. Subscription screens and messages SHALL use fixed templates, SHALL NOT advise on health, dosing or timing, SHALL NOT claim that a plan makes anyone safer, and SHALL NOT use fear or urgency to sell.

#### Scenario: Wording check
- **WHEN** the Subscription and limit message strings are checked
- **THEN** they contain no advice or judgement words and no claim about safety or health outcomes

#### Scenario: Free plan
- **WHEN** a family is on the free plan
- **THEN** every safety feature listed above is available
