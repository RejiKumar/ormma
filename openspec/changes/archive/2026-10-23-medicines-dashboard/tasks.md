# Tasks

Constraints: no change to `firestore.rules` or `firestore.indexes.json`; region asia-south1 only; no health data in logs; all new UI strings go through i18n (`en.json`) so the lint rule stays green; tokens only, no literal colours; the medical-safety disclaimer stays on screens via `DisclaimerFooter`/`Screen`; viewers get no edit controls; manual medicines are `source: "manual"`, `confirmedByHuman: true`; deactivation writes `active: false`, never a delete.

## 0. Status tokens (user-approved extension)

- [x] 0.1 Extend `StatusKey` with `not_taken` and `no_answer`: colour triples in light + dark tokens (WCAG-checked, coral stays missed-only), distinct icons (`minusCircle`, `phoneOff` in `Icon.tsx`), `STATUS_ICON` entries, i18n labels in `en.json`; design-system spec delta; update `designRules.test`/`contrast.test`/`StatusChip.test`/gallery status lists. Verify: `npx jest src/design src/components/StatusChip.test.tsx src/i18n src/screens/screens.test.tsx` green and `npm run typecheck` clean.

## 1. Pure helpers

- [x] 1.1 `src/family/visibility.ts`: consent-aware date-range helper `visibilityRanges(role, consent, windowStart, windowEnd, field)` returning 0–2 half-open ranges (owner/no revocation → one window; revoked → `< min(end, revokedAt)`; revoked+regranted → both branches; non-owner without consent map → none). Verify: unit tests covering every branch, including that the revoked branch uses strict `<` exactly as `functions/test/rules/paths.test.ts:448-465` proves, and that a missing consent map yields zero ranges.
- [x] 1.2 Same module: `localDayWindow(timezone, nowMs)` returning the parent-local `[start, end)` epoch range via `Intl.DateTimeFormat` with `Asia/Kolkata` fallback, plus `localDateKey`. Verify: unit tests for Asia/Kolkata day boundaries (UTC rollover at 18:30/00:00 UTC edge), and a fallback test with `Intl` throwing.

## 2. Data hooks

- [x] 2.1 Extend `useParents` to carry `timezone` and the raw `consent` map (`status`, `revokedAt`, `regrantedAt`) on `FamilyParent`. Verify: `useParents.test.tsx` asserts a snapshot doc with timezone/consent maps through, with `Asia/Kolkata` as default timezone and `null` consent fields when absent.
- [x] 2.2 `useMedicines(parentId)` realtime hook over `parents/{id}/medicines` ordered by name. Verify: hook test — subscription registered, snapshot maps fields (name, doseText, times, startDate, active, source, confirmedByHuman), unsubscribe on unmount.
- [x] 2.3 `useTodayEvents(parents, now)` and `useAlerts(parents, window)` - one hook over all of the member's parents (`DatedParent` = `{id, timezone, consent, role}` from `useParents`); today's events use each parent's own timezone day window (`localDayWindow(timezone, now)`), alerts use a recent `{start, end}` window. Each hook issues 0-2 `onSnapshot` queries per parent from task 1.1 and merges results: events grouped per parent sorted asc, alerts globally `createdAt desc` limited to 20. Zero ranges - no query, empty result. Verify: hook tests - owner issues one query per parent and merges a re-granted pair of queries; viewer with revoked consent issues the `<`-bounded query; viewer whose parent has no consent map never calls `onSnapshot` and returns empty.

## 3. Dashboard screen

- [x] 3.1 Today tab dashboard: per-parent sections of today's events with `StatusChip` per event, recent alerts list (type + template message, newest first), `EmptyState` when a parent has no events today, `DisclaimerFooter` at the bottom. Verify: component tests — mixed statuses render the right chips, disclaimer text visible, empty parent shows empty state, alert list renders newest first, realtime emit swaps a chip without reload.
- [x] 3.2 Wire the Today tab to the dashboard (replace placeholder), add all i18n keys, role parity (dashboard is read-only for every role). Verify: `npm run lint` clean (i18n rule) and `screens.test.tsx`/navigation tests still green.

## 4. Medicines screens

- [x] 4.1 `MedicineStack` in the Medicines tab: parent selector (chips, auto-select when one parent), medicine list showing name, doseText, times, and active/inactive state; add button and row taps hidden for viewers. Verify: component tests — viewer sees no add button and no tappable rows, editor sees both, list renders snapshot data, selecting a second parent swaps the list.
- [x] 4.2 Add-medicine screen: name, doseText, dynamic `HH:mm` time rows, startDate (default today), validation (name required, every time matches `^([01]\d|2[0-3]):[0-5]\d$`, at least one time, date `YYYY-MM-DD`), payload written with `source: "manual"`, `confirmedByHuman: true`, `active: true`, `createdBy` = current uid. Verify: tests — payload shape asserted against the mock, each validation failure surfaces an i18n error and writes nothing, success returns to the list.
- [x] 4.3 Edit-medicine screen: same form pre-filled, save writes only editable fields (name, doseText, times, startDate), deactivate asks for confirmation and writes `active: false` (reactivate writes `active: true`), delete action absent. Verify: tests — pre-fill, save payload, deactivate flips `active` and keeps the document, viewer cannot open the screen (guard in list plus navigation test).

## 5. Emulator visibility

- [x] 5.1 Dev-only emulator wiring: Auth, Firestore and Functions point at `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` (default `localhost`) when `__DEV__` and `typeof x.useEmulator === "function"` and not under Jest. Verify: unit test of the wiring helper (mocks exposing `useEmulator` get called only when the flags line up; Jest environment never calls it) and the full mobile suite stays green.
- [x] 5.2 `scripts/seed-emulator.mjs` + `npm run seed`: reads `users/*` from the Firestore emulator REST, seeds per uid two parents (owner member), medicines, today's doseEvents in every status, and recent alerts; with no users seeds `demo-user` and prints instructions. Verify: run `npm run seed` against `npm run emulators` in this session and assert the emulator REST returns the seeded parents and events; document the command and the Android host notes in `docs/SETUP.md`.

## 6. Close

- [x] 6.1 `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:fns`, `npm run test:rules`, `npx expo-doctor`, `npx expo export --platform android` all pass. Verify: each command exits 0 in this session.

## Workflow follow-up

- Archive: `openspec archive medicines-dashboard --yes`, then `openspec validate --specs` reports all specs valid.
- Commit: `Stage 3: medicines and dashboard`.
