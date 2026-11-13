# Tasks

## 1. Server

- [ ] 1.1 Read the trial, auto-renew and payment issue from the Play subscription response and add the optional `trial`, `autoRenew` and `paymentIssue` fields to `SubscriptionDoc` and the entitlement document. Verify: unit tests with fake Play responses for active, trial, cancelled, grace and hold; limits unchanged.
- [ ] 1.2 Write the new fields in `verifyPurchase` and `playBillingEvents`, never the token or order details. Verify: tests for both paths, idempotent notification, and the log lines carry only uid and status.
- [ ] 1.3 Confirm rules: a client write of the new fields is denied and the owner can still read. Verify: emulator rules test.

## 2. Billing layer

- [ ] 2.1 Read each product's offers and pricing phases, pick the trial offer only when Play returns one, and expose the trial length and the price after it. Verify: unit tests with trial, no trial, several offers, and a missing price.
- [ ] 2.2 Add the best-value calculation (monthly equivalent and saving from the two Play prices, same currency only). Verify: tests for 299 and 2999 rupees, different currencies, and no saving.

## 3. Subscription screen

- [ ] 3.1 Build the Free and Ormma Family comparison, the terms lines and the trial wording above the Subscribe buttons. Verify: tests for trial, no trial, best value, Play unavailable (comparison and status still shown), and 48 dp targets.
- [ ] 3.2 Build the status block and the Fix in Google Play button. Verify: tests for renewing, trial, cancelled, payment problem, ended and an old entitlement without the new fields.
- [ ] 3.3 Add catalogue text for everything new. Verify: the i18n guard test and the wording test pass: no urgency words, no coral, no hints.

## 4. Upgrade sheet

- [ ] 4.1 Add the upgrade sheet and use it from AddParent and Invite when the server answers a plan limit. Verify: tests for second parent, third member, See plans, Not now, and that nothing else is blocked.

## 5. Verification

- [ ] 5.1 Run app tests, function tests, emulator tests, typecheck, lint and `openspec validate subscription-polish`. Verify: all pass.
- [ ] 5.2 With the user: set up the 7-day trial offer (tag `trial`) in Play Console, install the Play internal-testing build, and make a test purchase as a licence tester. Verify: trial wording, purchase, status line, cancel, restore and Manage in Google Play on the phone, with any defect fixed or logged.
