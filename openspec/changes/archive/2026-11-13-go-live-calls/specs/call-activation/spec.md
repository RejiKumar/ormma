# Spec Delta

## Purpose
Defines when the system makes real check-in calls, what is paused while it does not, and how the family app learns the state, so nothing false is ever shown or alerted before calling is live.

## ADDED Requirements

### Requirement: Calling is on only when it is configured
Calling SHALL be on only when `CALL_PROVIDER` is `exotel` and the Exotel configuration is complete, or when `CALL_PROVIDER` is `log`, which is the test mode for tests and emulators: calling counts as on but nothing is dialled. In every other state, including production without a complete Exotel set-up, calling SHALL be off. The log-only provider SHALL be used only when `CALL_PROVIDER` is `log` and SHALL NOT be a fallback.

#### Scenario: Configured
- **WHEN** `CALL_PROVIDER` is `exotel` and every Exotel setting is present
- **THEN** calling is on

#### Scenario: Not set
- **WHEN** `CALL_PROVIDER` is not set
- **THEN** calling is off and no fake call is ever recorded

#### Scenario: Incomplete configuration
- **WHEN** `CALL_PROVIDER` is `exotel` but an Exotel setting is missing
- **THEN** calling is off, and only the names of the missing settings, never values, are logged

#### Scenario: Test provider
- **WHEN** `CALL_PROVIDER` is `log`
- **THEN** calling counts as on, the log-only provider is used and no real call is placed

### Requirement: Nothing runs while calling is off
While calling is off, the daily generation SHALL create no dose events, the dispatcher SHALL claim no event and place no call, the missed-dose checker SHALL raise no alert and change no status, and the evening digest SHALL send nothing about doses. Each run SHALL end quietly with a status code in the log.

#### Scenario: Generation pauses
- **WHEN** the daily generation runs while calling is off
- **THEN** no dose event is created

#### Scenario: Dispatcher pauses
- **WHEN** the dispatcher runs while calling is off
- **THEN** no event is claimed, no call is placed and no document is written

#### Scenario: No false alert
- **WHEN** the missed-dose checker runs while calling is off and a pending dose is past its window
- **THEN** no alert is created and the dose status is unchanged

### Requirement: Go-live cutoff
When `CALLS_LIVE_FROM` is set to an instant, a dose event scheduled before that instant SHALL NOT be dispatched and SHALL NOT raise an alert. When it is not set there is no cutoff.

#### Scenario: Older dose
- **WHEN** calling is on, `CALLS_LIVE_FROM` is set and a pending dose is scheduled earlier than it
- **THEN** it is not dispatched and no missed-dose alert is raised for it

#### Scenario: No cutoff set
- **WHEN** `CALLS_LIVE_FROM` is not set and calling is on
- **THEN** every due pending dose is eligible as before

### Requirement: Call status for the app
A callable SHALL return `{ callsEnabled: boolean }` to any signed-in user, and nothing else. It SHALL NOT return secrets, settings or the provider name.

#### Scenario: Signed in
- **WHEN** a signed-in member asks for the call status
- **THEN** the response contains only `callsEnabled`

#### Scenario: Not signed in
- **WHEN** a caller who is not signed in asks for the call status
- **THEN** the request is refused
