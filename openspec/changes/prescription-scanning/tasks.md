# Tasks

- [ ] Add prescription schema/types and shared zod schema for extraction.
- [ ] Add Storage upload helpers and mobile capture screen (camera/library) with validation.
- [ ] Add `scanPrescription` callable: download image, call Sonnet 5.5, validate, save prescription as pending_review.
- [ ] Add `confirmPrescriptionMedicine` callable: create medicine with source prescription_scan, confirmedByHuman true, prescriptionId.
- [ ] Add prescriptions list and review screen with image, editable rows, illegible highlights, confidence badges, confirm gate.
- [ ] Add navigation/routes and i18n strings.
- [ ] Add tests (functions unit + mocked Anthropic, mobile components).
- [ ] Update docs/DECISIONS if needed, run lint/typecheck/tests, validate openspec, commit.
