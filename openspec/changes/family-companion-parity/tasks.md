## 1. Rules and data model

- [x] 1.1 Add `emergencyContacts` (max 3; label 1 to 40 chars; kind neighbour or clinic; E.164 phone; no extra keys) to the owner field allow-list in `firestore.rules`
- [x] 1.2 Add the `familyCalls` rule: member read under consent visibility, no client writes
- [x] 1.3 Emulator tests in `functions/` for: valid contacts, 4 entries, unknown kind, extra key, bad phone, editor/viewer denied, familyCalls member read, non-member denied, client write denied, client `lastSeenAt` write denied
- [x] 1.4 Update `scripts/mutation-check-rules.mjs` and `docs/rules-test-coverage.md` for the new cases; run `npm run test:rules` and `npm run test:rules:mutations`
- [x] 1.5 Update `shared/types` for `emergencyContacts`, `lastSeenAt` and `FamilyCall`

## 2. Cloud Functions

- [x] 2.1 `getDoseEscalation` callable: membership and consent-visibility check, read `callSessions` by `doseEventIds`, return ordinal, start time and outcome only, plus alert time and `attempts` fallback; ids and statuses only in logs
- [x] 2.2 `touchPresence` callable: membership check, transactional 5-minute throttle on `members/{uid}.lastSeenAt`
- [x] 2.3 `logFamilyCall` callable: membership check, idempotent id `{uid}_{yyyyMMddHHmm}`, server timestamp
- [x] 2.4 Add `familyCalls`, `emergencyContacts` and member `lastSeenAt` to export; delete `familyCalls` with the parent
- [x] 2.5 Tests with the Firestore emulator for all three callables (non-member denied, throttle, idempotency, no session fields leaked, visibility window) and for export and delete; `npm run check:isolated` and `npm --prefix functions run typecheck`

## 3. Mobile data layer

- [x] 3.1 Callable wrappers in `mobile/src/family/callables.ts` and types
- [x] 3.2 Hooks: `usePresence` (members and latest family call listeners plus the throttled touch), `useEscalation(parentId, doseEventId)`, `useUnreadUrgentAlertCount`
- [x] 3.3 `buildDigest` pure function with i18n templates (en; fallbacks for ml, ta, hi follow the existing pattern)
- [x] 3.4 Unit tests for the hooks (mocked Firestore and functions) and for `buildDigest` with exact expected strings

## 4. Mobile screens

- [x] 4.1 Today: presence bar with initials avatars, "viewing" line, last family call time, "I called Amma" button
- [x] 4.2 Today: digest card with "Share update" (React Native `Share`), hidden without consent or without doses
- [x] 4.3 Alerts: escalation timeline for missed, no-answer and not-taken doses, caregiver alert time, emergency contact rows with dialer buttons
- [x] 4.4 Family: owner-only emergency contacts editor with E.164 validation and a scroll-to-error like the other forms
- [x] 4.5 Tab bar: dot with reduced-motion-aware pulse and accessible label. It reads `colors.urgent` (the dot means exactly unread missed-dose or urgent alerts), so `components/AlertDot.tsx` is added to the coral allowlist in `designRules.test.ts`
- [x] 4.6 Component tests for each screen change, including role differences (owner, editor, viewer) and the no-consent case

## 5. Safety, privacy and docs

- [x] 5.1 Medical-safety wording review of every new string (no advice, no interpretation, no health values, disclaimer visible); add the strings to the review list
- [x] 5.2 Add presence and emergency contacts to the privacy notice text and `docs/INCIDENT.md` if it lists data categories
- [x] 5.3 Log check: grep new function files for any log of phone numbers, times of activity or digest text
- [x] 5.4 Append decisions to `docs/DECISIONS.md`

## 6. Verification

- [x] 6.1 `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:fns`, `npm run test:rules`
- [x] 6.2 On the Android emulator with the Firebase emulators: walked Today, Alerts, Family as the owner, with a seeded second member (an invite-redeem run as that second member was not done); confirmed presence, the call log, the escalation rows with seeded sessions, contacts editing and the tab dot; fix anything found and re-check
