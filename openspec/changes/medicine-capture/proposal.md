# Proposal

## Why

Requested by the user on 2026-11-13 (not in the BRD): typing every medicine by hand is slow for a family. A prescription can be scanned instead, and a second medicine for the same parent usually shares most of its details with the first. The server can already read a prescription photo (`scanPrescription`, Sonnet) and confirm one medicine (`confirmPrescriptionMedicine`), but the app has no camera, upload or review screen, so none of it can be used. The 80/80/40 character limits on three text fields also get in the way of how families actually describe a medicine.

## What changes

The user decided two things up front: the scan uses **Google's ML Kit document scanner**, and a new medicine is prefilled with **everything except the name** from the last one added for that parent.

- **Scan a prescription.** A "Scan prescription" action on the Medicines tab and the Add medicine screen (owners and editors only) opens the Google document scanner. The cleaned page is uploaded to Storage, read by the existing server function, and shown on a review screen where every extracted medicine can be edited. Nothing is scheduled until a person confirms each medicine on screen.
- **Prefill.** Add medicine opens with dose, frequency, how it looks, purpose, times and start date from the last medicine of that parent, never the name, with a short note and a Clear action. The values are the family's own earlier entries.
- **Raise the text limits** on frequency, how it looks and purpose from 80, 80 and 40 to **1000** characters, in the form, in `firestore.rules` and in the specs. Time keeps its HH:mm validation. Name and dose have no cap today.
- **Harden the existing callables** while wiring them up: typed error codes instead of plain errors that reach the app as "internal", a check that the image belongs to that parent, and no invented times (the confirm callable defaults a missing time to 08:00 today, which breaks the rule that no value is filled in by the system).

Already done and **not** part of this change: the medicine card chip overflow (the "How it looks" text running past the card) was fixed on 2026-11-13.

## Capabilities

### New Capabilities
- `prescription-capture`: the app flow for scanning, uploading, reviewing and confirming medicines from a prescription.

### Modified Capabilities
- `prescription-reading`: the scan and confirm callables fail with typed codes, accept only that parent's image, and never invent a time or start date.
- `access-control`: the length caps on the three medicine display fields.
- `medicine-details`: the same caps in the form, and the prefill.

## Spec changes

| Requirement | Old behaviour | New behaviour | Spec file |
| --- | --- | --- | --- |
| Additional medicine display fields | `frequencyText` and `pillDescription` at most 80 characters, `purpose` at most 40; `firestore.rules` enforces them | All three at most 1000 characters; viewers and over-limit values still denied; **`firestore.rules` changes, emulator rules tests required** | `access-control` |
| Medicine display fields | The form stops entry at 80, 80 and 40 | The form stops entry at 1000 for each | `medicine-details` |
| Prefill from the last medicine (new) | The form always opens empty | Opens prefilled except the name, with a note and Clear | `medicine-details` |
| Scan, review and confirm flow (new) | No app flow exists | Defined in the new capability, with on-screen human confirmation of every medicine | `prescription-capture` |
| Typed callable errors, own-parent image, no invented values (new) | Plain `Error`s reach the app as "internal"; any storage path is accepted; a missing time becomes 08:00 and a missing start date becomes today | `unauthenticated`, `permission-denied`, `invalid-argument` or `failed-precondition`; only `prescriptions/{parentId}/` paths; missing times or start date are refused | `prescription-reading` |

Unchanged on purpose: the Sonnet prompt and output schema, validation before any write, `pending_review` handling, medical-safety rules, and the Storage rules (already owner or editor only, images up to 10 MB).

**New native dependencies (the project rules say to ask; the scanner was approved on 2026-11-13, the second is the same Firebase family and is needed to upload):** a library wrapping Google's ML Kit document scanner (Android), and `@react-native-firebase/storage`. Both need a new native build.

## Out of scope

iOS, importing from the gallery, scanning several pages in one go beyond what the Google scanner returns, any change to the Sonnet prompt or schema, and scheduling anything without confirmation.

## Impact

App: Medicines tab, Add and Edit medicine, a new scan and review flow, `package.json` and the Android build. Server: `functions/src/prescription/index.ts`. Rules: `firestore.rules` (three limits). Docs: `docs/DECISIONS.md`, `docs/design-system.md` if a component is added.
