## ADDED Requirements

### Requirement: Purchase data
The app SHALL store only a hash of a Google Play purchase token, plus the product, status and expiry time. The raw purchase token and the service account key SHALL NOT appear in Firestore, in the app, or in logs; the key lives only in Secret Manager. Logs about subscriptions SHALL contain only user ids and statuses. The owner's data export SHALL include the entitlement (status, product, expiry), and deleting the account SHALL delete the entitlement document.

#### Scenario: Export
- **WHEN** an owner exports their data
- **THEN** the export includes the entitlement status, product and expiry and no token

#### Scenario: Delete
- **WHEN** an account is deleted
- **THEN** its `subscriptions` document is deleted, and the Play subscription itself is cancelled by the user in Google Play

#### Scenario: Logs
- **WHEN** a purchase is verified or a notification is handled
- **THEN** the log line holds the uid and the status and no token or order details
