# ai-contracts Specification

## Purpose
Defines the rules common to every Claude API call, the cost controls and the evaluation test set. Migrated verbatim from the header, "Cost controls" and "Test set" of specs/06-ai-contracts.md; the three prompt contracts are in `reply-structuring`, `prescription-reading` and `weekly-summary`.

## Requirements

### Requirement: Common AI call rules
The following SHALL hold: All calls are made from Cloud Functions. Validate every response with a schema (zod). Temperature low (0 to 0.2). Set max_tokens small. Keep prompts versioned in `functions/src/prompts/`.

#### Scenario: Call origin
- **WHEN** the Claude API is called
- **THEN** the call is made from a Cloud Function

#### Scenario: Response validation
- **WHEN** a response is received
- **THEN** it is validated with a schema (zod)

#### Scenario: Call settings
- **WHEN** a call is configured
- **THEN** temperature is low (0 to 0.2) and max_tokens is small
- **AND** prompts are versioned in `functions/src/prompts/`

### Requirement: Model choice
The following SHALL hold:
- Haiku for 1 and 3, Sonnet only for 2.

(Where this text says "1", "2" and "3", it refers to `reply-structuring`, `prescription-reading` and `weekly-summary`.)

#### Scenario: Models
- **WHEN** reply structuring or the weekly summary is generated
- **THEN** Haiku is used
- **AND** Sonnet is used only for prescription reading

### Requirement: Usage logging
The following SHALL hold:
- Log token counts per parent per month (no content) to a `usage` collection.

#### Scenario: Token counts
- **WHEN** token counts are logged
- **THEN** they are per parent per month (no content) in a `usage` collection

### Requirement: Daily AI cap
The following SHALL hold:
- Daily cap per parent on AI calls; exceed means fallback to DTMF-only.

#### Scenario: Cap exceeded
- **WHEN** a parent exceeds the daily cap on AI calls
- **THEN** the flow falls back to DTMF-only

### Requirement: Evaluation test set
The following SHALL hold:
- Create `functions/test/fixtures/` with at least 30 transcripts (Malayalam, Tamil, Hindi, English, noisy, partial) and 10 prescription images. Expected JSON stored alongside. Run as eval before any prompt change.

#### Scenario: Fixtures
- **WHEN** the evaluation test set is created
- **THEN** `functions/test/fixtures/` holds at least 30 transcripts (Malayalam, Tamil, Hindi, English, noisy, partial) and 10 prescription images, with expected JSON stored alongside

#### Scenario: Prompt change
- **WHEN** a prompt is changed
- **THEN** the eval is run before the change
