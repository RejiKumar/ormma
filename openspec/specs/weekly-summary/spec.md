# weekly-summary Specification

## Purpose
Defines the contract for the weekly family summary written by Haiku from numbers computed by code, including the template fallback. Migrated verbatim from section 3 of specs/06-ai-contracts.md.

## Requirements

### Requirement: Weekly summary model
The following SHALL hold: Weekly summary (Haiku 5.5).

#### Scenario: Model
- **WHEN** a weekly summary is written
- **THEN** Haiku 5.5 is used

### Requirement: Weekly summary input
The following SHALL hold:
- Input: structured numbers computed by code (counts of taken/missed, BP and sugar weekly averages, symptoms list). The model does NOT calculate.

#### Scenario: Calculation
- **WHEN** a weekly summary is generated
- **THEN** its input is structured numbers computed by code (counts of taken/missed, BP and sugar weekly averages, symptoms list)
- **AND** the model does NOT calculate

### Requirement: Weekly summary rules
The following SHALL hold:
- Rules: write a 5 to 8 line factual summary in the family's language. No advice, no judgement words. End with: "Please share with the doctor if you have concerns."

#### Scenario: Summary text
- **WHEN** the summary is written
- **THEN** it is a 5 to 8 line factual summary in the family's language, with no advice and no judgement words
- **AND** it ends with "Please share with the doctor if you have concerns."

### Requirement: Weekly summary fallback
The following SHALL hold:
- Fallback: if the API fails, send a template summary built from the numbers.

#### Scenario: API failure
- **WHEN** the API fails
- **THEN** a template summary built from the numbers is sent
