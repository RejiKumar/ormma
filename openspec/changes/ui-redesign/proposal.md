# Proposal

## Why

The app works but looks plain next to Play Store apps. The user said so on 2026-11-10 after testing on real devices. What a new user sees first is the weakest part: a flat sign-in page, then a Today tab that says "Nothing here yet" with a small grey icon and no next step. The Today hero card, dose ring and status chips already exist (prototype-full-parity); what is missing is a first-run story, warmth, depth and a clear path from an empty account to a first parent.

**Addition requested by the user on 2026-11-10.** The BRD does not mention a visual redesign, so this change is an addition, not a BRD requirement.

## What Changes

1. **Welcome and sign-in.** A three-step intro (what Ormma does, how the calls work, who sees what) shown once, the first time a signed-in user reaches Today. Sign-in gets the Ormma mark, one warm illustration and one line of purpose. No app-language picker yet (see Open questions).
2. **Today.** Keep the existing hero card, ring and timeline. Add a "first parent" checklist card for an account with no parent (add a parent, add a medicine, invite family), shown above an illustrated empty state with one primary action. Refine spacing and the ParentCard so the hero reads as the focal point.
3. **Empty states on every tab.** `EmptyState` gains an illustration slot and a primary action. Today, Medicines, Family and the alerts view each use it with an action that leads somewhere ("Add your first parent", "Add a medicine").
4. **Depth and polish.** Layered surfaces (soft level 1 and 2 shadows, tinted hero shadow), larger rounded cards, more use of the brand sage and its tint, screen-to-screen transitions, skeleton-to-content cross-fade, a reviewed dark theme (hairline borders, lifted sage) checked on every redesigned screen. All motion keeps Reduce Motion support.
5. **Insights tab replaces the Escalation tab (needs the user's explicit OK, see Open questions).** A new Insights tab shows 7-day adherence per parent (computed in the app from dose events the member can already read), the latest weekly summary and trend alerts when they exist, with counts only: no statement about which time of day doses were missed, because the medical-safety rules forbid commenting on dose timing. Alerts move to a bell in the app header with an unread dot. The per-dose call timeline and emergency contacts stay reachable from the bell's Alerts screen. Push taps for alert types open that Alerts screen. This part is separable: tasks 1 to 4 do not depend on it.

Out of scope:
- Any backend, Cloud Functions or `firestore.rules` change, and any new data collection.
- iOS, a new brand identity beyond placing the existing mark, and custom commissioned illustration.
- Translations: the ml, ta and hi catalogues stay empty until reviewed translations exist.
- Photos for parents (Avatar stays initials).
- Changes to call flow, alerts logic, subscription or medical-safety rules.

## Capabilities

### New Capabilities
- `onboarding`: the first-run welcome flow (three intro steps, shown once on the first arrival at Today, skippable) and the first-parent checklist on an empty Today.
- `insights-view`: the Insights tab content (7-day adherence per parent, latest weekly summary and trend alerts, usual missed slot), its wording rules and its empty states. Only created if the user approves item 5.

### Modified Capabilities
- `design-system`: illustration and EmptyState action requirements; layered elevation and screen transition requirements; dark-theme review; the Bottom navigation and Coral usage requirements change if Insights replaces Escalation (tab name, alert dot moves to the header bell).
- `dashboard`: the empty Today state shows the first-parent checklist and an action, not a bare message.
- `escalation-view`: the Alerts tab dot becomes a header bell dot; the escalation timeline and emergency contacts are reached from the bell's Alerts screen. Only if item 5 is approved.

## Spec changes

Medical safety, call flow, consent, access control and AI contracts are untouched.

| Requirement | Old behaviour | New behaviour | Spec file |
| --- | --- | --- | --- |
| Bottom navigation | Tabs Today, Medicines, Escalation, Family; coral dot on the Escalation tab | Today, Medicines, Insights, Family; the coral dot moves to the header bell (only if item 5 is approved) | `design-system` |
| Coral usage | Coral allowed for the Escalation tab alert dot | Coral allowed for the header bell alert dot instead | `design-system` |
| Screen type scale | Applies to the Today, Medicines, Escalation and Family tabs | Names the Insights tab in place of Escalation | `design-system` |
| Alerts tab dot | Pulsing dot on the Alerts tab icon | Same behaviour on the header bell, same accessible label | `escalation-view` |
| Dashboard empty state | A parent with no events shows an empty state | An account with no parent shows a checklist and one primary action; a parent with no events today is unchanged | `dashboard` |
| Core components | EmptyState has icon, title, description, action | EmptyState also takes an illustration; added IllustrationFrame | `design-system` |

**BRD conflict to confirm:** decision #111 records that the BRD has four tabs named Today, Medicines, Escalation and Family. Replacing Escalation with Insights departs from that. Items 1 to 4 keep the BRD tabs. Item 5 is held until the user confirms.

## Open questions

- Replace the Escalation tab with Insights (item 5), add Insights as a fifth tab, or keep Escalation and skip Insights? Recommendation: replace, with alerts on the header bell; a fifth tab crowds a tablet-width bar less but is a bigger BRD departure.
- A "usual missed time slot" insight would be the most useful pattern, but it comments on dose timing, which `medical-safety` forbids. It is left out unless the user explicitly approves it as a change to the medical-safety rules.
- Which Play Store apps should the look reference, and what is liked about them?
- Illustrations: draw simple SVG illustrations in the repo (no licence cost, recommended), or use a licensed set?
- App-language picker: deferred until ml, ta and hi translations exist; confirm.

## Impact

- Mobile only: `mobile/src/screens/{auth,today,alerts,medicines,family,settings}`, `mobile/src/components`, `mobile/src/design`, `mobile/src/navigation`, `mobile/src/i18n/locales/en.json`, new `mobile/src/onboarding` and (if approved) `mobile/src/screens/insights`.
- New dependency: none expected; illustrations are SVG through the existing `react-native-svg`.
- Tests: component, screen and design-rules tests updated; the contrast test must stay green for every new token; Appium suite updated for the new first-run flow.
- Release: a new Android build; no backend deploy.
