# Spec Delta

## ADDED Requirements

### Requirement: Live-call wiring
Reply processing SHALL be reached only from the spoken reply endpoint, with the parent's language and the question that was asked as input. Its output SHALL be validated against the schema before any write; invalid or low-confidence output SHALL go to the review state and SHALL NOT change a dose status. No transcript SHALL appear in a log.

#### Scenario: Valid structured reply
- **WHEN** the endpoint passes a usable transcript and the model output validates
- **THEN** the result is applied through the dose transition and stored without the transcript text in any log

#### Scenario: Invalid output
- **WHEN** the model output fails schema validation
- **THEN** it is stored for review, no dose status changes and the endpoint answers 422
