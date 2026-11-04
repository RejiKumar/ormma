import type { Medicine } from "./useMedicines";

/**
 * True when the medicine was read from a prescription photo (created by the server, never by a client)
 * and a person confirmed it. The tag it enables is a fixed neutral label; it makes no claim that the
 * medicine is correct and names no AI model.
 */
export function isVisualMatch(medicine: Pick<Medicine, "source" | "confirmedByHuman" | "prescriptionId">): boolean {
  return (
    medicine.source === "prescription_scan" &&
    medicine.confirmedByHuman === true &&
    typeof medicine.prescriptionId === "string" &&
    medicine.prescriptionId.length > 0
  );
}
