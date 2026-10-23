// Pure helpers for the manual medicine form (access-control "Manual medicine creation semantics").

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface MedicineDraft {
  name: string;
  doseText: string;
  times: string[];
  startDate: string;
}

export type MedicineDraftError = "nameRequired" | "noTimes" | "invalidTime" | "invalidDate";

export const MEDICINE_ERROR_KEY = {
  nameRequired: "screens.medicines.errors.nameRequired",
  noTimes: "screens.medicines.errors.noTimes",
  invalidTime: "screens.medicines.errors.invalidTime",
  invalidDate: "screens.medicines.errors.invalidDate",
} as const;

/** Trimmed, non-empty times in the order entered. */
export function cleanedTimes(draft: MedicineDraft): string[] {
  return draft.times.map((time) => time.trim()).filter((time) => time.length > 0);
}

/** First failing rule in display order, or null when the draft can be saved. */
export function validateMedicineDraft(draft: MedicineDraft): MedicineDraftError | null {
  if (draft.name.trim().length === 0) return "nameRequired";
  const times = cleanedTimes(draft);
  if (times.length === 0) return "noTimes";
  if (times.some((time) => !TIME_PATTERN.test(time))) return "invalidTime";
  if (!DATE_PATTERN.test(draft.startDate.trim())) return "invalidDate";
  return null;
}

/** The exact document the rules engine accepts for a human-confirmed manual medicine. */
export function medicineCreatePayload(draft: MedicineDraft, uid: string, createdAt: unknown) {
  return {
    name: draft.name.trim(),
    doseText: draft.doseText.trim(),
    times: cleanedTimes(draft),
    startDate: draft.startDate.trim(),
    endDate: null,
    active: true,
    source: "manual" as const,
    confirmedByHuman: true,
    prescriptionId: null,
    createdBy: uid,
    createdAt,
  };
}

/** Only the fields the edit form may change; createdBy/createdAt/source stay untouched. */
export function medicineUpdatePayload(draft: MedicineDraft) {
  return {
    name: draft.name.trim(),
    doseText: draft.doseText.trim(),
    times: cleanedTimes(draft),
    startDate: draft.startDate.trim(),
  };
}

/** Client-generated document id (crypto.randomUUID is not available in React Native by default). */
export function newMedicineId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
