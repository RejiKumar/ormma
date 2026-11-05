## ADDED Requirements

### Requirement: Subscription path rule
The document `subscriptions/{uid}` SHALL be readable only by the signed-in user whose uid it is, and SHALL NOT be created, updated or deleted by any client. Only Cloud Functions write it. The `users/{uid}` document SHALL NOT carry subscription data, so its field whitelist is unchanged.

#### Scenario: Owner reads own entitlement
- **WHEN** a signed-in user reads `subscriptions/{their uid}`
- **THEN** the read is allowed

#### Scenario: Other user
- **WHEN** a signed-in user reads another user's `subscriptions` document
- **THEN** the read is denied

#### Scenario: Client write
- **WHEN** any client creates, updates or deletes a `subscriptions` document
- **THEN** the write is denied
