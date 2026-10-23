# Spec Delta

## MODIFIED Requirements

### Requirement: Common AI call rules
The following SHALL hold: All calls are made from Cloud Functions. Validate every response with a schema (zod). Sampling parameters (`temperature`, `top_p`, `top_k`) SHALL be omitted because API version 2026-10-21 rejects them with a 400 error. Set max_tokens small. Keep prompts versioned in `functions/src/prompts/`.

#### Scenario: Call origin
- **WHEN** the Claude API is called
- **THEN** the call is made from a Cloud Function

#### Scenario: Response validation
- **WHEN** a response is received
- **THEN** it is validated with a schema (zod)

#### Scenario: Call settings
- **WHEN** a call is configured
- **THEN** no sampling parameters are sent and max_tokens is small
- **AND** prompts are versioned in `functions/src/prompts/`

## ADDED Requirements

### Requirement: Reply structuring evaluation set
`functions/test/fixtures/reply-transcripts.json` SHALL contain at least 30 transcripts covering
English, Malayalam, Tamil, Hindi, noisy/partial audio text and prompt-injection attempts, each with
expected facts. A manual script (`npm --prefix functions run eval:reply`) SHALL report accuracy and
SHALL print ids and scores only, never transcripts.

#### Scenario: Eval fixtures
- **WHEN** the reply-structuring eval set is loaded
- **THEN** it has at least 30 cases with expected `tookMedicine`, `urgent`, readings and
  confirmation-note presence
- **AND** at least one case tries to instruct the model to ignore its rules

#### Scenario: Prompt change
- **WHEN** the reply-structuring prompt changes
- **THEN** the eval script is run before the change is accepted
