# Tasks

## 1. Native build first

- [ ] 1.1 Choose and add the ML Kit document scanner wrapper (or the local module fallback) and `@react-native-firebase/storage`, and prove the Android release build still works. Verify: a release APK installs on the phone, the scanner opens and returns an image, and `docs/DECISIONS.md` records the library.

## 2. Server

- [ ] 2.1 Make `scanPrescription` and `confirmPrescriptionMedicine` throw typed `HttpsError` codes. Verify: unit and emulator tests for signed out, viewer, malformed and failed-precondition.
- [ ] 2.2 Restrict scan to `prescriptions/{parentId}/` paths without `..`. Verify: tests for another parent's path, a `..` path and an own path.
- [ ] 2.3 Make confirm require a valid time and start date, check the prescription belongs to the parent, and stop defaulting. Verify: tests for no time, bad time, no start date, wrong parent and a complete call.

## 3. Limits

- [ ] 3.1 Raise `frequencyText`, `pillDescription` and `purpose` to 1000 characters in `firestore.rules`, the form constant and the validation. Verify: emulator rules tests at 1000, at 1001, 41 characters now allowed, a viewer denied; form tests at the limit.

## 4. Prefill

- [ ] 4.1 Prefill Add medicine from the last medicine of the parent, without the name, with the note and Clear. Verify: tests for second medicine, Clear, first medicine, old start date and not saved on leaving.

## 5. Scan and review

- [ ] 5.1 Add the Scan prescription action for owners and editors on the Medicines tab and Add medicine, with the scanner-unavailable message. Verify: tests for owner, editor, viewer and unavailable.
- [ ] 5.2 Upload the page, call the reader and handle cancel, upload failure, read failure and nothing found with the calm messages. Verify: tests with mocked scanner, Storage and callables for each path, and that nothing is logged.
- [ ] 5.3 Build the review screen with editable cards, the neutral marker, required empty times and start date, Confirm and Discard, and image deletion when it ends. Verify: tests for the scenarios in the spec, the wording rules test and 48 dp targets.
- [ ] 5.4 Add catalogue text for every new string. Verify: the i18n guard test passes and no hint or example text is added.

## 6. Verification

- [ ] 6.1 Run the app tests, function tests, emulator function and rules tests, typecheck, lint and `openspec validate medicine-capture`. Verify: all pass.
- [ ] 6.2 Build the release APK and AAB and try the flow on the phone: scan a real prescription, review, confirm one and discard one, add a second medicine and see the prefill, and enter a long text. Verify: screenshots and a short checklist, with any defect fixed or logged.
