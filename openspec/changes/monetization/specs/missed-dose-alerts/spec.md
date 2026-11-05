## ADDED Requirements

### Requirement: Alerts are not gated by plan
Missed-dose alerts, no-answer alerts and urgent-keyword alerts SHALL be created and delivered on every plan, subject only to each member's own notification preferences. A dose event flagged `callSkipped` "plan" SHALL NOT be marked `missed` and SHALL NOT produce a missed-dose alert, because no call was placed for it; it is shown as scheduled with a note that no check-in call is placed on the current plan.

#### Scenario: Free parent, call placed and unanswered
- **WHEN** a call was placed on the free plan and the parent did not reply within the policy window
- **THEN** the dose is marked missed and the family is alerted as usual

#### Scenario: Skipped by plan
- **WHEN** a dose is flagged `callSkipped` "plan"
- **THEN** the checker leaves it `pending` and creates no alert

#### Scenario: Urgent keyword
- **WHEN** a reply contains an urgent keyword on the free plan
- **THEN** the urgent alert is sent at once
