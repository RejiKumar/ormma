## ADDED Requirements

### Requirement: subscriptions document
The collection `subscriptions/{uid}` SHALL hold one entitlement per account with these fields:
- status: "active" | "cancelled" | "expired" | "refunded" ("cancelled" means the paid period has not yet ended)
- productId: string (the Play product, for example the monthly or yearly one)
- expiresAt: timestamp (end of the paid period)
- tokenHash: string (SHA-256 of the purchase token; the token itself is never stored)
- updatedAt: timestamp

#### Scenario: No raw token
- **WHEN** an entitlement is stored
- **THEN** it contains `tokenHash` and no purchase token

### Requirement: doseEvents callSkipped field
A dose event MAY carry `callSkipped`, and when it does the value SHALL be the string "plan", written only by the server when no call is placed for it because of the free-tier daily call limit or because the parent is paused. Such an event stays `pending`, is never marked `missed` by the checker, and the family can still mark it taken.

#### Scenario: Skipped by plan
- **WHEN** the dispatcher skips a dose because of the plan
- **THEN** the event keeps status `pending` and has `callSkipped` "plan"
