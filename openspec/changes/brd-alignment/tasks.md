# Tasks

## 1. Scheduled badge (FR-1.4)

- [x] 1.1 Change `screens.today.badgeScheduled` to "Scheduled for {{time}}" and pass the dose time in `DoseCardView`; update `DoseCardView` and Today screen tests for the new text

## 2. WhatsApp deep link (FR-2.3)

- [x] 2.1 Add a pure helper that builds the `wa.me` link and reports whether it is within 2000 characters, with unit tests (encoding, length limit)
- [x] 2.2 `DigestCard`: add "Share on WhatsApp" (catalogue string); open the link, fall back to the share sheet on failure or when too long; nothing stored or logged
- [x] 2.3 Component tests: opens the encoded link, falls back to Share when `openURL` rejects, falls back when the text is too long, does not log the text

## 3. Parent direct line (FR-4.2)

- [x] 3.1 `ContactsBlock`: optional `parent` prop rendered first with a Call button using the same disabled rule; `ProtocolCard` passes the parent's name and phone
- [x] 3.2 Tests: parent row first, opens `tel:` with the E.164 number, disabled in the calm state, hidden when there is no phone

## 4. Visual match tag (FR-3.2)

- [x] 4.1 Confirm with a search that no mobile code writes `source: "prescription_scan"` or calls the scan callables, and record the result in the task note
- [x] 4.2 `firestore.rules`: clients create medicines only with `source == 'manual'` and cannot change `source` or `prescriptionId`; `confirmedByHuman` unchanged
- [x] 4.3 Update the rules tests that assert client-created or client-changed scan medicines (`numbered.test.ts` rules test 16, `paths.test.ts`), add tests for the new denials and for the server path still working in the functions emulator tests
- [x] 4.4 Update `scripts/mutation-check-rules.mjs` and `docs/rules-test-coverage.md`; run `npm run test:rules` and `npm run test:rules:mutations`
- [x] 4.5 `isVisualMatch` helper and the neutral "Visual match" tag on `MedicinesListScreen`, with the fixed catalogue string and no model name; tests for scanned and confirmed, manual, unconfirmed, and the wording check (no "Sonnet", "Claude" or "AI" in the string or label)

## 5. Dispatch timing and measures (NFR-2.1, NFR-2.2)

- [x] 5.1 `dispatch.test.ts`: tests that an event one second before its time is not dispatched and one 59 seconds after is
- [x] 5.2 `docs/PRELAUNCH-CHECKLIST.md`: pilot measures for load time (procedure, target 1.2 s median) and call start delay (query or script, target p95 at most 60 s), plus the BRD KPI notes

## 6. Parking and decisions

- [x] 6.1 `docs/DECISIONS.md`: dormant weekly summary, trends and prescription scanning; the four open changes deferred; native Android versus the BRD's web/PWA wording; iOS out of scope
- [x] 6.2 Mark the four open changes as deferred by a note in each change's proposal (no deletion), and list them in the decisions entry

## 7. Verification

- [x] 7.1 Wording review of the new strings against medical safety; `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:fns`, `npm run test:rules`
- [x] 7.2 Run on `flutter_emulator`: scheduled badge, WhatsApp action (fallback to the share sheet if WhatsApp is not installed), parent call button in calm and missed states; fix problems found
- [x] 7.3 Commit to `main`
