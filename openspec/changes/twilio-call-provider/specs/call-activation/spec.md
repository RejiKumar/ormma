# Spec Delta

## MODIFIED Requirements

### Requirement: Calling is on only when it is configured
Calling SHALL be on only when `CALL_PROVIDER` is `exotel` and the Exotel configuration is complete, when `CALL_PROVIDER` is `twilio` and the Twilio configuration is complete (account sid, auth token, from number and public base URL), or when `CALL_PROVIDER` is `log`, which is the test mode for tests and emulators: calling counts as on but nothing is dialled. In every other state, including production without a complete provider set-up, calling SHALL be off. Exactly one real provider SHALL be active at a time. The log-only provider SHALL be used only when `CALL_PROVIDER` is `log` and SHALL NOT be a fallback.

#### Scenario: Configured
- **WHEN** `CALL_PROVIDER` is `exotel` and every Exotel setting is present
- **THEN** calling is on

#### Scenario: Twilio configured
- **WHEN** `CALL_PROVIDER` is `twilio` and every Twilio setting is present
- **THEN** calling is on and Twilio is the only provider used

#### Scenario: Not set
- **WHEN** `CALL_PROVIDER` is not set
- **THEN** calling is off and no fake call is ever recorded

#### Scenario: Incomplete configuration
- **WHEN** `CALL_PROVIDER` is `exotel` or `twilio` but a setting of that provider is missing
- **THEN** calling is off, and only the names of the missing settings, never values, are logged

#### Scenario: Other provider's settings
- **WHEN** `CALL_PROVIDER` is `twilio` and only the Exotel settings are present
- **THEN** calling is off

#### Scenario: Test provider
- **WHEN** `CALL_PROVIDER` is `log`
- **THEN** calling counts as on, the log-only provider is used and no real call is placed
