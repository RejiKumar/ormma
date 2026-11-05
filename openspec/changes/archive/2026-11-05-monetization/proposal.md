# Proposal

## Why

Every check-in call costs real money (Exotel telephony, Google speech, Claude), and the app has no revenue, pricing or payment code. Before scaling beyond a pilot the app needs a revenue model that covers those costs without ever putting a family's safety behind a paywall.

**Scope note.** The approved BRD (`ormma-family-companion-brd.md`) does not mention monetization; it lists pharmacy payments as a later phase. This change is an **addition explicitly requested by the user on 2026-11-05**, not a BRD requirement. The user chose: a free tier plus a paid subscription, ₹299 per month or ₹2,999 per year per family, sold through Google Play Billing used directly (no RevenueCat).

## What Changes

- **Plans.** Free and "Ormma Family" (paid). Assumed limits, for review:

  | | Free | Ormma Family |
  | --- | --- | --- |
  | Parents the owner can have | 1 | 3 |
  | Members per parent (owner counts) | 2 | 6 |
  | Check-in call groups per parent per day | 2 (the first two dose times of the local day) | Unlimited |
  | Evening digest push, notification preferences | Included | Included |
  | Family app, dose cards, escalation view, urgent and missed-dose alerts | Included | Included |

  Justification: one call group costs roughly ₹5 to ₹10 (an assumption to confirm with Exotel's rate card); two groups per day for one parent is about ₹300 to ₹600 a month, so the free tier is a deliberate loss-leader limited to one parent, while the paid plan at ₹299 covers up to three parents' regular schedules only if most doses fall in one or two call groups, which is the main commercial risk (see design).
- **Entitlement is server-side.** A new document `subscriptions/{uid}` (status, product id, expiry, a hash of the purchase token, never the raw token) is written only by Cloud Functions. Clients can read their own and never write it.
- **Functions.** `verifyPurchase` (callable: checks a purchase with the Google Play Developer API, acknowledges it, writes the entitlement), `playBillingEvents` (Pub/Sub handler for Play Real-time Developer Notifications: renew, cancel, expire, refund), and server-side limit checks in `createParent`, `createInvite`, `redeemInvite` and `dispatchDueCalls`.
- **App.** A Subscription screen reachable from Family: current plan, price as returned by Google Play, Subscribe (monthly or yearly), Manage in Google Play, Restore purchases, and fixed neutral limit messages. Uses a Play Billing library (assumed `react-native-iap`; its compatibility with Expo SDK 58 and React Native 0.88 must be confirmed at implementation, with `expo-iap` as the fallback), which adds a native module, so the Android dev client is rebuilt.
- **Grace and downgrade.** After a subscription ends there is a 7-day grace period; after that the free limits apply. Nothing is ever deleted: extra parents, members and medicines stay visible. Only new additions are blocked, and calls are paused for parents above the free limit.
- **Safety is never gated.** Urgent-keyword alerts, missed-dose alerts to the family, the escalation view and the Call buttons work the same on every plan.
- **Settings (added by the user on 2026-11-05, also outside the BRD).** A Settings screen reachable from Family with four sections: **Account** (phone number, display name, subscription plan with a link to the Subscription screen, sign out, delete account), **Appearance** (Light, Dark, System; the theme preference already exists, only its screen was the removed gallery), **Privacy policy** and **Terms and conditions** (read in the app and open the hosted page). Sign out moves from the Family list into Account. Google Play requires apps that create accounts to offer in-app account deletion, so Account includes "Delete account" backed by a new `deleteMyAccount` function that refuses while the user still owns a parent.
- **Docs.** Privacy policy, terms (new `docs/TERMS.md`, a draft for legal review), the Play Data safety and payments declarations, and `docs/RELEASE.md` (create the subscription products, service account, Pub/Sub topic, license testers).

**Spec changes** (security rules and call flow are in the review list):

| Requirement | Old behaviour | New behaviour | Spec file |
| --- | --- | --- | --- |
| Subscription path rule (new) | No such data | `subscriptions/{uid}` readable by its owner, never written by clients | access-control |
| Entitlement document (new) | None | Fields and meanings of the entitlement | data-model |
| Purchase data (new) | None | Hash only, in export, deleted with the account, never logged | data-protection |
| Free-tier call cap (new) | Every eligible dose gets a call | A free parent gets call groups only for the first two dose times of the day; the rest are flagged as not called by plan | call-flow |
| Alerts are never gated (new) | n/a | Urgent and missed-dose alerts to the family are sent on every plan; doses skipped by plan are not reported as missed | missed-dose-alerts |
| Member limit (new) | Unlimited members | 2 free, 6 paid, enforced on invite creation and redemption | family-circle |
| Safety is not for sale (new) | n/a | No safety feature depends on a plan | medical-safety |
| Plans and entitlement (new capability) | n/a | Tiers, limits, grace, restore, verification | subscription |
| Settings (new capability) | No settings screen; theme only in the removed dev gallery | Account, Appearance, Privacy policy, Terms; account deletion | settings |

Out of scope: iOS billing, editing the phone number, deleting an account that still owns parents (it must delete them first), promo codes, clinic invoicing, web checkout, pharmacy payments, changing prices from inside the app, tax invoices (Google Play is the merchant of record and handles tax).

## Capabilities

### New Capabilities

- `settings`: the Settings screen with Account (including deletion), Appearance, Privacy policy and Terms and conditions.
- `subscription`: plans and limits, entitlement lifecycle (purchase, renewal, cancellation, refund, expiry, grace), restore, and the in-app subscription screen.

### Modified Capabilities

- `access-control`: the entitlement document is server-written only.
- `data-model`: the entitlement document and the call-skipped flag on dose events.
- `data-protection`: purchase data in export, delete and logs.
- `call-flow`: free-tier daily call cap in the dispatcher.
- `missed-dose-alerts`: alerts are never gated; plan-skipped doses are not reported missed.
- `family-circle`: member limit per plan.
- `medical-safety`: no safety feature depends on a plan.

## Impact

- Code: `functions/src` (also a new `deleteMyAccount` callable) (new `subscription/` module, changes to `family.ts`, `invites.ts`, `schedule/dispatch.ts`, `schedule/missedDose.ts`, `data/exportDelete.ts`, `index.ts`); `firestore.rules`, emulator tests and the mutation check; `shared/types.ts`; `mobile/src` (Subscription screen, `useSubscription`, limit messages in Add parent and Invite, i18n); `mobile/package.json` and a dev client rebuild.
- Secrets and infrastructure: a Play service account key in Secret Manager, a Pub/Sub topic for Play notifications, Play Console subscription products.
- Testing limit: real purchases cannot be made on the emulator. Functions are tested with a fake Play client; real purchases are tested on a physical phone with a licence tester account and an app build installed from a Play testing track.
