import type { Language } from "../../../shared/types";
import {
  buildReplySystemPrompt,
  buildReplyUserMessage,
  REPLY_STRUCTURING_PROMPT_VERSION,
  type ReplyQuestion,
} from "../prompts/replyStructuring.v1";
import { findUrgentKeyword } from "../urgent-keywords";
import type { ReplyModelClient } from "./anthropicClient";
import { hasImplausibleReading, structuredReplySchema, type StructuredReply } from "./schema";

export const REPLY_REVIEW_MIN_CONFIDENCE = 0.6;

export type ReplyReviewReason = "low_confidence" | "invalid_output" | "implausible_reading";

export type StructuredReplyResult = Omit<StructuredReply, "confidence"> & {
  confidence: number | null;
  needsReview: boolean;
  reviewReasons: ReplyReviewReason[];
  canApplyDoseStatus: boolean;
  promptVersion: string;
  urgentSource: "keyword" | "model" | null;
};

export interface StructureReplyInput {
  transcript: string;
  language: Language;
  question: ReplyQuestion;
}

export interface StructureReplyOptions {
  client: ReplyModelClient;
  /** Fires as soon as a keyword matches, before the Anthropic request. */
  onUrgentKeyword?: (keyword: string) => void | Promise<void>;
}

class InvalidStructuredOutput extends Error {
  constructor() {
    super("invalid_structured_output");
  }
}

/** Accepts JSON only, but tolerates a code fence or surrounding prose around the outer object. */
export function parseStructuredReply(text: string): StructuredReply {
  let clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) clean = clean.slice(start, end + 1);

  let payload: unknown;
  try {
    payload = JSON.parse(clean);
  } catch {
    throw new InvalidStructuredOutput();
  }

  const parsed = structuredReplySchema.safeParse(payload);
  if (!parsed.success) throw new InvalidStructuredOutput();
  return parsed.data;
}

function invalidResult(input: StructureReplyInput, keyword: string | null): StructuredReplyResult {
  return {
    tookMedicine: null,
    readings: [],
    symptoms: [],
    confirmationNote: null,
    urgent: keyword !== null,
    confidence: null,
    language: input.language,
    needsReview: true,
    reviewReasons: ["invalid_output"],
    canApplyDoseStatus: false,
    promptVersion: REPLY_STRUCTURING_PROMPT_VERSION,
    urgentSource: keyword === null ? null : "keyword",
  };
}

/**
 * Keyword check, then Claude, then validation. Invalid JSON/schema is retried once; after that the
 * result is safe (tookMedicine null) and needs review. Low confidence or an implausible reading also
 * needs review and blocks an automatic dose change.
 */
export async function structureReply(
  input: StructureReplyInput,
  options: StructureReplyOptions,
): Promise<StructuredReplyResult> {
  const keyword = findUrgentKeyword(input.transcript, input.language);
  if (keyword !== null) await options.onUrgentKeyword?.(keyword);

  const system = buildReplySystemPrompt(input.language, input.question);
  const user = buildReplyUserMessage(input.transcript, input.language, input.question);

  let parsed: StructuredReply | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const text = await options.client.complete(system, user);
    try {
      parsed = parseStructuredReply(text);
      break;
    } catch {
      parsed = null;
    }
  }

  if (parsed === null) return invalidResult(input, keyword);

  const reviewReasons: ReplyReviewReason[] = [];
  if (parsed.confidence < REPLY_REVIEW_MIN_CONFIDENCE) reviewReasons.push("low_confidence");
  if (hasImplausibleReading(parsed.readings)) reviewReasons.push("implausible_reading");

  return {
    ...parsed,
    urgent: keyword !== null || parsed.urgent,
    needsReview: reviewReasons.length > 0,
    reviewReasons,
    canApplyDoseStatus: reviewReasons.length === 0,
    promptVersion: REPLY_STRUCTURING_PROMPT_VERSION,
    urgentSource: keyword !== null ? "keyword" : parsed.urgent ? "model" : null,
  };
}
