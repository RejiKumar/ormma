# Spec Delta

## ADDED Requirements

### Requirement: Show welcome again
The Appearance section of Settings SHALL end with a "Show welcome again" row that opens the welcome intro defined by the onboarding capability. The row SHALL be at least 56 dp high, its text SHALL come from the translation catalogue, and opening it SHALL NOT change any stored setting other than showing the intro.

#### Scenario: Row present
- **WHEN** a signed-in user opens Settings
- **THEN** the last row of the Appearance section reads "Show welcome again"

#### Scenario: Open the intro
- **WHEN** the user taps the row
- **THEN** the welcome intro opens, and finishing or skipping it returns to Settings
