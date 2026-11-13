import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "../db";
import { createPrescriptionReview, scanPrescriptionImage } from "./scan";

export const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

export interface ScanPrescriptionPayload {
  parentId: string;
  storagePath: string;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PATH = 300;
const MAX_TEXT = 1000;

/** Typed refusals: the app maps these codes to calm messages instead of seeing "internal". */
const refuse = (code: "unauthenticated" | "permission-denied" | "invalid-argument" | "failed-precondition", message: string) =>
  new HttpsError(code, message);

const isMember = async (db: ReturnType<typeof getDb>, parentId: string, uid: string) => {
  const snap = await db.doc(`parents/${parentId}/members/${uid}`).get();
  if (!snap.exists) return null;
  const role = (snap.data() as { role?: string } | undefined)?.role;
  return role === "owner" || role === "editor" ? role : null;
};

/** The image must live in this parent's own folder: otherwise one parent's editor could read another's. */
export function isOwnPrescriptionPath(parentId: string, storagePath: string): boolean {
  if (storagePath.length === 0 || storagePath.length > MAX_PATH) return false;
  if (storagePath.includes("..") || storagePath.includes("\\") || storagePath.startsWith("/")) return false;
  const prefix = `prescriptions/${parentId}/`;
  return storagePath.startsWith(prefix) && storagePath.length > prefix.length;
}

export const scanPrescriptionHandler = async (
  request: CallableRequest<ScanPrescriptionPayload>,
  apiKey: string,
) => {
  const uid = request.auth?.uid;
  if (!uid) throw refuse("unauthenticated", "Sign in required.");
  const parentId = request.data?.parentId;
  const storagePath = request.data?.storagePath;
  if (typeof parentId !== "string" || !ID_PATTERN.test(parentId) || typeof storagePath !== "string") {
    throw refuse("invalid-argument", "A parent and an image path are required.");
  }
  if (!isOwnPrescriptionPath(parentId, storagePath)) {
    throw refuse("invalid-argument", "The image is not in this parent's prescription folder.");
  }

  const db = getDb();
  const role = await isMember(db, parentId, uid);
  if (!role) throw refuse("permission-denied", "Only an owner or editor can scan a prescription.");

  const bucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.STORAGE_BUCKET;
  if (!bucket) throw refuse("failed-precondition", "Storage is not configured.");

  const scan = await scanPrescriptionImage(bucket, storagePath, apiKey);
  const prescriptionId = await createPrescriptionReview(db, parentId, uid, storagePath, scan.extracted);

  // Ids and counts only: never a medicine name, dose or image detail (hard rule 6).
  console.info("prescription: scanned", {
    parentId,
    prescriptionId,
    hasExtract: scan.extracted !== null,
    medicines: scan.extracted?.medicines.length ?? 0,
  });
  return {
    prescriptionId,
    status: "pending_review",
    hasExtract: scan.extracted !== null,
    medicineCount: scan.extracted?.medicines.length ?? 0,
  };
};

export const scanPrescription = onCall(
  { region: "asia-south1", secrets: [ANTHROPIC_API_KEY] },
  (request: CallableRequest<ScanPrescriptionPayload>) => scanPrescriptionHandler(request, ANTHROPIC_API_KEY.value()),
);

export interface ConfirmPrescriptionMedicinePayload {
  parentId: string;
  prescriptionId: string;
  medicine: {
    name: string;
    doseText: string | null;
    frequencyText: string | null;
    times: string[] | null;
  };
  startDate?: string;
}

/**
 * Creates one medicine a person has checked on screen. The caller must give the times and the start
 * date: the system never fills either in (medical-safety: no value from the system's own knowledge).
 */
export const confirmPrescriptionMedicineHandler = async (
  request: CallableRequest<ConfirmPrescriptionMedicinePayload>,
) => {
  const uid = request.auth?.uid;
  if (!uid) throw refuse("unauthenticated", "Sign in required.");
  const parentId = request.data?.parentId;
  const prescriptionId = request.data?.prescriptionId;
  const medicine = request.data?.medicine;
  if (
    typeof parentId !== "string" ||
    !ID_PATTERN.test(parentId) ||
    typeof prescriptionId !== "string" ||
    !ID_PATTERN.test(prescriptionId) ||
    !medicine ||
    typeof medicine !== "object"
  ) {
    throw refuse("invalid-argument", "A parent, a prescription and a medicine are required.");
  }
  if (typeof medicine.name !== "string" || medicine.name.trim().length === 0) {
    throw refuse("invalid-argument", "The medicine needs a name.");
  }
  const times = Array.isArray(medicine.times)
    ? medicine.times.filter((time): time is string => typeof time === "string").map((time) => time.trim())
    : [];
  if (times.length === 0 || times.length > 24 || times.some((time) => !TIME_PATTERN.test(time))) {
    throw refuse("invalid-argument", "At least one valid time (HH:mm) is required.");
  }
  const startDate = request.data.startDate;
  if (typeof startDate !== "string" || !DATE_PATTERN.test(startDate)) {
    throw refuse("invalid-argument", "A start date (YYYY-MM-DD) is required.");
  }
  const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
  const doseText = text(medicine.doseText);
  const frequencyText = text(medicine.frequencyText);
  if (doseText.length > MAX_TEXT || frequencyText.length > MAX_TEXT || medicine.name.length > MAX_TEXT) {
    throw refuse("invalid-argument", "A value is too long.");
  }

  const db = getDb();
  const role = await isMember(db, parentId, uid);
  if (!role) throw refuse("permission-denied", "Only an owner or editor can confirm a medicine.");

  // The prescription must be this parent's own (its path is under the parent) and not discarded.
  const rxRef = db.doc(`parents/${parentId}/prescriptions/${prescriptionId}`);
  const rxSnap = await rxRef.get();
  const rx = rxSnap.exists ? (rxSnap.data() as { status?: string } | undefined) : undefined;
  if (!rx || rx.status === "discarded" || rx.status === "rejected") {
    throw refuse("failed-precondition", "This prescription is not available to confirm.");
  }

  const medicineRef = db.collection(`parents/${parentId}/medicines`).doc();
  await medicineRef.set({
    name: medicine.name.trim(),
    doseText,
    times,
    startDate,
    endDate: null,
    active: true,
    source: "prescription_scan",
    confirmedByHuman: true,
    prescriptionId,
    createdBy: uid,
    createdAt: Timestamp.now(),
    ...(frequencyText.length > 0 ? { frequencyText } : {}),
  });

  await rxRef.set({ status: "confirmed" }, { merge: true });

  console.info("prescription: medicine confirmed", { parentId, prescriptionId, medicineId: medicineRef.id });
  return { medicineId: medicineRef.id };
};

export const confirmPrescriptionMedicine = onCall({ region: "asia-south1" }, confirmPrescriptionMedicineHandler);
