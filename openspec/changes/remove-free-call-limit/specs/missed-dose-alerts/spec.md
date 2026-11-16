# Spec Delta

## MODIFIED Requirements

### Requirement: Alerts are not gated by plan
Missed-dose alerts, no-answer alerts and urgent-keyword alerts SHALL be created and delivered on every plan, subject only to each member's own notification preferences. A dose event flagged `callSkipped` "plan" (an event of a parent paused above the free parent limit) SHALL NOT be marked `missed` and SHALL NOT produce a missed-dose alert, because no call was placed for it; it is shown as scheduled with a note that no check-in call is placed on the current plan.

#### Scenario: Free parent, call placed and unanswered
- **WHEN** a call was placed on the free plan and the parent did not reply within the policy window
- **THEN** the dose is marked missed and the family is alerted as usual

#### Scenario: Skipped by plan
- **WHEN** a dose is flagged `callSkipped` "plan"
- **THEN** the checker leaves it `pending` and creates no alert

#### Scenario: Any dose time on the free plan
- **WHEN** a free parent's third, fourth or fifth dose of the day is called and not answered
- **THEN** the dose is marked missed and the family is alerted as usual

#### Scenario: Urgent keyword
- **WHEN** a reply contains an urgent keyword on the free plan
- **THEN** the urgent alert is sent at once
