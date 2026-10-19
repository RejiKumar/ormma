# Spec Delta

## Purpose

Adds the server-written confirmation note field to the dose event, the Home feed's factual record of what the parent said, with review-path and grouped-call behaviour pinned.

## ADDED Requirements

### Requirement: doseEvents confirmation note
The collection `parents/{parentId}/doseEvents/{eventId}` SHALL also carry a server-written field `confirmationNote: string | null`: one short factual sentence in the family's language produced by reply structuring. It SHALL be written only when the structured reply passed schema validation and the confidence threshold; it SHALL stay `null` when the reply went to review. For a grouped call the same note SHALL be written to every event in the group. Clients SHALL NOT write or clear this field.

#### Scenario: Valid reply
- **WHEN** the structured reply passes schema validation and the confidence threshold
- **THEN** `confirmationNote` holds the one-sentence note on the dose event
- **AND** for a grouped call every event in the group carries the same note

#### Scenario: Review path
- **WHEN** the structured reply fails validation or its confidence is below the threshold
- **THEN** `confirmationNote` stays `null`
- **AND** there is no automatic dose status change from that reply

#### Scenario: Client attempts to write the note
- **WHEN** a client update tries to set or clear `confirmationNote`
- **THEN** the update is denied by the client-update diff rule
