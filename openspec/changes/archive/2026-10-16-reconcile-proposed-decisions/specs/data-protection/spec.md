# Spec Delta

## MODIFIED Requirements

### Requirement: Transcript storage
The following SHALL hold:
- Transcripts: store only when needsReview is true, in Storage under `transcripts/review/`, deleted when the review is resolved or after 30 days, whichever comes first.

(See also `data-model` Retention for the same topic.)

#### Scenario: Transcript for review
- **WHEN** needsReview is true for a reply
- **THEN** its transcript is stored in Storage under `transcripts/review/`
- **AND** it is deleted when the review is resolved or after 30 days, whichever comes first

