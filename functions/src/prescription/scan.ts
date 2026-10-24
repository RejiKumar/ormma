import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { getDownloadURL, getStorage } from "firebase-admin/storage";
import Anthropic from "@anthropic-ai/sdk";
import { StructuringError } from "../reply/errors";
import { parsePrescriptionJson } from "./schema";

export const PRESCRIPTION_MODEL = "claude-sonnet-5-5";
export const PRESCRIPTION_MAX_TOKENS = 1024;

const SYSTEM = `You read prescription photos. Return ONLY JSON matching this schema:
{"doctor": string|null, "date": string|null, "medicines": [{"name": string, "doseText": string|null, "frequencyText": string|null, "times": string[]|null, "confidence": number, "illegible": boolean}], "overallConfidence": number}
Rules: transcribe medicine names exactly as written. Do not correct or substitute. doseText copied as written; do not normalise or infer. If handwriting unclear put best guess with confidence < 0.5 and illegible true. Do not give advice.`;

export interface ScanResult {
  extracted: ReturnType<typeof parsePrescriptionJson> | null;
  ok: boolean;
}

function toBase64(buf: Buffer): string {
  return buf.toString("base64");
}

export async function scanPrescriptionImage(
  bucketName: string,
  storagePath: string,
  apiKey: string,
): Promise<ScanResult> {
  try {
    const bucket = getStorage().bucket(bucketName);
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) return { extracted: null, ok: false };

    const [buffer] = await file.download();
    const base64 = toBase64(buffer);
    const contentType = (file.metadata?.contentType as string | undefined) ?? "image/jpeg";

    const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 60_000 });
    const message = (await client.messages.create({
      model: PRESCRIPTION_MODEL,
      max_tokens: PRESCRIPTION_MAX_TOKENS,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: contentType as "image/jpeg", data: base64 },
            },
            { type: "text", text: "Read this prescription." },
          ],
        },
      ],
    })) as Anthropic.Message;

    const parts: string[] = [];
    for (const block of message.content) {
      if (block.type === "text") parts.push(block.text);
    }
    const text = parts.join("").trim();
    if (text.length === 0) throw new StructuringError("empty_response");

    try {
      const extracted = parsePrescriptionJson(text);
      return { extracted, ok: true };
    } catch {
      return { extracted: null, ok: false };
    }
  } catch {
    return { extracted: null, ok: false };
  }
}

export async function createPrescriptionReview(
  db: Firestore,
  parentId: string,
  uploadedBy: string,
  storagePath: string,
  extracted: ReturnType<typeof parsePrescriptionJson> | null,
): Promise<string> {
  const ref = db.collection(`parents/${parentId}/prescriptions`).doc();
  await ref.set({
    storagePath,
    status: "pending_review",
    extracted,
    uploadedBy,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}
