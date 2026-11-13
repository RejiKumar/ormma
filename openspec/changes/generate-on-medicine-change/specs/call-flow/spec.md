# Spec Delta

## MODIFIED Requirements

### Requirement: Generation horizon and eligibility
The daily generation run, and the generation that runs when a medicine is created or its schedule changes, SHALL create dose events for exactly the 24 hours starting at the run instant, in each parent's timezone, and SHALL create them only for medicines with `active: true` and `confirmedByHuman: true` whose local date falls within `startDate..endDate`. Event ids SHALL be deterministic (`{medicineId}_{yyyyMMddHHmm}` in the parent's timezone) so that reruns and overlapping horizons create no duplicates.

#### Scenario: Daily run creates the next 24 hours
- **WHEN** the generation run executes at 00:30 Asia/Kolkata
- **THEN** each active, human-confirmed medicine gets one pending event per local time on that date and the next date whose instant falls in the next 24 hours, with ids derived from the parent-local wall clock

#### Scenario: Rerun does not duplicate or overwrite
- **WHEN** the run executes again while some planned events already exist
- **THEN** existing events keep their id, status, attempts and resolution fields, and no duplicate documents are created

#### Scenario: Ineligible medicines produce no events
- **WHEN** a medicine is inactive or not human-confirmed, or its local date is before `startDate` or after `endDate`
- **THEN** the run creates no event for that medicine

## ADDED Requirements

### Requirement: Generation when a medicine changes
When a medicine is created, or its `times`, `startDate`, `endDate`, `active` or `confirmedByHuman` change, the system SHALL immediately plan that medicine's events for the next 24 hours and create the missing ones as pending, with the same rules and ids as the daily run. It SHALL create nothing while calling is off, for an inactive parent, or for a medicine that is not active and human-confirmed. It SHALL NOT overwrite or remove any existing event, and SHALL NOT act on a deleted medicine or on a change that does not touch the schedule. The daily run remains in place as a safety net. Logs SHALL contain ids, counts and statuses only.

#### Scenario: New medicine today
- **WHEN** a human-confirmed medicine is saved at 19:27 with a dose time of 20:18 the same day
- **THEN** a pending event for 20:18 exists within moments, without waiting for the daily run

#### Scenario: Same write twice
- **WHEN** the same medicine write is processed twice, or the daily run follows it
- **THEN** exactly one event exists per dose time and its fields are unchanged

#### Scenario: Time added
- **WHEN** a medicine gains a second dose time
- **THEN** only the new time gets an event, and the existing events are untouched

#### Scenario: Time removed or medicine deactivated
- **WHEN** a dose time is removed or the medicine is deactivated
- **THEN** no new event is created and existing events are left as they are, for the dispatcher to skip

#### Scenario: Time already past
- **WHEN** a medicine is saved with a dose time earlier today
- **THEN** no event is created for that time today, and the next occurrence within the 24 hours is created

#### Scenario: Calling off or inactive parent
- **WHEN** calling is off, or the parent is not active
- **THEN** no event is created

#### Scenario: Display-only edit
- **WHEN** only the name, dose or a display note changes
- **THEN** nothing is created
