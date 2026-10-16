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
