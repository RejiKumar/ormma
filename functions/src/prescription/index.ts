import { onCall, type CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "../db";
import { createPrescriptionReview, scanPrescriptionImage } from "./scan";

export const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

export interface ScanPrescriptionPayload {
  parentId: string;
  storagePath: string;
}

const isMember = async (db: ReturnType<typeof getDb>, parentId: string, uid: string) => {
  const snap = await db.doc(`parents/${parentId}/members/${uid}`).get();
  if (!snap.exists) return null;
  const role = (snap.data() as { role?: string } | undefined)?.role;
  return role === "owner" || role === "editor" ? role : null;
};

export const scanPrescriptionHandler = async (
  request: CallableRequest<ScanPrescriptionPayload>,
  apiKey: string,
) => {
  const uid = request.auth?.uid;
  if (!uid) throw new Error("unauthenticated");
  const parentId = request.data?.parentId;
  const storagePath = request.data?.storagePath;
  if (typeof parentId !== "string" || typeof storagePath !== "string") throw new Error("invalid");

  const db = getDb();
  const role = await isMember(db, parentId, uid);
  if (!role) throw new Error("permission-denied");

  const bucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.STORAGE_BUCKET;
  if (!bucket) throw new Error("missing-bucket");

  const scan = await scanPrescriptionImage(bucket, storagePath, apiKey);
  const prescriptionId = await createPrescriptionReview(
    db,
    parentId,
    uid,
    storagePath,
    scan.extracted,
  );

  console.info("prescription: scanned", { parentId, prescriptionId, hasExtract: scan.extracted !== null });
  return { prescriptionId, status: "pending_review", hasExtract: scan.extracted !== null };
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

export const confirmPrescriptionMedicineHandler = async (
  request: CallableRequest<ConfirmPrescriptionMedicinePayload>,
) => {
  const uid = request.auth?.uid;
  if (!uid) throw new Error("unauthenticated");
  const parentId = request.data?.parentId;
  const prescriptionId = request.data?.prescriptionId;
  const medicine = request.data?.medicine;
  if (typeof parentId !== "string" || typeof prescriptionId !== "string" || !medicine) throw new Error("invalid");
  if (typeof medicine.name !== "string" || medicine.name.trim().length === 0) throw new Error("invalid");

  const db = getDb();
  const role = await isMember(db, parentId, uid);
  if (!role) throw new Error("permission-denied");

  const times = Array.isArray(medicine.times) && medicine.times.length > 0 ? medicine.times : ["08:00"];
  const startDate = typeof request.data.startDate === "string" ? request.data.startDate : new Date().toISOString().slice(0, 10);

  const medicineRef = db.collection(`parents/${parentId}/medicines`).doc();
  await medicineRef.set({
    name: medicine.name.trim(),
    doseText: typeof medicine.doseText === "string" ? medicine.doseText : "",
    times,
    startDate,
    endDate: null,
    active: true,
    source: "prescription_scan",
    confirmedByHuman: true,
    prescriptionId,
    createdBy: uid,
    createdAt: Timestamp.now(),
  });

  await db.doc(`parents/${parentId}/prescriptions/${prescriptionId}`).set({ status: "confirmed" }, { merge: true });

  console.info("prescription: medicine confirmed", { parentId, prescriptionId, medicineId: medicineRef.id });
  return { medicineId: medicineRef.id };
};

export const confirmPrescriptionMedicine = onCall({ region: "asia-south1" }, confirmPrescriptionMedicineHandler);
