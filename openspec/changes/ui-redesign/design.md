# Design

## Context

- Today already has the sage hero card (date, `DoseRing`, one-line status), `StatusChip` timeline, `ParentCard`, `Avatar`, `Skeleton` and `EmptyState`, built in prototype-full-parity from `docs/prototype/ormma-family-companion.html`. Elevation already has five levels in `tokens.ts` (none, card, hero, toast, modal). The redesign therefore adds what is missing, not a rebuild: a first-run story, illustrations, actionable empty states, transitions, and the Insights tab.
- Tabs are declared in `navigation/routes.ts` (`Today`, `Medicines`, `Alerts`, `Family`) and rendered by `AppTabs.tsx`. The unread-alert dot is `AlertDot` fed by `useUnreadUrgentAlertCount`. The header is `components/AppHeader.tsx`.
- A signed-out user sees `AuthStack` (`Login`, `Otp`); a signed-in user sees `ParentsProvider` and `AppTabs` (`App.tsx`).
- The ml, ta and hi catalogues are empty until reviewed translations exist (`docs/design-system.md`); all new strings are added to `en.json` only.
- Dose events are read per parent with a `scheduledFor` range; `firestore.rules` allows each read through `canReadDated`, so a member whose consent window starts mid-week can only query from that start. `family/visibility.ts` already holds that logic.

See `proposal.md` for motivation and scope, and `specs/` for the requirements.

## Goals / Non-Goals

**Goals:**
- A new user understands the app before signing in and reaches a first parent without help.
- Every tab has an empty state that leads somewhere.
- The app feels layered and warm in both themes, with no new dependency and no backend change.
- The Insights tab, if approved, reuses existing readable data.

**Non-Goals:**
- No animation library, no raster assets, no remote image loading.
- No new Firestore collection, field, rule or Cloud Function.
- No parent photos, no new brand identity, no iOS work.

## Decisions

1. **Illustrations are SVG components in `mobile/src/illustrations/`, composed from theme tokens.** Each takes no colour props, reads `useTheme()`, and wraps in `IllustrationFrame`, which sets size, the accessibility label or decorative flag, and the token colours. Alternatives: raster PNGs (no dark theme, larger bundle), Lottie (new dependency, looping animation the spec forbids), a licensed set (cost and licence tracking). `react-native-svg` is already installed for `DoseRing`. A design-rules test scans the illustration sources for coral and for hard-coded colours.

2. **Welcome intro is one screen with a step index, not three routes.** State `step` 0 to 2, text from the catalogue, a Next and a Skip button; the step change is a short opacity spring that is skipped under Reduce Motion. "Seen" is stored in AsyncStorage under `ormma.welcomeSeen`, read before the navigator decides, so there is no flash of Today. Signed out: `RootNavigator` shows `AuthStack` at once. Signed in and not seen: `Welcome`, then the tabs. There is no replay entry in Settings (removed at the user's request on 2026-11-10). Alternatives: a horizontal pager (more code, more gesture and accessibility edge cases), three routes (more navigation state to test).

3. **The first-parent checklist is derived, never stored.** It reads `useParents`, `useMedicines` and `useMembers` and computes the three items. No new write, no new field. It sits in `screens/today` and `screens/medicines`.

4. **Empty states stay one component.** `EmptyState` gains an optional `illustration` and keeps `action`. Callers pass the action; members who cannot add (viewer, editor without add rights) pass none. This keeps the one-primary-action rule.

5. **Depth comes from tokens that already exist plus two additions.** Use elevation `card` and `hero` more consistently, add a tinted section surface (`primaryTint` blocks), and add a screen-transition preset and a content cross-fade to `design/motion.ts`. Both are skipped under Reduce Motion through `useMotion()`. Dark theme keeps hairline borders and no shadow.

6. **Insights is computed on the device from a 7-day dose-event range.** A hook `useAdherenceWindow(parentId)` queries `doseEvents` for the last seven days, clamped to the member's visible-from date through `family/visibility.ts`, and reduces to taken and scheduled counts per day. Weekly summary and trend text come from the alerts the member already reads (`useAlerts`). No Cloud Function, no stored aggregate. Alternative: a server-computed weekly document (new write path and rules, out of scope).

7. **Alerts move behind a header bell only if the user approves item 5.** The bell lives in `AppHeader`, uses `AlertDot`, and opens an `Alerts` stack screen holding today's `AlertsScreen` content (list, `EscalationTimeline`, `ContactsBlock`). `navigationRef.navigate("Alerts")` keeps working because the screen name stays `Alerts`; `pushTarget.ts` needs no change. If the user keeps Escalation, tasks in section 6 are dropped and nothing else changes. Alternative: a fifth tab (smaller departure from the BRD tab names, but a crowded bar on 800 px tablets).

8. **Slot statements are out of Insights.** "Most missed doses fell in the evening" comments on dose timing, which `medical-safety` forbids, so the spec shows counts and per-day entries only.

## Risks / Trade-offs

- [Illustrations look amateur] → Keep them geometric and simple (shapes and soft curves), review in a built screenshot on both themes before merging, and fall back to the icon-only empty state for any screen that does not look right.
- [Insights range query is denied for a member whose consent window starts mid-week] → Clamp the query start to the visible-from date; add an emulator rules test that a viewer's 7-day query succeeds and an over-wide query is denied, with `firestore.rules` unchanged.
- [Replacing the Alerts tab departs from the BRD] → Section 6 is separable and waits for explicit approval; sections 1 to 5 keep the four BRD tabs.
- [Welcome adds friction] → Skippable on every step, shown once, three short steps.
- [More motion hurts low-end phones or users sensitive to motion] → Only springs under 300 ms and one cross-fade; nothing loops; Reduce Motion removes all of it.
- [Contrast regressions from new tints] → Every new foreground token is added to both themes' declared contrast pairs, so `contrast.test.ts` fails before a bad pair ships.
- [Appium and component tests break on moved text] → Update them in the same task as the screen; the e2e suite gets the new first-run steps.

## Migration Plan

1. Land sections 1 to 5 behind no flag; they change screens only and need no data migration.
2. Build a release, install on the OnePlus phone and the tablet, and check light and dark screenshots against the acceptance list in `tasks.md`.
3. Land section 6 (Insights and bell) only after the user's approval; it is one commit range that can be reverted without touching sections 1 to 5.
4. Rollback is a normal app update; no server state changes.

## Open Questions

- Illustration style (flat geometric versus softly shaded): decide after the first welcome-screen draft, answerable without changing specs or tasks.
