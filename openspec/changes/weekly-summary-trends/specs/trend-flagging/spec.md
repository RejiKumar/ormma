# Spec Delta

## ADDED Requirements

### Requirement: Trend thresholds are configurable
Trend thresholds SHALL be stored in a config document and reviewed by a doctor advisor before launch.

#### Scenario: Configured threshold
- **WHEN** trend flagging runs
- **THEN** the percentage threshold is read from config
