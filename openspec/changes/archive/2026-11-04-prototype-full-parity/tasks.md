## 1. Rules, types and data model

- [x] 1.1 `firestore.rules`: owner-editable `city`, `prescriber`, `refillDue`; medicine `frequencyText`, `pillDescription`, `purpose`; contact `note`; keep `seenBy`, member fields and `lastDigestDate` server-only
- [x] 1.2 Emulator tests for each new field (valid, too long, wrong type, viewer and editor denied, client write to `seenBy`, `notify`, `relationship` denied) and update the earlier contact-shape test for `note`
- [x] 1.3 Update `scripts/mutation-check-rules.mjs` and `docs/rules-test-coverage.md`; run `npm run test:rules` and the mutation check
- [x] 1.4 Update `shared/types` (parent, medicine, member, contact, dose event)

## 2. Cloud Functions

- [x] 2.1 `markDosesSeen` callable: membership and visibility checks, no overwrite, batch limit
- [x] 2.2 `setMemberProfile` and `setNotifyPrefs` callables: own document only, validation
- [x] 2.3 `getCallHistory` callable: sessions and family calls, visibility, only time, outcome, duration, member uid
- [x] 2.4 Shared digest text builder and `sendEveningDigest` scheduled function with `lastDigestDate` guard
- [x] 2.5 Push sender: filter members by `notify` and quiet hours for non-urgent alerts; urgent always delivered; alert creation untouched
- [x] 2.6 Export and delete include the new fields
- [x] 2.7 Emulator tests for every function (non-member, validation, idempotency, preferences, quiet hours, urgent bypass, no leaked fields); `check:isolated` and typecheck

## 3. Mobile logic

- [x] 3.1 Pure functions with unit tests: card grouping by time, period names, status badge text with the on-time rule, "Seen by" line, next-dose line, protocol times from call policy, presence badge wording
- [x] 3.2 Hooks and callable wrappers: events with `resolvedAt` and `seenBy`, `markDosesSeen` on Today focus, member profile and preferences, call history
- [x] 3.3 Digest text builder matching the server template; clipboard copy with `expo-clipboard`

## 4. Mobile screens

- [x] 4.1 App bar pill "<Parent> · <City>"
- [x] 4.2 Today: grouped dose cards with badge, pill tag, note block, read receipts, hero next line, digest card with Copy and Share
- [x] 4.3 Medicines: heading with active count, card content, footer; Add and Edit forms with the three new fields and length limits
- [x] 4.4 Escalation: always-visible protocol, calm card, live attempts when missed, contacts with initial avatar, note and enabled state
- [x] 4.5 Family: caregiver circle rows, profile edit for self, Notifications card with real toggles, Call history, owner editor for city, prescriber and refill date, contact note field
- [x] 4.6 i18n strings in English; component tests for each screen change including viewer, editor and owner

## 5. Safety, privacy and docs

- [x] 5.1 Wording review of every new string against medical safety (no advice, no reasons, disclaimer visible)
- [x] 5.2 Update `docs/PRIVACY-POLICY.md` and the Data safety table in `docs/RELEASE.md` (read receipts, preferences, member city)
- [x] 5.3 Log check on new function files
- [x] 5.4 Append decisions to `docs/DECISIONS.md`; seed script gets the new fields so the emulator shows the prototype data

## 6. Verification

- [x] 6.1 `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:fns`, `npm run test:rules`
- [x] 6.2 Rebuild the x86_64 dev client (new native module), run on `flutter_emulator` with the Firebase emulators, compare each tab with the prototype, fix and re-check
