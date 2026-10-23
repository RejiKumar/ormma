import { defineSecret } from "firebase-functions/params";
import { AnthropicReplyModelClient } from "./anthropicClient";

export const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
export const AI_SECRETS = [ANTHROPIC_API_KEY];

/** Null when Claude is not configured, so the caller can fall back to DTMF-only. */
export function createReplyModelClient(
  env: NodeJS.ProcessEnv = process.env,
): AnthropicReplyModelClient | null {
  const apiKey = env.ANTHROPIC_API_KEY;
  return apiKey ? new AnthropicReplyModelClient(apiKey) : null;
}
