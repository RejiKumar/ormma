# Design

## Context

See proposal.md for motivation. The app has no scan code. `functions/src/prescription/index.ts` already has `scanPrescription({ parentId, storagePath })` (reads the image from Storage with Sonnet and saves `parents/{parentId}/prescriptions/{id}` with status `pending_review` and the extracted medicines) and `confirmPrescriptionMedicine` (creates a `prescription_scan` medicine with `confirmedByHuman: true`). Storage rules already allow owners and editors to write images up to 10 MB under `prescriptions/{parentId}/`. The two callables throw plain `Error`s and the confirm callable defaults a missing time to `08:00` and a missing start date to today.

## Goals / Non-Goals

**Goals:** a flow that ends with a person confirming every medicine on screen; calm failures; no value invented by the system; raised limits that stay bounded.

**Non-Goals:** changing the Sonnet prompt or schema, iOS, gallery import, auto-scheduling.

## Decisions

1. **The scan library.** Use a maintained React Native wrapper around Google's ML Kit Document Scanner (Play services based, so no camera permission is needed by the app and the model is managed by Google Play services). *Alternative:* a small local Expo module around `play-services-mlkit-document-scanner`, kept as the fallback if no wrapper supports Expo SDK 58 and React Native 0.88. Recorded as an open question; the first task proves the choice with a build before anything else is written.
2. **Upload.** `@react-native-firebase/storage` uploads the scanner's JPEG to `prescriptions/{parentId}/{uuid}.jpg`. *Alternative:* sending the image bytes inside the callable, rejected because it needs a different server contract and callables cap payloads.
3. **Scan then review, never auto-apply.** After upload the app calls `scanPrescription`, reads the saved prescription document, and shows each extracted medicine in an editable card. A medicine that is `illegible` or has confidence below 0.5 carries a neutral "Check this one" marker (not coral, no judgement words). Times and start date are required fields on the review card and start empty: the model's `times` are shown as a suggestion the person must accept by editing or tapping.
4. **Confirm is per medicine** and calls `confirmPrescriptionMedicine` with the values on the card. The callable now refuses a missing or invalid `times` or `startDate` (`invalid-argument`), and checks that the prescription document belongs to that parent and is still `pending_review` or partially confirmed (`failed-precondition`).
5. **Typed errors.** Both callables throw `HttpsError` with `unauthenticated`, `permission-denied`, `invalid-argument` or `failed-precondition`. The app maps these to calm messages.
6. **Own-parent image only.** `storagePath` must start with `prescriptions/{parentId}/` and contain no `..`; anything else is `invalid-argument`. Otherwise an editor of one parent could ask the server to read another parent's image.
7. **Image cleanup.** When the review ends (every medicine confirmed or discarded, or the screen is discarded), the app deletes the image from Storage and the prescription document keeps only its status. *Alternative:* keep the image for audit, rejected for privacy. Recorded as an open question.
8. **Prefill.** The Add medicine screen reads the medicines already loaded for the parent and takes the one with the latest `createdAt`; it copies dose, frequency, how it looks, purpose, times and start date, never the name, and shows the note "Filled from the last medicine. Check before saving." with a Clear button. The start date is not copied if it is in the past, because a stale start date would hide the dose; it uses today instead. Saving is unchanged.
9. **Limits.** One constant (`MAX_TEXT = 1000`) replaces the three, the same value is used in `firestore.rules` (`optText`), so the form and the rules cannot disagree.

## Risks / Trade-offs

- **A second native dependency and a new native build.** Mitigation: prove the build first (task 1.1) and keep the fallback.
- **Reading accuracy.** Handwriting can be misread. Mitigation: nothing is scheduled without a person confirming, names are shown as read, unclear ones are marked.
- **The scanner needs Google Play services.** On a phone without it the scan action explains that scanning is unavailable and manual entry still works.
- **Prefill could copy a wrong dose forward.** Mitigation: the note, the Clear action, the name is never copied, and saving needs the person to press Save.
- **Cost.** Each scan is one Sonnet call; the existing free-plan limits are unchanged.

## Migration Plan

Ship the app and the server together: deploy functions and rules first (safe, the new checks only refuse bad input), then the new app build. Existing medicines with text up to 80 characters stay valid.

## Open Questions

- Which wrapper library, or the local module fallback (decided by the first build task).
- Delete the image after the review (default here) or keep it?
