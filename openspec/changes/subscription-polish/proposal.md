# Proposal

## Why

Requested by the user on 2026-11-13 (not in the BRD). The Plan screen works but reads like a settings page: two text cards and two buy buttons. Other Google Play subscription apps show what each plan includes side by side, a free trial, the real price and renewal terms before the buy button, an upgrade sheet at the moment a limit is hit, and a status that says whether the plan renews, is cancelled, or has a payment problem. The server also cannot tell the app these things today: the entitlement records only a status and an end date, and it maps Google's grace period to "active" and account hold to "expired".

## What changes

All four additions were chosen by the user.

- **Free trial.** A 7-day trial offer set up in Play Console. The app reads the offer from Google Play, shows "7 days free, then <price>", and never invents a trial. Google decides who is eligible, so a returning customer simply sees no trial.
- **Paywall with benefits.** The Subscription screen compares Free and Ormma Family side by side (parents, members per parent, call times per day, and "Alerts and Call buttons on every plan"). Prices come from Play. Yearly carries a calm "Best value" mark with its monthly equivalent and the saving, computed from the two Play prices. Price, renewal and "Cancel anytime in Google Play" are shown before the buy button.
- **Upgrade sheet at limits.** When an owner hits the parent or member limit, a short sheet explains the limit and offers "See plans" and "Not now", instead of an error line. Nothing else is blocked.
- **Renewal and status.** The screen shows "Renews on <date>", "Cancelled, active until <date>", "Free trial until <date>", or "Payment problem" with a button that opens Google Play to fix it. To make this possible the server records three more facts when it verifies a purchase or receives a Play notification: whether it is a trial, whether it will renew, and whether there is a payment problem (grace or hold).

The plan limits, the 7-day grace, the safety rules and the product ids and prices do not change.

## Capabilities

### Modified Capabilities
- `subscription`: the Subscription screen, the limit messages, the server's entitlement record, and new requirements for the trial, the plan comparison, the status and commercial wording.

## Spec changes

| Requirement | Old behaviour | New behaviour | Spec file |
| --- | --- | --- | --- |
| Subscription screen | Two text cards, prices, Subscribe, Manage, Restore | Plan comparison, trial and price disclosure before the buy button, status block; same Manage and Restore | `subscription` |
| Limit messages | A fixed message with a link | A short upgrade sheet with See plans and Not now; still never blocks anything else | `subscription` |
| Free trial (new) | None | The app shows only a trial that Google Play returns | `subscription` |
| Plan comparison and best value (new) | None | Side-by-side plans; yearly saving computed from the Play prices | `subscription` |
| Subscription status (new) | Active-until date only | Trial, renews, cancelled, payment problem and ended, each with its date and the right action | `subscription` |
| Entitlement records the phase (new) | status, product, expiry | Also trial, auto-renew and payment issue, written only by Cloud Functions | `subscription` |
| Commercial wording (new) | Partly in the screen requirement | No urgency, countdowns, pressure or coral; terms before purchase | `subscription` |

`firestore.rules` does not change: the entitlement document is already readable by its owner and writable by no client, and the new fields are written by Cloud Functions.

**Out of code, for the user (Play Console):** create a free-trial offer of 7 days on each base plan (new customers only), give it the offer tag `trial`, and keep a licence tester account for the test.

## Out of scope

iOS billing, promo codes and coupons, sharing a plan across Google accounts, price changes, changing product ids or prices, web checkout, and changing the free limits or the 7-day grace.

## Impact

App: the Subscription screen, a new upgrade sheet, AddParent and Invite limit handling, the billing layer (offer details). Server: `functions/src/subscription` (play.ts, entitlement.ts, verify.ts, events.ts) and `shared/types.ts`. Docs: `docs/DECISIONS.md`, `docs/RELEASE.md` (Play Console set-up).
