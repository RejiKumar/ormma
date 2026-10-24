# Spec Delta

## ADDED Requirements

### Requirement: Weekly summary delivery and sharing
A weekly summary SHALL be generated and delivered via FCM weekly. The family app SHALL show the summary with a "Share with doctor" button that exports text or PDF. The summary SHALL include the disclaimer.

#### Scenario: Share with doctor
- **WHEN** a weekly summary is shown
- **THEN** the app provides a "Share with doctor" action that exports the summary as text or PDF
- **AND** the visible disclaimer is present
