# Spec Delta

## ADDED Requirements

### Requirement: Alerts screen from the header bell
When the Insights tab replaces the Escalation tab, the app header SHALL show a bell that opens the Alerts screen, a screen that contains everything the Escalation tab showed: the alerts list, the escalation timeline for a missed, no-answer or not-taken dose, and the emergency contacts with their call buttons. The bell SHALL be at least 48 dp, SHALL have an accessible name, and SHALL be present on every tab. Opening the Alerts screen SHALL NOT remove, hide or delay any alert, and urgent alerts SHALL stay visible there until read.

#### Scenario: Open from the bell
- **WHEN** a member taps the header bell
- **THEN** the Alerts screen opens with the alerts list, the escalation timeline and the emergency contacts

#### Scenario: Back
- **WHEN** the member goes back from the Alerts screen
- **THEN** the previously open tab is shown

#### Scenario: Nothing lost
- **WHEN** an urgent alert exists
- **THEN** it is shown on the Alerts screen and the bell shows the unread dot until it is read

### Requirement: Push taps open the Alerts screen
A tapped push notification of an alert type (missed dose, unclear reply, no answer, trend flag, weekly summary or urgent) SHALL open the Alerts screen, from the background and from a cold start, whether Alerts is a tab or reached from the header bell. A tap on any other notification SHALL open Today.

#### Scenario: Alert tap
- **WHEN** the member taps a missed-dose push while the app is in the background
- **THEN** the Alerts screen opens

#### Scenario: Digest tap
- **WHEN** the member taps an evening-digest push
- **THEN** Today opens

## MODIFIED Requirements

### Requirement: Alerts tab dot
An unread-alert dot SHALL be shown on the Alerts tab icon, or on the header bell when Alerts is reached from the bell, while the member has at least one unread alert of type `missed_dose` or `urgent` in the visible window. The pulse SHALL be a static dot when the device asks for reduced motion, and the dot SHALL have an accessible label.

#### Scenario: Unread missed-dose alert
- **WHEN** an unread `missed_dose` alert exists
- **THEN** the dot is shown on the Alerts tab, or on the header bell when the Insights tab is present

#### Scenario: All read
- **WHEN** every such alert has been marked read by the member
- **THEN** the dot is gone
