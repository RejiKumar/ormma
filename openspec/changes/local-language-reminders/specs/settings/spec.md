# Spec Delta

## ADDED Requirements

### Requirement: App language setting
Settings SHALL include an App language row listing English, Malayalam, Tamil and Hindi, each written in its own script, with the active choice marked. Choosing one SHALL change the app's language at once and be remembered; "Phone language" SHALL be the way back to following the phone.

#### Scenario: Choose a language
- **WHEN** the person selects Hindi in Settings
- **THEN** the app is shown in Hindi immediately

#### Scenario: Back to the phone's language
- **WHEN** the person selects Phone language
- **THEN** the app follows the phone's language again
