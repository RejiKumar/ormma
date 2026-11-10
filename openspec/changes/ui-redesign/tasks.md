# Tasks

Sections 1 to 5 keep the four BRD tabs and need no backend change. Section 6 (Insights and the header bell) starts only after the user confirms replacing the Escalation tab. Run mobile checks from `mobile/`: `npx jest`, `npx tsc --noEmit`, `npx eslint src`.

## 1. Design foundations

- [x] 1.1 Add `IllustrationFrame` and the first five illustrations (welcome 1, 2, 3, empty parents, empty medicines) in `mobile/src/illustrations/`, colours from tokens only, each with a catalogue description or a decorative flag. Verify: component tests render each in light and dark and assert the accessibility label or hidden flag.
- [x] 1.2 Extend `designRules.test.ts` to fail on coral or a literal colour in `src/illustrations`. Verify: the test fails on a deliberately bad fixture and passes on the real files.
- [x] 1.3 Extend `EmptyState` with an optional `illustration` and keep `action`; update its test for the illustration-then-text-then-action order. Verify: `npx jest src/components/EmptyState`.
- [x] 1.4 Add the screen-transition preset and the content cross-fade to `design/motion.ts`, skipped under Reduce Motion. Verify: motion tests assert durations of 150 to 300 ms and no animation with Reduce Motion on.
- [x] 1.5 Add any new tint or surface tokens to both themes and declare every new foreground pair in `contrastPairs()`. Verify: `npx jest src/design/contrast.test.ts` passes, and fails when a pair is removed.

## 2. Welcome intro and sign-in

- [x] 2.1 Build the `Welcome` screen: three steps from `en.json`, Next and Skip, disclaimer visible, 48 dp controls, step change skipped under Reduce Motion. Verify: screen tests cover first, middle and last step, Skip, Finish and the accessible reading order.
- [x] 2.2 Store `ormma.welcomeSeen` in AsyncStorage and gate `RootNavigator` on it, with no flash of sign-in while it loads. Verify: tests for first launch, seen, and a storage read failure that falls back to showing the intro once.
- [x] 2.3 Add the "Show welcome again" row to the end of the Appearance section in Settings and the `Welcome` route in the Family stack that returns to Settings on finish. Verify: `settings.test.tsx` covers the row and the return.
- [x] 2.4 Restyle `LoginScreen` and `OtpScreen` with the Ormma mark and one illustration, keeping the existing validation, error messages and the single primary action. Verify: existing `LoginScreen` and `OtpScreen` tests pass unchanged apart from new elements.
- [x] 2.5 Scan all new intro and sign-in strings for medical advice or judgement wording. Verify: the existing wording and design-rules tests include the new catalogue keys and pass.

## 3. Empty states and first-parent checklist

- [x] 3.1 Add the first-parent checklist card derived from `useParents`, `useMedicines` and `useMembers`, owner-only, no writes. Verify: tests for brand-new account, parent without medicine, first medicine added (hidden), and a non-owner member (hidden).
- [x] 3.2 Replace the Today "Nothing here yet" state with the illustrated empty state, the checklist and "Add a parent" as the one primary action. Verify: `TodayDashboardScreen.test.tsx` covers the no-parent account, a parent with no events today (unchanged), and that the disclaimer shows.
- [x] 3.3 Give the Medicines and Family empty states an illustration and an action that opens the add screen for owners only. Verify: `MedicinesListScreen.test.tsx` and `FamilyListScreen.test.tsx` cover owner action and no action for other roles.
- [x] 3.4 Confirm no empty state uses coral or warning wording. Verify: the design-rules coral scan and wording tests pass.

## 4. Depth and polish

- [x] 4.1 Refine the Today layout so the hero card is the largest, first element, with consistent card and hero elevation and tinted section blocks. Verify: tests assert hero-first order; screenshots on the OnePlus phone and the tablet attached to the change notes.
- [x] 4.2 Apply the screen transition to stack screens and the cross-fade from skeleton to content on Today, Medicines and Family. Verify: tests assert the content appears after loading and that Reduce Motion applies it instantly.
- [ ] 4.3 Review every redesigned screen in the dark theme (hairline borders, no shadow, token colours). Verify: a dark-theme screenshot of each redesigned screen reviewed, and the contrast test green.
- [ ] 4.4 Check layout at 800x1280 and 1080x2400 and at 1.3 times font scale. Verify: screenshots from the tablet and the phone show no clipped text and no overlapping controls.

## 5. Verification and release of sections 1 to 4

- [x] 5.1 Run the full mobile suite, typecheck and lint. Verify: `npx jest`, `npx tsc --noEmit` and `npx eslint src` all pass.
- [ ] 5.2 Update the Appium suite and `docs/E2E-TEST-PLAN.md` for the welcome step and the empty Today. Verify: `node e2e/run.mjs` passes on a build.
- [x] 5.3 Record non-obvious decisions in `docs/DECISIONS.md` and update `docs/design-system.md` for `IllustrationFrame` and the new motion presets. Verify: the entries exist and the component table lists `IllustrationFrame`.
- [ ] 5.4 Build the release bundle, install on the OnePlus phone and the tablet, and walk first launch, sign-in, the empty Today, add a parent and Settings in light and dark. Verify: a short checklist of screenshots, with any defect fixed or logged.

## 6. Insights tab and header bell (only after the user approves replacing Escalation)

- [ ] 6.1 Add `useAdherenceWindow(parentId)`: a 7-day `doseEvents` query clamped to the member's visible-from date, reduced to taken and scheduled counts per day. Verify: unit tests for full week, partial consent window, no events, and a test that no write or log occurs.
- [ ] 6.2 Add an emulator rules test that a viewer's clamped 7-day query succeeds and an unclamped one is denied, with `firestore.rules` unchanged. Verify: the emulator test passes and `git diff firestore.rules` is empty.
- [ ] 6.3 Build the Insights screen: counts, per-day strip with icon and label, latest `weekly_summary` and `trend_flag` text with date, empty state, no timing statement, no judgement words. Verify: screen tests plus a wording test over the Insights catalogue strings.
- [ ] 6.4 Replace the Escalation route with Insights in `routes.ts` and the tab bar, and move the unread dot to a header bell that opens the `Alerts` screen containing the alerts list, `EscalationTimeline` and `ContactsBlock`. Verify: navigation tests for the tab set, the bell, back navigation and the dot with reduced motion.
- [ ] 6.5 Re-check push taps and the Today hero's "See what Ormma tried" button against the new route. Verify: `usePushMessages` and Today tests pass, and an on-device tap of a test push opens the Alerts screen.
- [ ] 6.6 Update the specs listed under Spec changes through archive, and note the tab change in `docs/DECISIONS.md`. Verify: `openspec validate ui-redesign` passes.

## Workflow follow-up

- Wait for the user's OK on this proposal before `/opsx:apply`.
- After sections 1 to 5 are verified on devices, ask for the decision on section 6.
- `/opsx:archive` after the user accepts the build.
