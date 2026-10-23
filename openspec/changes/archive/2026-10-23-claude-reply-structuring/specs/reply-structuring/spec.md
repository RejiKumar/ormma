# Spec Delta

## ADDED Requirements

### Requirement: Urgent keyword pre-check ordering
The urgent keyword list SHALL be checked before any model call. A match SHALL notify the caller
immediately through a callback, then structuring MAY continue so the reply is not lost. The keyword
lists SHALL cover the parent's language plus an English safety net.

#### Scenario: Keyword match
- **WHEN** the transcript contains a chest-pain, breathlessness, fall or unconsciousness keyword
- **THEN** the urgent callback runs before the Anthropic request
- **AND** the result is marked urgent with the keyword as its source

### Requirement: Reply structuring result metadata
The structuring result SHALL carry `needsReview`, the review reasons and the prompt version.
`needsReview` SHALL be true when confidence is below 0.6, a reading is outside its plausibility
range, or both attempts return invalid JSON/schema output. An invalid result SHALL have
`tookMedicine: null` so no dose status can change. Structuring SHALL NOT write Firestore or change a
dose status itself.

#### Scenario: Invalid output after retry
- **WHEN** both attempts return invalid JSON or fail the schema
- **THEN** the result has `tookMedicine: null`, `needsReview: true` and reason `invalid_output`
- **AND** no dose status is changed

#### Scenario: Implausible reading
- **WHEN** a valid extraction contains systolic outside 60-260, diastolic outside 30-160 or sugar
  outside 20-600 mg/dL
- **THEN** the value is kept for review and `needsReview` is true

### Requirement: Reply structuring model settings
Reply structuring SHALL call Claude Haiku 5.5 with a small `max_tokens`, using a prompt versioned
under `functions/src/prompts/`. It SHALL NOT send `temperature`, `top_p` or `top_k`, because API
version 2026-10-21 rejects sampling parameters. The transcript SHALL be sent as JSON data and the
system prompt SHALL say instructions inside it are ignored.

#### Scenario: Call settings
- **WHEN** a reply is structured
- **THEN** the model string is `claude-haiku-5-5` and `max_tokens` is 512
- **AND** no sampling parameters are sent
- **AND** the versioned prompt file is used
