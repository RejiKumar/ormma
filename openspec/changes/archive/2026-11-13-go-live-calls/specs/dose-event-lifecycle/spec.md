# Spec Delta

## ADDED Requirements

### Requirement: Voice reply transitions
A usable spoken reply SHALL change a dose event only through the same transition function as a keypad answer: a clear "taken" becomes `taken`, a clear "not taken" becomes `not_taken`, and an unclear answer becomes `unclear` with a confirmation note per the reply-structuring rules. The change SHALL be applied once per CallSid. A reply that is not usable SHALL change nothing, and an urgent keyword SHALL raise the urgent alert before any dose change, as already specified.

#### Scenario: Clear taken
- **WHEN** a usable spoken reply says the medicines were taken
- **THEN** the pending events of that call become `taken`, exactly as a keypad 1 would

#### Scenario: Not usable
- **WHEN** the spoken reply is not usable
- **THEN** no event changes and the flow offers the keypad prompt

#### Scenario: Applied once
- **WHEN** the same CallSid delivers its reply twice
- **THEN** the transition is applied once and no second log or alert is created
