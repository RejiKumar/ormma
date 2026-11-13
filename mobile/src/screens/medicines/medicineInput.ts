// Pure helpers for the manual medicine form (access-control "Manual medicine creation semantics").

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Length caps of the optional display fields (the rules enforce the same). */
export const MAX_TEXT = 1000;
export const MAX_FREQUENCY = MAX_TEXT;
export const MAX_PILL = MAX_TEXT;
export const MAX_PURPOSE = MAX_TEXT;

export interface MedicineDraft {
  name: string;
  doseText: string;
  times: string[];
  startDate: string;
  /** Family-entered display text, stored as entered and never interpreted. */
  frequencyText: string;
  pillDescription: string;
  purpose: string;
}

export type MedicineDraftError = "nameRequired" | "noTimes" | "invalidTime" | "invalidDate" | "textTooLong";

export const MEDICINE_ERROR_KEY = {
  nameRequired: "screens.medicines.errors.nameRequired",
  noTimes: "screens.medicines.errors.noTimes",
  invalidTime: "screens.medicines.errors.invalidTime",
  invalidDate: "screens.medicines.errors.invalidDate",
  textTooLong: "screens.medicines.errors.textTooLong",
} as const;

/** The empty form for a new medicine, starting today. */
export function emptyDraft(todayKey: string): MedicineDraft {
  return { name: "", doseText: "", times: [""], startDate: todayKey, frequencyText: "", pillDescription: "", purpose: "" };
}

/**
 * Prefill for the next medicine: everything except the name, copied from the medicine created most
 * recently for the parent. These are the family's own earlier entries, never generated. A past start
 * date is not carried over (today is used). Null when the parent has no medicine yet.
 */
export function prefillFromLastMedicine(
  medicines: ReadonlyArray<{
    createdAtMs: number;
    doseText: string;
    times: string[];
    startDate: string;
    frequencyText: string;
    pillDescription: string;
    purpose: string;
  }>,
  todayKey: string,
): MedicineDraft | null {
  if (medicines.length === 0) return null;
  const last = medicines.reduce((best, next) => (next.createdAtMs > best.createdAtMs ? next : best));
  return {
    name: "",
    doseText: last.doseText,
    times: last.times.length > 0 ? [...last.times] : [""],
    startDate: last.startDate > todayKey ? last.startDate : todayKey,
    frequencyText: last.frequencyText,
    pillDescription: last.pillDescription,
    purpose: last.purpose,
  };
}

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
  if (
    draft.frequencyText.trim().length > MAX_FREQUENCY ||
    draft.pillDescription.trim().length > MAX_PILL ||
    draft.purpose.trim().length > MAX_PURPOSE
  ) {
    return "textTooLong";
  }
  return null;
}

/** The optional display fields as entered (trimmed). */
function displayFields(draft: MedicineDraft) {
  return {
    frequencyText: draft.frequencyText.trim(),
    pillDescription: draft.pillDescription.trim(),
    purpose: draft.purpose.trim(),
  };
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
    ...displayFields(draft),
  };
}

/** Only the fields the edit form may change; createdBy/createdAt/source stay untouched. */
export function medicineUpdatePayload(draft: MedicineDraft) {
  return {
    name: draft.name.trim(),
    doseText: draft.doseText.trim(),
    times: cleanedTimes(draft),
    startDate: draft.startDate.trim(),
    ...displayFields(draft),
  };
}

/** Client-generated document id (crypto.randomUUID is not available in React Native by default). */
export function newMedicineId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
