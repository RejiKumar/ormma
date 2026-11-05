# Design

## Context

Observed today: parents are created only by the `createParent` callable (the client cannot create them), invites by `createInvite` and redeemed by `redeemInvite` (a transaction), calls by `dispatchDueCalls` (every minute; selects pending events due now, `planCallGroups` applies the eligibility gates), and missed doses by `missedDoseChecker`. Parent documents carry `createdBy`, which is the owner. The `users/{uid}` rule whitelists exactly four fields (`displayName`, `phone`, `fcmTokens`, `createdAt`), so any extra field there would make the user's own updates fail. Secrets live in Secret Manager and are declared per function. No billing library or payment code exists. See proposal.md for motivation, tiers and the user's decisions.

## Goals / Non-Goals

**Goals:**
- A server-enforced free and paid plan with Google Play Billing, never gating safety features.
- No raw purchase token or service account key outside Secret Manager.
- Downgrades never delete data.

**Non-Goals:**
- iOS billing, promo codes, clinic invoicing, web checkout, in-app price changes, tax handling.

## Decisions

1. **Separate entitlement document.** `subscriptions/{uid}` (not a field on `users`): rules read for the owner only, `write: false`. Alternative rejected: a field on `users/{uid}`, because the existing whitelist rule would lock the user out of their own profile updates, and loosening it would let clients write it.
2. **Verification with the Play Developer API.** `verifyPurchase(productId, purchaseToken)` calls `purchases.subscriptionsv2.get` for the app's package (`com.ormma.app`) with a service account whose key is the Secret Manager secret `PLAY_SERVICE_ACCOUNT_JSON`; it checks the package, the product against an allow-list of the two product ids, and that the token is not already linked to another uid; it acknowledges the purchase (required within 3 days or Google refunds it), then writes the entitlement. The Play call sits behind a small `PlayClient` interface so tests use a fake.
3. **Token hash for lookups.** Real-time Developer Notifications carry the purchase token; the handler hashes it (SHA-256) and finds the entitlement by `tokenHash` (a single-field query, indexed by default), so the raw token never needs storing.
4. **RTDN handler.** A Pub/Sub-triggered function (`playBillingEvents`) on a topic Google publishes to. It maps notification types (renewed, recovered, cancelled, expired, on hold, revoked, refunded) to `status` and `expiresAt` by re-reading the subscription from Google, not by trusting the message body. Handlers are idempotent (the same message twice leaves the same document).
5. **Plan resolution.** One pure function `planFor(entitlement, now)`: paid when status is active or cancelled and `now < expiresAt`, or within 7 days after `expiresAt` for expired or cancelled; refunded is free at once; otherwise free. Used by every enforcement point and unit tested at the boundaries.
6. **Limit enforcement points** (all server side): `createParent` counts parents where `createdBy == uid`; `createInvite` and `redeemInvite` count `members` plus unused unexpired invites of the parent, using the plan of the parent's owner (`parent.createdBy`); `dispatchDueCalls` resolves each due parent's owner plan once per run (cached per run), numbers the parent's distinct dose times of the local day, and flags events beyond the second as `callSkipped: "plan"`.
7. **Plan-skipped doses stay pending.** This is the delicate choice. Marking a skipped dose `missed` would tell the family "not confirmed" when no call was ever placed; so `missedDoseChecker` ignores `callSkipped` events, and the dose card shows it as scheduled with a fixed note ("No check-in call on the current plan"). Risk: a family might read "scheduled" for a dose that has passed as fine. Mitigation: the note, the family can mark the dose taken, and the Subscription screen explains the limit; this is listed in the review questions below.
8. **Paused parents.** When an owner has more parents than the free limit allows and no active plan, the oldest parent keeps calls and the others are paused: the dispatcher flags all their events `callSkipped: "plan"`, and their screens show a fixed note with a link to the Subscription screen.
9. **App billing library.** Assumed `react-native-iap` (Play Billing 7 support) with a dev client rebuild; confirm compatibility with Expo SDK 58 and React Native 0.88 on the first task and switch to `expo-iap` if it fails. The app only fetches products and starts the purchase flow, sends the token to `verifyPurchase`, and finishes the transaction after the server confirms. It reads the plan from `subscriptions/{uid}` for display only; limits are decided by the server.
10. **Messages.** Fixed English strings in the catalogue; a test scans them for advice, judgement, safety-claim and urgency words and AI model names.
11. **Cost guard.** The per-call cost figure in the proposal is an assumption; the pre-launch checklist gets a task to replace it with Exotel's real rate card and to re-check the free limits against it.

12. **Settings.** One `SettingsScreen` in the Family stack, opened from a Settings row at the top of Family. Appearance uses the existing `ThemeProvider.setPreference`. Legal text lives in `mobile/src/legal/` as English section lists with the hosted URLs from config; a test checks every in-app paragraph also appears in `docs/PRIVACY-POLICY.md` or `docs/TERMS.md` so the two cannot drift. The hosted URL constants are placeholders until the pages are published (a release task).
13. **Account deletion.** `deleteMyAccount` callable: refuses with a clear message while the caller is the owner of any parent (the app lists them and points to Delete parent), otherwise removes the caller's member documents, `users/{uid}`, `subscriptions/{uid}`, pending invites they created, and finally the Auth user. It never touches other members' data. The Play subscription itself is cancelled by the user in Google Play (the screen links there).

## Risks / Trade-offs

- Plan-skipped doses (decision 7) may be misread; flagged for review before apply.
- Unit economics: three parents with many dose times can cost more than ₹299 a month; the free limits are conservative but the paid plan has no call cap. A later change can add a fair-use cap.
- Real purchases cannot be tested on the emulator; verification logic is tested with a fake Play client, and the end-to-end flow needs a physical phone, a licence tester and a Play testing track build. This is a release-time check, listed in the tasks.
- Play policy: digital subscriptions must use Play Billing (satisfied); the store listing and Data safety form must declare purchases; Play may require a visible subscription terms and cancellation link on the screen.
- The service account needs the Play Console "view financial data" and "manage orders and subscriptions" permissions; a wrong role shows up as verification failures, so the release steps spell it out.
- Terms and conditions are a draft that needs legal review before publishing; the in-app text is only as good as that review.
- Free-tier abuse (creating new accounts to reset limits): accepted for now; limits are per owner phone number, which already requires SMS verification.

## Open Questions for review

1. Are two call groups per day for one free parent the right free limit, or should the free plan be a time-limited trial instead?
2. Is showing a skipped dose as "scheduled" with a note acceptable, or should it have a distinct label such as "No call on this plan"? (The proposal assumes the latter label text is shown as a note under the badge.)
3. Confirm Exotel's per-call price so the limits can be tuned before launch.
