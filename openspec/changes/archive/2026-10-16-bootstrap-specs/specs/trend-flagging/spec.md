# Spec Delta

## Purpose

Defines the deterministic trend flagging of blood pressure and sugar readings, with no AI judgement. Migrated verbatim from the "Trend flagging" section of specs/04-medical-safety.md.

## ADDED Requirements

### Requirement: Deterministic trend comparison
The following SHALL hold: Trend flagging (v1, deterministic, no AI judgement).
- Compare 7-day average to previous 7-day average for BP and sugar.

#### Scenario: Weekly comparison
- **WHEN** trends are computed for BP and sugar
- **THEN** the 7-day average is compared to the previous 7-day average
- **AND** no AI judgement is involved

### Requirement: Flag threshold
The following SHALL hold:
- Flag if the increase is above a configurable percentage threshold. Thresholds are config, reviewed by a doctor advisor before launch.

#### Scenario: Increase above threshold
- **WHEN** the increase is above the configurable percentage threshold
- **THEN** a flag is raised

#### Scenario: Thresholds
- **WHEN** thresholds are set
- **THEN** thresholds are config, reviewed by a doctor advisor before launch
