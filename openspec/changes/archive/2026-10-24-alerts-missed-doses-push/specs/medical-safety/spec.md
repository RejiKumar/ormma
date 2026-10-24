# Spec Delta

## ADDED Requirements

### Requirement: Urgent alert creation path
The urgent path SHALL create an alert of type `urgent` with the fixed urgent template and deliver it
through the same alert writer and FCM sender as a missed-dose alert. The urgent callback SHALL run
before the Anthropic request when a keyword matches. The system SHALL NOT attempt to assess the
emergency.

#### Scenario: Keyword before the model
- **WHEN** a transcript contains an urgent keyword
- **THEN** the urgent alert is created before reply structuring calls the model
- **AND** the alert contains the fixed urgent text and no assessment

### Requirement: Emergency prompt action
The family app SHALL show a prompt to call local emergency services whenever an alert of type
`urgent` is visible.

#### Scenario: Urgent alert visible
- **WHEN** the alerts screen renders an urgent alert
- **THEN** it shows the prompt to call local emergency services
