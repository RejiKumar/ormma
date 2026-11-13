# Design

## Context

See proposal.md. Observed today: `playBilling.getProducts` takes the first offer that has a token and shows only `displayPrice`. `SubscriptionDoc` has `status`, `productId`, `expiresAt`, `tokenHash`, `updatedAt`. `statusFromPlayState` maps `IN_GRACE_PERIOD` to active and `ON_HOLD` and `PAUSED` to expired. `planFor` uses only status and expiry. The app reads its own entitlement with `useSubscription`. Limit errors surface as a `failed-precondition` and a text line in AddParent and Invite.

## Goals / Non-Goals

**Goals:** a screen that shows the plan, the price and the terms before purchase; a trial only when Play offers one; status the person can act on; an upgrade sheet at limits.

**Non-Goals:** changing limits, grace, prices or product ids; iOS; anything that gates safety.

## Decisions

1. **Server records the phase; limits stay as they are.** Add optional `trial`, `autoRenew` and `paymentIssue` ("grace" | "hold" | null) to the entitlement, derived from the Play subscription response when the server verifies a purchase or applies a Play notification. `status` and `planFor` keep their meaning, so no limit changes. The app never derives a phase from its own clock alone.
2. **Detecting a trial.** The trial offer is created in Play Console with the offer tag `trial`; the server marks `trial` when the line item's offer details carry that tag and the period has not yet renewed. To be proved at the first test purchase (open question).
3. **Choosing the offer in the app.** For each product the app looks at the offers Google returns. If an offer's first pricing phase is free (price 0), it is the trial offer and is used, because Google returns it only to eligible accounts. Otherwise the base offer is used. The displayed terms come from the pricing phases: trial length from the billing period (for example P7D means 7 days), then the recurring price.
4. **Best value is arithmetic on Play's numbers.** Monthly equivalent is the yearly price divided by 12, saving is one minus yearly over twelve times monthly, shown only when both prices are in the same currency and the saving is above zero. Formatting uses the currency code from Play.
5. **Terms before the button.** Under the plan cards, one fixed line per plan: price, "renews each month/year until you cancel", "Cancel anytime in Google Play". With a trial: "7 days free, then <price> per month". No countdown, no "limited time", no coral.
6. **Status block.** One line chosen from the entitlement: trial ("Free trial until <date>"), renewing ("Renews on <date>"), cancelled ("Cancelled. Ormma Family stays active until <date>."), grace ("There is a problem with your payment. Update it in Google Play to keep Ormma Family."), hold (same with "paused"), ended ("Ormma Family ended on <date>. The free plan limits apply after 7 days." as today), with a "Fix in Google Play" button for the two payment states. The button opens the Play subscriptions page for this app.
7. **Upgrade sheet.** A bottom sheet used by AddParent and Invite when the server answers a plan limit. It names the limit, gives one benefit line, and has See plans (opens Subscription) and Not now. It is dismissible, appears once per attempt, and never covers safety screens. The existing neutral message stays as the sheet's text, so there is one source of wording.
8. **Play unavailable.** The screen keeps the plan comparison and status (from the server entitlement), shows the existing "Google Play is not available right now" banner, and hides Subscribe and prices.

## Risks / Trade-offs

- **Trial detection depends on how the offer is set up in Play Console.** Mitigation: the tag is documented in the release notes and the first test purchase is a task.
- **A real purchase cannot be tested from a sideloaded build.** It needs the Play-installed internal-testing build and a licence tester. Mitigation: the app logic is unit tested with a fake billing layer, the server with a fake Play client, and the phone check is its own task.
- **Account hold currently maps to the free plan at once** (existing behaviour, `expired` status). This change shows the problem and the fix button but does not change it; recorded as an open question.

## Migration Plan

Deploy functions first (new fields are optional; old entitlements without them render as plain active or ended), then the app. Existing subscribers see no trial and no payment issue until their next notification.

## Open Questions

- Trial on both plans or yearly only (default here: both).
- Whether account hold should keep the 7-day grace (not changed here).
- Confirm at the first test purchase that the offer tag reaches the Play response.
