# Proposal: Prescription scanning

## Why
The prescription-reading spec defines reading a prescription photo with Sonnet 5.5 and saving results with status "pending_review" with no scheduling until human confirmation. We need to let an owner/editor upload a photo, run the model in a Cloud Function, save the validated extraction, and provide a review screen to confirm or edit each medicine before creating medicines with confirmedByHuman=true and source="prescription_scan".

## What Changes
- Mobile: add prescription capture (camera/library) and upload to Storage under `prescriptions/{parentId}/{id}.jpg`; add a prescriptions list and a review screen showing the image beside each extracted medicine with confidence badges, editable fields, illegible highlighting; only "Confirm" per medicine creates a medicine (confirmedByHuman=true, source=prescription_scan, prescriptionId set) and marks the prescription confirmed when all actionable medicines are processed; cannot confirm illegible items without edits.
- Functions: add `scanPrescription` callable (owner/editor), upload validation, call Claude Sonnet 5.5 with image, validate against the prescription-reading schema, save to `parents/{parentId}/prescriptions/{prescriptionId}` with status pending_review and extracted result; add `confirmPrescriptionMedicine` callable to create a medicine from an edited extracted item and link prescriptionId; log only ids/statuses.
- Shared/types and specs aligned to prescription-reading output schema.

## Spec changes
- `prescription-reading`: ADDED requirements for upload path, human review gate, and "cannot confirm illegible without edits".
- `data-model`: ADDED storage path expectation and prescription review/confirmation behaviour notes (schemas already exist; tighten rules as needed via change deltas).

## Impact
- Uses Sonnet 5.5 (claude-sonnet-5-5) from Cloud Functions with image input. API key in secrets.
- Uses Firebase Storage `prescriptions/{parentId}/...` (rules already allow owner/editor, 10MB, images only).
- No changes to firestore.rules required if we keep all writes via callables (Admin SDK). Client updates remain restricted as-is.
