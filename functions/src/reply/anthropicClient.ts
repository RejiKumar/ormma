import Anthropic from "@anthropic-ai/sdk";
import { StructuringError } from "./errors";

export const REPLY_MODEL = "claude-haiku-5-5";
export const REPLY_MAX_TOKENS = 512;

export interface ReplyModelClient {
  complete(system: string, user: string): Promise<string>;
}

type AnthropicLike = Pick<Anthropic, "messages">;

function errorCode(error: unknown): StructuringError {
  if (error instanceof StructuringError) return error;
  const shape = error as { status?: unknown; name?: unknown } | null;
  if (typeof shape?.status === "number") return new StructuringError(`http_${shape.status}`);
  if (typeof shape?.name === "string" && /timeout/i.test(shape.name)) {
    return new StructuringError("timeout");
  }
  return new StructuringError("network");
}

export class AnthropicReplyModelClient implements ReplyModelClient {
  private readonly client: AnthropicLike;

  constructor(apiKey: string, client?: AnthropicLike) {
    this.client =
      client ??
      new Anthropic({
        apiKey,
        maxRetries: 0,
        timeout: 20_000,
      });
  }

  async complete(system: string, user: string): Promise<string> {
    let message: Anthropic.Message;
    try {
      message = (await this.client.messages.create({
        model: REPLY_MODEL,
        max_tokens: REPLY_MAX_TOKENS,
        system,
        messages: [{ role: "user", content: user }],
      })) as Anthropic.Message;
    } catch (error) {
      throw errorCode(error);
    }

    const parts: string[] = [];
    for (const block of message.content) {
      if (block.type === "text") parts.push(block.text);
    }
    const text = parts.join("").trim();
    if (text.length === 0) throw new StructuringError("empty_response");
    return text;
  }
}
