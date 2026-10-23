# Spec Delta

## ADDED Requirements

### Requirement: Claim-time group formation
Grouping SHALL happen at claim time, after eligibility filtering: due events that pass every gate
(parent and consent, attempt limit, spacing, quiet hours, medicine re-check) SHALL be grouped by
`(parentId, scheduledFor)`. All survivors in one group SHALL be claimed in a single transaction; a
group with one survivor SHALL use the single-medicine call flow.

#### Scenario: Two medicines at the same minute
- **WHEN** two due events for one parent share `scheduledFor` and both medicines still pass the re-check
- **THEN** the dispatcher claims both in one transaction and starts one call for both

#### Scenario: One medicine fails the re-check
- **WHEN** one of two same-minute events belongs to a medicine that was deactivated
- **THEN** only the surviving event is claimed and the call is a single-medicine call

#### Scenario: Different parents or times never group
- **WHEN** due events share a time but belong to different parents, or belong to one parent at different times
- **THEN** they are claimed and called as separate groups
