# Spec Delta

## MODIFIED Requirements

### Requirement: Plans and limits
There SHALL be two plans. Free: the owner can have 1 parent and each parent can have 2 members including the owner. Ormma Family (paid): up to 3 parents per owner and 6 members per parent. Check-in calls SHALL be placed for every dose time on both plans, with no daily call limit. Every other feature SHALL be the same on both plans. A subscription belongs to the owner's account and applies to every parent that owner created.

#### Scenario: Free limits
- **WHEN** an owner without a subscription has one parent
- **THEN** creating a second parent is refused with a plan message
- **AND** inviting a third member to the first parent is refused with a plan message

#### Scenario: Paid limits
- **WHEN** an owner has an active subscription
- **THEN** up to 3 parents and 6 members per parent are allowed

#### Scenario: One owner, all parents
- **WHEN** an owner subscribes
- **THEN** the paid limits apply to all parents that owner created

#### Scenario: Every dose time is called on the free plan
- **WHEN** a free parent has doses at 19:40, 20:18, 21:00, 21:10 and 21:20 on one day
- **THEN** a call is placed for each of the five dose times
