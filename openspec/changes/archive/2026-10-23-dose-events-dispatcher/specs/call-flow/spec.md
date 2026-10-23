# Spec Delta

## ADDED Requirements

### Requirement: Generation horizon and eligibility
The daily generation run SHALL create dose events for exactly the 24 hours starting at the run
instant, in each parent's timezone, and SHALL create them only for medicines with `active: true` and
`confirmedByHuman: true` whose local date falls within `startDate..endDate`. Event ids SHALL be
deterministic (`{medicineId}_{yyyyMMddHHmm}` in the parent's timezone) so that reruns and overlapping
horizons create no duplicates.

#### Scenario: Daily run creates the next 24 hours
- **WHEN** the generation run executes at 00:30 Asia/Kolkata
- **THEN** each active, human-confirmed medicine gets one pending event per local time on that date and the next date whose instant falls in the next 24 hours, with ids derived from the parent-local wall clock

#### Scenario: Rerun does not duplicate or overwrite
- **WHEN** the run executes again while some planned events already exist
- **THEN** existing events keep their id, status, attempts and resolution fields, and no duplicate documents are created

#### Scenario: Ineligible medicines produce no events
- **WHEN** a medicine is inactive or not human-confirmed, or its local date is before `startDate` or after `endDate`
- **THEN** the run creates no event for that medicine

### Requirement: Dispatcher eligibility and provider boundary
The minute dispatcher SHALL claim and start calls only for due pending events that pass all gates:
the parent is active and its consent status is granted; the event has fewer than `1 + retryCount`
attempts; at least 10 minutes have passed since `lastCallAt`; the medicine is still active and
human-confirmed and still lists the event's local `HH:mm`; and the parent is not inside quiet hours.
Quiet hours SHALL defer, not mutate: the event stays pending and the first non-quiet run may claim
it. Claiming SHALL be transactional and all-or-nothing per group. Telephony SHALL be reached only
through a `CallProvider` interface, and the implementation shipped in this stage SHALL NOT dial:
it logs ids and statuses only and returns a fake callSid. Provider failures SHALL return the claimed
events to pending with attempts preserved and log error codes only.

#### Scenario: Due event inside quiet hours waits
- **WHEN** a pending event is due but the parent's local time is inside quiet hours
- **THEN** the event is neither claimed nor modified, and it is eligible again on the first run after quiet hours end

#### Scenario: Medicine was edited after generation
- **WHEN** an event is due but its medicine was deactivated, unconfirmed, or no longer lists that local time
- **THEN** the dispatcher skips that event without calling

#### Scenario: Attempt limit reached
- **WHEN** a pending event already has `attempts` equal to `1 + retryCount`
- **THEN** the dispatcher does not call it

#### Scenario: Claim is all-or-nothing
- **WHEN** two due events for the same parent and the same `scheduledFor` are claimed and one transaction read no longer sees one of them pending
- **THEN** neither event is claimed in that run

#### Scenario: Default provider does not dial
- **WHEN** the dispatcher runs with the default provider
- **THEN** it writes a fake callSid on the claimed events and logs only parent/event ids and statuses, with no real call placed
