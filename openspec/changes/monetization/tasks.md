# Tasks

## 1. Shared model and plan logic

- [x] 1.1 `shared/types.ts`: `SubscriptionDoc`, `callSkipped` on `DoseEventDoc`
- [x] 1.2 Pure `planFor(entitlement, now)` with limits table (parents, members, daily call groups) and unit tests at the boundaries: active, cancelled until the period ends, expired day 3 and day 8 (grace), refunded, none
- [x] 1.3 Pure helper that numbers a parent's distinct dose times of the local day and returns which are within the free cap, with unit tests (timezone, duplicate times, retries)

## 2. Rules and data

- [x] 2.1 `firestore.rules`: `subscriptions/{uid}` readable by its owner, `write: false`; `callSkipped` is server-only (client dose updates cannot touch it)
- [x] 2.2 Emulator tests (own read, other read denied, every client write denied, client dose update with `callSkipped` denied), update `scripts/mutation-check-rules.mjs` and `docs/rules-test-coverage.md`, run `npm run test:rules` and `npm run test:rules:mutations`

## 3. Cloud Functions: billing

- [x] 3.1 `PlayClient` interface plus the real implementation using the Play Developer API (`subscriptionsv2.get`, acknowledge) with the `PLAY_SERVICE_ACCOUNT_JSON` secret; fake client for tests
- [x] 3.2 `verifyPurchase` callable: auth, product allow-list, package check, token not linked to another uid, acknowledge, write entitlement with `tokenHash`; logs uid and status only
- [x] 3.3 `playBillingEvents` Pub/Sub handler: re-read from Google, map to status and expiry, find by `tokenHash`, idempotent
- [x] 3.4 Function emulator tests with the fake client: valid, invalid token, wrong product, foreign account, duplicate message, refund, renewal, no token in the stored document or in log lines

## 4. Cloud Functions: enforcement

- [x] 4.1 `createParent`: refuse above the owner's parent limit with a plan error code
- [x] 4.2 `createInvite` and `redeemInvite`: member limit including unused invites, race-safe inside the transaction
- [x] 4.3 `dispatchDueCalls`: resolve the owner's plan once per run, flag events beyond the free cap and events of paused parents `callSkipped: "plan"`, never call them; idempotent
- [x] 4.4 `missedDoseChecker`: ignore `callSkipped` events and create no alert for them
- [x] 4.5 Export includes the entitlement and delete removes it (`exportDelete`); emulator tests for every enforcement point and for urgent and missed-dose alerts on the free plan

## 5. App

- [x] 5.1 Confirm the billing library works with Expo SDK 58 and React Native 0.88 (else use `expo-iap`), add it, rebuild the x86_64 dev client, and record the result in the decisions log
- [x] 5.2 `useSubscription` (reads `subscriptions/{uid}`) and a billing wrapper (product details, purchase, restore) behind an interface so screens are tested with a fake
- [x] 5.3 Subscription screen from Family: plan and end date, monthly and yearly prices from Play, Subscribe, Manage in Google Play, Restore purchases, Play-unavailable state; fixed neutral strings in the catalogue
- [x] 5.4 Plan error handling in Add a parent and Invite (fixed message, link to the Subscription screen); dose card note and paused-parent note for `callSkipped`
- [x] 5.5 Component tests for every state; wording test over the new strings (no advice, judgement, safety-claim, urgency or AI-model words)

## 5b. Settings

- [x] 5b.1 `deleteMyAccount` callable and emulator tests: refuses while owning a parent, removes member docs, user doc, entitlement and created invites, deletes the Auth user, leaves other members' data
- [x] 5b.2 `SettingsScreen` (Family stack, opened from a Settings row in Family): Account (phone, display name edit, plan and link, sign out moved here, delete account with confirmation), Appearance (Light, Dark, System, remembered), Privacy policy, Terms and conditions
- [x] 5b.3 `mobile/src/legal/` privacy and terms sections plus hosted URL config; reader screen; test that every in-app paragraph appears in `docs/PRIVACY-POLICY.md` or `docs/TERMS.md`
- [x] 5b.4 Component tests for each section, theme choice persistence, sign out, and delete account refusal and success

## 6. Docs and release

- [x] 6.0 New `docs/TERMS.md` draft (service description, no medical advice, subscriptions and refunds through Google Play, acceptable use, liability, changes, governing law placeholder) marked for legal review
- [x] 6.1 `docs/PRIVACY-POLICY.md` and the Data safety and payments declarations in `docs/RELEASE.md`
- [x] 6.2 `docs/RELEASE.md`: Play Console subscription setup (two products with the chosen prices, base plans, free-tier wording, service account and its permissions, Pub/Sub topic and notification subscription, licence testers, testing track upload)
- [x] 6.3 `docs/PRELAUNCH-CHECKLIST.md`: replace the assumed per-call cost with Exotel's rate card and re-check the limits; test a real purchase, a cancellation, a refund and a restore on a physical phone
- [x] 6.4 `docs/DECISIONS.md`: model, price, plan limits, entitlement document, plan-skipped doses stay pending, grace period

## 7. Verification

- [x] 7.1 `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:fns`, `npm run test:rules`
- [x] 7.2 Run on `flutter_emulator` with the Functions emulator and a seeded entitlement document: free and paid states of the Subscription screen, limit messages, paused-parent and skipped-dose notes; fix problems found
- [x] 7.3 Commit to `main`
