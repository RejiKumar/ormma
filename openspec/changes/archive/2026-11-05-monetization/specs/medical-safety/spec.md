## ADDED Requirements

### Requirement: No safety feature depends on a plan
No safety behaviour SHALL depend on the plan: urgent alerts, missed-dose alerts for calls that were placed, the escalation view, Call buttons, emergency contacts and consent controls work the same on every plan. Subscription screens and messages SHALL use fixed templates, SHALL NOT advise on health, dosing or timing, SHALL NOT claim that a plan makes anyone safer, and SHALL NOT use fear or urgency to sell.

#### Scenario: Wording check
- **WHEN** the Subscription and limit message strings are checked
- **THEN** they contain no advice or judgement words and no claim about safety or health outcomes

#### Scenario: Free plan
- **WHEN** a family is on the free plan
- **THEN** every safety feature listed above is available
