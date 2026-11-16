# Spec Delta

## MODIFIED Requirements

### Requirement: Subscription screen
The Family tab SHALL link to a Subscription screen that shows the current plan and its status, a side-by-side comparison of the Free and Ormma Family plans, the monthly and yearly prices exactly as Google Play returns them, Subscribe buttons, "Manage in Google Play", and "Restore purchases". The screen SHALL use fixed neutral wording, SHALL NOT make health claims, SHALL NOT use urgency or pressure, and SHALL NOT name any AI model.

#### Scenario: Prices
- **WHEN** the screen opens on a device that can reach Google Play
- **THEN** the displayed prices come from the Play product details, not from the app

#### Scenario: Restore
- **WHEN** a member taps "Restore purchases" on a new phone
- **THEN** the app asks Google Play for existing purchases and the server re-verifies them

#### Scenario: Play unavailable
- **WHEN** Google Play cannot be reached
- **THEN** the screen says so and the rest of the app is unaffected
- **AND** the plan comparison and the status from the server are still shown, without prices or Subscribe buttons

### Requirement: Limit messages
When a limit stops an action, the app SHALL show a short upgrade sheet with a fixed neutral message naming the limit and one line about what Ormma Family includes, with "See plans" (opens the Subscription screen) and "Not now", and SHALL NOT block any other action.

#### Scenario: Second parent on the free plan
- **WHEN** a free owner taps Add a parent
- **THEN** a sheet says the free plan includes one parent and offers See plans and Not now

#### Scenario: Third member on the free plan
- **WHEN** a free owner invites a third member to a parent
- **THEN** a sheet says the free plan includes two members per parent and offers See plans and Not now

#### Scenario: Not now
- **WHEN** the person taps Not now
- **THEN** the sheet closes and nothing else changes

#### Scenario: Safety unaffected
- **WHEN** the sheet is open or dismissed
- **THEN** alerts, the Call buttons and every other action work as before

## ADDED Requirements

### Requirement: Free trial
The app SHALL show a free trial only when Google Play returns a trial offer for the product to this account, using the length and the price after the trial exactly as Play gives them. It SHALL NOT invent, extend or promise a trial, and an account that is not eligible SHALL see the plain price.

#### Scenario: Trial offered
- **WHEN** Google Play returns a 7-day free offer for the monthly product
- **THEN** the screen says "7 days free, then" followed by the Play price, before the Subscribe button

#### Scenario: Not eligible
- **WHEN** Google Play returns no trial offer
- **THEN** the screen shows the plain price and no trial wording

### Requirement: Plan comparison and best value
The screen SHALL compare Free and Ormma Family on parents and members per parent, and SHALL state that check-in calls for every dose time, alerts and the Call buttons are included on every plan. When both Play prices are in the same currency and the yearly plan costs less than twelve months, the yearly plan SHALL carry a "Best value" mark with its monthly equivalent and the saving, both computed from the Play prices. Before the Subscribe buttons the screen SHALL state each plan's price, that it renews until cancelled, and "Cancel anytime in Google Play".

#### Scenario: Comparison
- **WHEN** the screen opens
- **THEN** Free shows 1 parent and 2 members per parent, Ormma Family shows 3 parents and 6 members per parent, and both state that every dose time is called

#### Scenario: Best value
- **WHEN** Play returns 299 and 2999 rupees for monthly and yearly
- **THEN** yearly shows Best value, about 250 rupees per month and a saving of 16 percent

#### Scenario: Different currencies or no saving
- **WHEN** the two prices are in different currencies or the yearly price is not lower
- **THEN** no saving and no Best value mark is shown

#### Scenario: Terms before purchase
- **WHEN** the Subscribe buttons are visible
- **THEN** the price, the renewal term and "Cancel anytime in Google Play" are visible above them

### Requirement: Subscription status
The screen SHALL show one status line from the server entitlement: "Free trial until <date>", "Renews on <date>", "Cancelled. Ormma Family stays active until <date>.", a payment problem for grace or hold with a "Fix in Google Play" button that opens the Play subscriptions page, or the ended message. The status SHALL come from the server record and SHALL NOT be derived from the app's own purchase result alone.

#### Scenario: Renewing
- **WHEN** the entitlement is active, auto-renewing and not a trial
- **THEN** the screen says Renews on its expiry date

#### Scenario: Trial
- **WHEN** the entitlement is a trial
- **THEN** the screen says Free trial until its expiry date

#### Scenario: Cancelled
- **WHEN** the entitlement is cancelled and not yet expired
- **THEN** the screen says it stays active until the expiry date and shows no renewal

#### Scenario: Payment problem
- **WHEN** the entitlement has a grace or hold payment issue
- **THEN** the screen says there is a problem with the payment and shows Fix in Google Play

#### Scenario: Old entitlement
- **WHEN** the entitlement has none of the new fields
- **THEN** the screen shows the active-until or ended line as before

### Requirement: Entitlement records the phase
When Cloud Functions verify a purchase or apply a Play notification they SHALL also record whether the subscription is a trial, whether it auto-renews, and whether it has a payment issue (grace or hold), from the Google Play response. These fields SHALL be written only by Cloud Functions, SHALL NOT change what the plan limits are, and SHALL NOT include the purchase token or order details.

#### Scenario: Grace period
- **WHEN** Google reports the subscription in its grace period
- **THEN** the entitlement stays active and records a grace payment issue

#### Scenario: Account hold
- **WHEN** Google reports the subscription on hold
- **THEN** the entitlement records a hold payment issue and the plan limits follow the existing rules

#### Scenario: Client cannot write it
- **WHEN** a client tries to write any of these fields
- **THEN** the write is denied

### Requirement: Commercial wording
All text on the Subscription screen and the upgrade sheet SHALL be fixed catalogue text that is calm and factual: no countdown, no "limited time", no scarcity, no guilt or pressure, no health claim, no mention of a missed dose, and no coral colour. Safety features SHALL never appear as something a paid plan unlocks.

#### Scenario: No pressure
- **WHEN** the screen or the sheet is shown
- **THEN** it contains no countdown or urgency wording and does not use the coral colour
