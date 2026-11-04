# Proposal

## Why

`ormma-family-companion-brd.md` (v1.0, approved for implementation) is the requirement for the app. A line-by-line comparison found most of it already built, plus four small gaps (FR-1.4 scheduled badge wording, FR-2.3 WhatsApp deep link, FR-4.2 parent direct-line call button, FR-3.2 visual match tag), two non-functional targets that nothing measures (NFR-2.1 load time, NFR-2.2 call timing), and code that is outside the BRD scope. This change closes the gaps, adds the measurements, and records which out-of-scope code is parked.

## What Changes

- **FR-1.4:** a scheduled dose card badge reads "Scheduled for <time>" (the time of the dose, in the parent's timezone).
- **FR-2.3:** the daily family update gets a third action, "Share on WhatsApp", that opens `https://wa.me/?text=<encoded update>`. The user still taps send inside WhatsApp; the app sends nothing. If the link cannot be opened, or the encoded text is too long, the app falls back to the system share sheet. Copy and Share stay.
- **FR-4.2:** the Escalation contacts block lists the parent's direct line first ("Call <name>", opening the dialer with `parent.phone`), above the neighbour and clinic. Same enabled and disabled rule as the other contacts.
- **FR-3.2:** a medicine card shows a neutral "Visual match" tag only when the medicine was read from a prescription photo (`source` is `prescription_scan`, with a `prescriptionId`) **and** a person confirmed it (`confirmedByHuman` is true). No AI model name appears in the UI. **Finding:** today there is no screen in the app that scans a prescription, so no medicine can get this tag through the app; the tag code will be in place and stay invisible until the scan screen is revived. **Finding:** the security rules currently let an owner or editor write `source: "prescription_scan"` and `confirmedByHuman: true` directly, which would let the tag be faked. The smallest honest fix is a rules change: clients can no longer create a medicine with source `prescription_scan` or change `source` or `prescriptionId` on an existing one; only the existing server callable `confirmPrescriptionMedicine` creates those. Editors and owners can still toggle `confirmedByHuman`.
- **NFR-2.2:** a requirement and unit tests for dispatch timing: a call for a dose starts no earlier than its scheduled time and, under normal operation, within 60 seconds after it (the dispatcher runs every minute).
- **NFR-2.1 and NFR-2.2 pilot measures:** a measured checklist in `docs/PRELAUNCH-CHECKLIST.md` (screen load under 1.2 s on throttled 4G; the p95 of `callSession.startedAt - scheduledFor` at most 60 s).
- **Parked, not deleted** (recorded in `docs/DECISIONS.md`): weekly summary, trend flagging and prescription scanning back end stay dormant with no UI; the four open OpenSpec changes `pilot-readiness`, `consent-export-delete-hardening`, `prescription-scanning` and `weekly-summary-trends` are marked deferred. Kept because they are needed or were requested: consent, export and delete, urgent-keyword alerts, notification preferences, call history and the evening digest.
- **Platform note** recorded in `docs/DECISIONS.md`: the BRD says "iOS and Android responsive web / PWA"; the app is native React Native, Android first. iOS is out of this change.

**Spec changes** (security rules and call flow are in the review list):

| Requirement | Old behaviour | New behaviour | Spec file |
| --- | --- | --- | --- |
| medicines path rule | Owner or editor may write any `source` and `confirmedByHuman` | Clients cannot create with, or change to, `source: "prescription_scan"`, and cannot change `source` or `prescriptionId`; `confirmedByHuman` stays editable by owner or editor | access-control |
| Dispatch timing (new) | Dispatcher runs every minute; no stated tolerance | Call starts at or after the scheduled time and within 60 s after under normal operation | call-flow |
| Status badge wording | Scheduled card reads "Scheduled" | Reads "Scheduled for <time>" | dose-receipts |
| Sharing the update | Share sheet only | Also "Share on WhatsApp" through `wa.me`, with share-sheet fallback | family-digest |
| Contacts block | Neighbour and clinic contacts | Parent's direct line first, then the contacts | check-in-protocol-view |
| Visual match tag (new) | None | Neutral tag when scan-sourced and human-confirmed | medicine-details |

Out of scope: the prescription scan screen, WhatsApp Business API (BRD milestone 3), Malayalam voice work (milestone 2), languages beyond the current four, pharmacy refill, iOS and PWA builds, deleting any parked code.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dose-receipts`: scheduled badge wording.
- `family-digest`: WhatsApp deep link action.
- `check-in-protocol-view`: parent direct-line call button.
- `medicine-details`: visual match tag.
- `access-control`: scan-sourced medicines are server-created only.
- `call-flow`: dispatch timing tolerance.

## Impact

- Code: `firestore.rules` and its emulator tests and the mutation check; `mobile/src` (`DoseCardView` string, `DigestCard`, `ContactsBlock` and `ProtocolCard`, `MedicinesListScreen`, en.json); `functions/src/schedule/dispatch.test.ts`; docs (`DECISIONS.md`, `PRELAUNCH-CHECKLIST.md`, `rules-test-coverage.md`).
- No new dependencies and no new data fields (`source`, `confirmedByHuman` and `prescriptionId` already exist).
