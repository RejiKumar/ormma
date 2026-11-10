# Spec Delta

## ADDED Requirements

### Requirement: Today for an account with no parent
When the signed-in user belongs to no parent, the dashboard SHALL NOT show a bare "nothing here" message. It SHALL show an illustrated empty state that says what will appear on Today, together with the first-parent checklist defined by the onboarding capability, with "Add a parent" as the one primary action. The screen SHALL still show the disclaimer "This app does not provide medical advice." and SHALL NOT use coral or warning wording.

#### Scenario: No parent
- **WHEN** a signed-in user with no parent opens Today
- **THEN** the screen shows an illustration, one sentence saying parents appear here with their doses, the checklist, and "Add a parent" as the primary action

#### Scenario: Primary action
- **WHEN** the user taps "Add a parent"
- **THEN** the add-parent screen opens

#### Scenario: Parent exists but nothing today
- **WHEN** the user belongs to a parent that has no dose events today
- **THEN** that parent's section shows its own empty state as before, and the account-level empty state is not shown

### Requirement: Hero card stays the focal point
For each parent, the hero card (date, dose ring, one-line status) SHALL remain the first and largest element of that parent's section, above the dose timeline, and SHALL NOT be replaced by an illustration or a banner. Its wording SHALL stay a plain statement of facts and SHALL NOT call the day good or bad.

#### Scenario: Order
- **WHEN** a parent's section is rendered with events
- **THEN** the hero card appears first, followed by the dose timeline

#### Scenario: Neutral line
- **WHEN** the hero line is shown for any combination of statuses
- **THEN** it states what was taken or what is next, and uses no judgement word
