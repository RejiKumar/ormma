# subscription Specification

## Purpose
Defines the Ormma Family plans, the limits each plan has, how a Google Play subscription becomes a server-side entitlement, and how the app shows and restores it, without ever gating safety features.

## Requirements

### Requirement: Plans and limits
There SHALL be two plans. Free: the owner can have 1 parent, each parent can have 2 members including the owner, and check-in calls are placed for the first 2 dose times of each local day per parent. Ormma Family (paid): up to 3 parents per owner, 6 members per parent, and no daily call limit. Every other feature SHALL be the same on both plans. A subscription belongs to the owner's account and applies to every parent that owner created.

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

### Requirement: Entitlement is decided on the server
The plan of an owner SHALL be derived only from the entitlement document written by Cloud Functions after verifying a purchase with the Google Play Developer API or after a Play Real-time Developer Notification. The app SHALL NOT decide, extend or fake a plan, and every limit SHALL be checked by the server in the function that creates a parent, creates an invite, redeems an invite, and dispatches calls.

#### Scenario: Verified purchase
- **WHEN** the app sends a purchase token for a subscription product to the verify function
- **THEN** the function checks it with Google Play, acknowledges it, and stores an active entitlement with the product and expiry time

#### Scenario: Invalid or foreign purchase
- **WHEN** the token is invalid, belongs to another product or package, or is already linked to a different account
- **THEN** no entitlement is stored and the app is told the purchase could not be verified

#### Scenario: Client cannot upgrade itself
- **WHEN** a client tries to write its own entitlement
- **THEN** the write is denied

### Requirement: Lifecycle
The entitlement SHALL follow Google Play: renewed on renewal, kept until the paid period ends when cancelled, ended on expiry, and ended at once on refund or revocation. After an entitlement ends there SHALL be a grace period of 7 days in which the paid limits still apply; after that the free limits apply.

#### Scenario: Cancelled
- **WHEN** a subscriber cancels in Google Play
- **THEN** the paid plan stays active until the end of the paid period

#### Scenario: Grace
- **WHEN** a subscription expired 3 days ago
- **THEN** the paid limits still apply

#### Scenario: After grace
- **WHEN** a subscription expired 8 days ago
- **THEN** the free limits apply

#### Scenario: Refund
- **WHEN** Google Play reports a refund or revocation
- **THEN** the entitlement ends at once, and the grace period does not apply

### Requirement: Nothing is deleted when limits apply
When an owner is over a free limit, existing parents, members, medicines, doses and history SHALL stay visible and unchanged. Only new additions SHALL be refused. Parents beyond the free parent limit, taking the owner's oldest parent first, SHALL be paused: no check-in calls are placed for them, and the app says so on their screens.

#### Scenario: Downgrade with two parents
- **WHEN** an owner with two parents falls back to the free plan
- **THEN** both parents remain readable, the older one keeps its calls, and the other is paused with a visible note

### Requirement: Safety features are never gated
Urgent-keyword alerts, missed-dose alerts to the family, the escalation view, the Call buttons, emergency contacts, consent controls and data export and delete SHALL work identically on every plan, including after expiry.

#### Scenario: Free parent, missed dose
- **WHEN** a dose for which a call was placed is not confirmed on the free plan
- **THEN** the family alert is created and sent as on the paid plan

### Requirement: Subscription screen
The Family tab SHALL link to a Subscription screen that shows the current plan and its end date, the monthly and yearly prices exactly as Google Play returns them, Subscribe buttons, "Manage in Google Play", and "Restore purchases". The screen SHALL use fixed neutral wording, SHALL NOT make health claims, SHALL NOT use urgency or pressure, and SHALL NOT name any AI model.

#### Scenario: Prices
- **WHEN** the screen opens on a device that can reach Google Play
- **THEN** the displayed prices come from the Play product details, not from the app

#### Scenario: Restore
- **WHEN** a member taps "Restore purchases" on a new phone
- **THEN** the app asks Google Play for existing purchases and the server re-verifies them

#### Scenario: Play unavailable
- **WHEN** Google Play cannot be reached
- **THEN** the screen says so and the rest of the app is unaffected

### Requirement: Limit messages
When a limit stops an action, the app SHALL show a fixed neutral message naming the limit and offering the Subscription screen, and SHALL NOT block any other action.

#### Scenario: Second parent on the free plan
- **WHEN** a free owner taps Add a parent
- **THEN** a message says the free plan includes one parent and links to the Subscription screen
