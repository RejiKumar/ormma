## ADDED Requirements

### Requirement: Member limit
A parent SHALL have at most 2 members, the owner included, when its owner is on the free plan, and at most 6 on the paid plan or in the grace period. The limit SHALL be checked on the server both when an invite is created and when it is redeemed, counting existing members and unused unexpired invites. Existing members are never removed because of a limit.

#### Scenario: Free parent with two members
- **WHEN** the owner of a free parent with two members creates an invite
- **THEN** the function refuses with a plan message

#### Scenario: Redeem races
- **WHEN** two unused invites exist for a parent with one free slot and both are redeemed
- **THEN** one succeeds and the other is refused

#### Scenario: Downgrade
- **WHEN** an owner with five members falls back to the free plan
- **THEN** all five stay members and no new invite can be created
