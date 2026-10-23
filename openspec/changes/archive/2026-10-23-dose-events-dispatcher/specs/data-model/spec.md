# Spec Delta

## ADDED Requirements

### Requirement: Server call metadata fields
A dose event SHALL carry two server-written timestamps: `lastCallAt`, set when a call attempt is
claimed, and `reminderAt`, set when the single extra reminder after a `not_taken` reply is scheduled.
Clients SHALL NOT write either field; both are set to null when an event is created by generation.

#### Scenario: Event is claimed
- **WHEN** the dispatcher claims a pending event
- **THEN** `lastCallAt` is set to the claim instant and `attempts` is incremented

#### Scenario: Client cannot alter call metadata
- **WHEN** a family member updates an event they are allowed to resolve
- **THEN** `lastCallAt` and `reminderAt` remain server-owned and are not part of the client update
