// The app side of scanning a prescription: scanner, upload, reading and the review data.
// Nothing here logs an image path, a medicine or any text read from the page (hard rule 6).
import { getApp } from "@react-native-firebase/app";
import { doc, getDoc, getFirestore, setDoc } from "@react-native-firebase/firestore";
import { deleteObject, getStorage, putFile, ref } from "@react-native-firebase/storage";
import DocumentScanner, { ResponseType, ScanDocumentResponseStatus } from "react-native-document-scanner-plugin";
import { scanPrescription } from "../family/callables";
import { TIME_PATTERN } from "../screens/medicines/medicineInput";

export type ScanOutcome =
  | { kind: "page"; filePath: string }
  | { kind: "cancelled" }
  | { kind: "unavailable" };

/** Opens Google's document scanner for one page. It rejects when Google Play services cannot run it. */
export async function scanOnePage(): Promise<ScanOutcome> {
  try {
    const result = await DocumentScanner.scanDocument({
      maxNumDocuments: 1,
      croppedImageQuality: 85,
      responseType: ResponseType.ImageFilePath,
    });
    if (result.status === ScanDocumentResponseStatus.Cancel) return { kind: "cancelled" };
    const filePath = result.scannedImages?.[0];
    return filePath ? { kind: "page", filePath } : { kind: "cancelled" };
  } catch {
    return { kind: "unavailable" };
  }
}

function newImageName(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.jpg`;
}

/** Uploads the cleaned page into this parent's own folder (the only place the server will read from). */
export async function uploadPage(parentId: string, filePath: string): Promise<string> {
  const storagePath = `prescriptions/${parentId}/${newImageName()}`;
  await putFile(ref(getStorage(getApp()), storagePath), filePath, { contentType: "image/jpeg" });
  return storagePath;
}

/** Removes the uploaded page once the review has ended. A failure is ignored: nothing depends on it. */
export async function deletePage(storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(getStorage(getApp()), storagePath));
  } catch {
    // The image is private to the family and the Storage rules keep it so; nothing to do here.
  }
}

export interface ReviewMedicine {
  key: string;
  /** Exactly as read from the page. Never corrected. */
  name: string;
  doseText: string;
  frequencyText: string;
  /** Only times the page stated, in HH:mm. Empty when none. */
  times: string[];
  /** Illegible or low confidence: the card carries a neutral "Check this one" marker. */
  needsCheck: boolean;
}

const asText = (value: unknown): string => (typeof value === "string" ? value : "");

/** Reads the saved prescription and turns each extracted medicine into an editable review row. */
export async function loadReviewMedicines(parentId: string, prescriptionId: string): Promise<ReviewMedicine[]> {
  const snap = await getDoc(doc(getFirestore(), "parents", parentId, "prescriptions", prescriptionId));
  const data = snap.data() as { extracted?: { medicines?: unknown } | null } | undefined;
  const list = Array.isArray(data?.extracted?.medicines) ? (data?.extracted?.medicines as unknown[]) : [];
  return list.flatMap((entry, index) => {
    const m = (entry ?? {}) as Record<string, unknown>;
    const name = asText(m.name);
    if (name.trim().length === 0) return [];
    const confidence = typeof m.confidence === "number" ? m.confidence : 1;
    const times = Array.isArray(m.times)
      ? m.times.filter((time): time is string => typeof time === "string" && TIME_PATTERN.test(time.trim())).map((time) => time.trim())
      : [];
    return [
      {
        key: `${prescriptionId}-${index}`,
        name,
        doseText: asText(m.doseText),
        frequencyText: asText(m.frequencyText),
        times,
        needsCheck: m.illegible === true || confidence < 0.5,
      },
    ];
  });
}

/** Marks a prescription nobody confirmed anything from as rejected. Best effort. */
export async function rejectPrescription(parentId: string, prescriptionId: string): Promise<void> {
  try {
    await setDoc(doc(getFirestore(), "parents", parentId, "prescriptions", prescriptionId), { status: "rejected" }, { merge: true });
  } catch {
    // Left as pending_review: nothing is scheduled either way.
  }
}

export type ReadFailure = "permission" | "failed";

/** Asks the server to read the uploaded page. Resolves the prescription id and how many medicines it found. */
export async function readPrescription(
  parentId: string,
  storagePath: string,
): Promise<{ prescriptionId: string; medicineCount: number }> {
  const result = await scanPrescription({ parentId, storagePath });
  return { prescriptionId: result.prescriptionId, medicineCount: result.medicineCount ?? 0 };
}

/** Maps a callable failure to one of two calm messages. */
export function readFailureOf(error: unknown): ReadFailure {
  const code = (error as { code?: string } | null)?.code ?? "";
  return code.endsWith("permission-denied") ? "permission" : "failed";
}
