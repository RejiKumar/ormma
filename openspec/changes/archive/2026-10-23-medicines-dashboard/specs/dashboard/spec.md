# Spec Delta

## Purpose

What the family app shows for today: each member's parents with their dose events and current statuses, recent alerts, and the medical-safety disclaimer, kept current in realtime.

## ADDED Requirements

### Requirement: Today's dose events with status chips
The dashboard SHALL show, for each parent the signed-in member belongs to, the dose events scheduled for today in that parent's timezone, each with a status chip matching the event's current status from the dose-event-lifecycle state set (pending, calling, taken, not_taken, no_answer, unclear, missed).

#### Scenario: Mixed statuses across parents
- **WHEN** a member with two parents opens the dashboard and today has events in pending, taken and missed states
- **THEN** each parent section shows its own today events and every event shows a chip matching its stored status

#### Scenario: Parent with no events today
- **WHEN** a member's parent has no dose events scheduled for today
- **THEN** the parent section shows an empty state, not an error

### Requirement: Realtime refresh
The dashboard SHALL update without a manual refresh: status changes, newly created events and newly created alerts appear while the screen is open.

#### Scenario: Event status changes elsewhere
- **WHEN** a call flow moves an event from pending to taken while a member watches the dashboard
- **THEN** the event's chip changes to taken without the member reloading

### Requirement: Recent alerts list
The dashboard SHALL list the alerts visible to the signed-in member, newest first. Visibility is whatever the access-control consent rule returns; the dashboard SHALL query alerts with the filter that rule requires so no member's read is denied.

#### Scenario: Alerts appear newest first
- **WHEN** two missed-dose alerts exist for the member's parents
- **THEN** the dashboard lists the more recent alert first

### Requirement: Disclaimer in the dashboard footer
The dashboard SHALL show the medical-safety disclaimer "This app does not provide medical advice." in the footer of the dashboard screen.

#### Scenario: Disclaimer visible
- **WHEN** a member opens the dashboard
- **THEN** the exact disclaimer text is visible on the screen
