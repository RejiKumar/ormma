import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import Anthropic from "@anthropic-ai/sdk";
import { parsePrescriptionJson } from "./schema";

export const PRESCRIPTION_MODEL = "claude-sonnet-5-5";
export const PRESCRIPTION_MAX_TOKENS = 4096;

const SYSTEM = `You read prescription photos. Return ONLY JSON matching this schema:
{"doctor": string|null, "date": string|null, "medicines": [{"name": string, "doseText": string|null, "frequencyText": string|null, "times": string[]|null, "confidence": number, "illegible": boolean}], "overallConfidence": number}
Rules: transcribe medicine names exactly as written. Do not correct or substitute. doseText copied as written; do not normalise or infer. If handwriting unclear put best guess with confidence < 0.5 and illegible true. Do not give advice.`;

export type ScanFailure = "not_found" | "download" | "unsupported_image" | "image_too_large" | "api" | "empty" | "truncated" | "invalid_json" | "invalid_shape";

export interface ScanResult {
  extracted: ReturnType<typeof parsePrescriptionJson> | null;
  ok: boolean;
  /** Why nothing was extracted. A stage name only: never the image, the text read or a model message. */
  failure?: ScanFailure;
}

function toBase64(buf: Buffer): string {
  return buf.toString("base64");
}

/** Status code of an API error, when there is one. */
function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

/**
 * The API's own error type and a short message about the request (for example "image exceeds 5 MB").
 * These describe the request, never the content read from the page; the text is capped.
 */
function apiDetail(error: unknown): { apiType?: string; apiMessage?: string } {
  const body = (error as { error?: { error?: { type?: unknown; message?: unknown } } } | null)?.error?.error;
  return {
    apiType: typeof body?.type === "string" ? body.type.slice(0, 60) : undefined,
    apiMessage: typeof body?.message === "string" ? body.message.slice(0, 160) : undefined,
  };
}

function failed(failure: ScanFailure, status?: number, detail: object = {}): ScanResult {
  // Ids and stage only (hard rule 6): no health data, no text read from the page.
  console.warn("prescription: read failed", { failure, status, ...detail });
  return { extracted: null, ok: false, failure };
}

type ImageType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/** The real format from the file's first bytes, so the declared type always matches the data. */
export function detectImageType(buf: Buffer): ImageType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 6 && buf.toString("ascii", 0, 3) === "GIF") return "image/gif";
  return null;
}

/** The API accepts images up to 5 MB. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function scanPrescriptionImage(
  bucketName: string,
  storagePath: string,
  apiKey: string,
): Promise<ScanResult> {
  const file = getStorage().bucket(bucketName).file(storagePath);
  let buffer: Buffer;
  try {
    const [exists] = await file.exists();
    if (!exists) return failed("not_found");
    [buffer] = await file.download();
  } catch {
    return failed("download");
  }

  const mediaType = detectImageType(buffer);
  if (!mediaType) return failed("unsupported_image");
  if (buffer.length > MAX_IMAGE_BYTES) return failed("image_too_large");

  let message: Anthropic.Message;
  try {
    const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 60_000 });
    message = (await client.messages.create({
      model: PRESCRIPTION_MODEL,
      max_tokens: PRESCRIPTION_MAX_TOKENS,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: toBase64(buffer) } },
            { type: "text", text: "Read this prescription." },
          ],
        },
      ],
    })) as Anthropic.Message;
  } catch (error) {
    return failed("api", statusOf(error), apiDetail(error));
  }

  const parts: string[] = [];
  for (const block of message.content) {
    if (block.type === "text") parts.push(block.text);
  }
  const text = parts.join("").trim();
  if (text.length === 0) return failed("empty");
  if (message.stop_reason === "max_tokens") return failed("truncated");

  let payload: unknown;
  try {
    payload = JSON.parse(extractJsonText(text));
  } catch {
    return failed("invalid_json");
  }
  try {
    return { extracted: parsePrescriptionJson(JSON.stringify(payload)), ok: true };
  } catch {
    // Output that does not match the schema is never saved as if it were valid (hard rule 4).
    return failed("invalid_shape");
  }
}

function extractJsonText(text: string): string {
  let clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) clean = clean.slice(start, end + 1);
  return clean;
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
