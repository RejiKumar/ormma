import { z } from "zod";

const readingSchema = z
  .object({
    type: z.enum(["bp", "sugar"]),
    systolic: z.number().optional(),
    diastolic: z.number().optional(),
    value: z.number().optional(),
    unit: z.string().trim().min(1).max(20).optional(),
  })
  .strict()
  .superRefine((reading, ctx) => {
    if (reading.type === "bp") {
      if (reading.systolic === undefined || reading.diastolic === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "bp requires systolic and diastolic",
          path: ["systolic"],
        });
      }
    } else if (reading.value === undefined) {
      ctx.addIssue({ code: "custom", message: "sugar requires value", path: ["value"] });
    }
  });

export const structuredReplySchema = z
  .object({
    tookMedicine: z.boolean().nullable(),
    readings: z.array(readingSchema).max(10),
    symptoms: z.array(z.string().trim().min(1).max(200)).max(20),
    confirmationNote: z.string().trim().min(1).max(400).nullable(),
    urgent: z.boolean(),
    confidence: z.number().min(0).max(1),
    language: z.string().trim().min(2).max(20),
  })
  .strict();

export type StructuredReply = z.infer<typeof structuredReplySchema>;
export type ReplyReading = StructuredReply["readings"][number];

export const BP_SYSTOLIC_RANGE = { min: 60, max: 260 } as const;
export const BP_DIASTOLIC_RANGE = { min: 30, max: 160 } as const;
export const SUGAR_RANGE = { min: 20, max: 600 } as const;

function within(value: number, range: { min: number; max: number }): boolean {
  return value >= range.min && value <= range.max;
}

/** True when any reading is outside the spec's plausibility range; the value is still returned. */
export function hasImplausibleReading(readings: readonly ReplyReading[]): boolean {
  return readings.some((reading) => {
    if (reading.type === "bp") {
      return (
        reading.systolic === undefined ||
        reading.diastolic === undefined ||
        !within(reading.systolic, BP_SYSTOLIC_RANGE) ||
        !within(reading.diastolic, BP_DIASTOLIC_RANGE)
      );
    }
    return reading.value === undefined || !within(reading.value, SUGAR_RANGE);
  });
}
