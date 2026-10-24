import { z } from "zod";

export const extractedMedicineSchema = z.object({
  name: z.string(),
  doseText: z.string().nullable(),
  frequencyText: z.string().nullable(),
  times: z.array(z.string()).nullable(),
  confidence: z.number().min(0).max(1),
  illegible: z.boolean(),
});

export const extractedPrescriptionSchema = z.object({
  doctor: z.string().nullable(),
  date: z.string().nullable(),
  medicines: z.array(extractedMedicineSchema),
  overallConfidence: z.number().min(0).max(1),
});

export type ExtractedMedicineSchema = z.infer<typeof extractedMedicineSchema>;
export type ExtractedPrescriptionSchema = z.infer<typeof extractedPrescriptionSchema>;

export function parsePrescriptionJson(text: string): ExtractedPrescriptionSchema {
  let clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) clean = clean.slice(start, end + 1);
  const payload = JSON.parse(clean);
  return extractedPrescriptionSchema.parse(payload);
}
