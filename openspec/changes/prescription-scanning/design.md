# Design

## Flow
1. Owner/editor picks/captures image on mobile. Upload to `gs://.../prescriptions/{parentId}/{uuid}.{ext}` with contentType image/* and size <=10MB.
2. Call callable `scanPrescription` with parentId and storagePath. Function downloads image, sends to Anthropic Messages API with model `claude-sonnet-5-5` and image content, gets JSON, validates against zod schema matching prescription-reading output. Saves `prescriptions/{prescriptionId}` as `status: "pending_review"`, `extracted` set, `uploadedBy`, `createdAt`. Never schedules medicines.
3. Review screen shows Storage image and list of medicines from `extracted.medicines`. Each row shows name, doseText, frequencyText/times, confidence badge, illegible flag. Owner/editor can edit fields. "Confirm" is disabled for illegible items until edited (name non-empty and not marked illegible after edit, or explicitly cleaned). Confirming calls callable `confirmPrescriptionMedicine` which creates `medicines/{medicineId}` with source "prescription_scan", confirmedByHuman true, prescriptionId set, createdBy uid, active true (default), validates required fields, and updates prescription status to "confirmed" when appropriate (or tracks confirmed medicines). Nothing automatic.

## Validation
Zod schema for prescription extraction:
```ts
{
  doctor: z.string().nullable(),
  date: z.string().nullable(),
  medicines: z.array(z.object({
    name: z.string(),
    doseText: z.string().nullable(),
    frequencyText: z.string().nullable(),
    times: z.array(z.string()).nullable(),
    confidence: z.number().min(0).max(1),
    illegible: z.boolean(),
  })),
  overallConfidence: z.number().min(0).max(1),
}
```
Parse JSON from response (tolerate fences). On invalid, write needs review state? Prescription result handling says "saved with status pending_review" when read; invalid model output should go to review (needsReview) not silently save bad structure - follow ai-contracts rule: all AI output validated before written; invalid goes to review state. So if validation fails, save prescription with status pending_review, extracted may be null or a safe partial? Or set a review flag - but PrescriptionDoc has extracted: ExtractedPrescription | null. Store invalid as extracted null and rely on status pending_review + audit/log id only; require manual entry? Or better: on parse/validation failure, create prescription with extracted null, status pending_review, and do not create medicines. Review UI must handle extracted null (manual entry path) - but spec says "Illegible items must be highlighted and cannot be confirmed without edits." Invalid output -> review state.

## Security
- Callables check auth + membership + role owner/editor.
- Image download via Admin SDK; only allow https signed URLs not needed (download from bucket).
- Never log image bytes/transcripts/medicine values; log prescriptionId/parentId/status.
- Secrets: ANTHROPIC_API_KEY via Firebase secrets.

## Testing
- Unit tests: schema validation, illegible edit gate logic.
- Function tests (mocked Anthropic): valid extraction saved as pending_review, invalid JSON -> extracted null/pending_review, illegible requires edit.
- Mobile tests: review screen disables confirm for illegible, edits enable confirm, confirm creates medicine.
