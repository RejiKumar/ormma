import {
  AnthropicReplyModelClient,
  REPLY_MAX_TOKENS,
  REPLY_MODEL,
} from "./anthropicClient";

type Sdk = ConstructorParameters<typeof AnthropicReplyModelClient>[1];

const sdkWith = (create: jest.Mock): Sdk =>
  ({ messages: { create } }) as unknown as Sdk;

const textMessage = (texts: string[]) => ({
  content: texts.map((text) => ({ type: "text", text })),
});

describe("AnthropicReplyModelClient", () => {
  it("uses the documented model and small token budget without sampling parameters", async () => {
    const create = jest.fn().mockResolvedValue(textMessage(["{}"]));
    const client = new AnthropicReplyModelClient("key", sdkWith(create));

    await client.complete("system prompt", '{"transcript":"hello"}');

    expect(create).toHaveBeenCalledWith({
      model: REPLY_MODEL,
      max_tokens: REPLY_MAX_TOKENS,
      system: "system prompt",
      messages: [{ role: "user", content: '{"transcript":"hello"}' }],
    });
    expect(REPLY_MODEL).toBe("claude-haiku-5-5");
    expect(REPLY_MAX_TOKENS).toBeLessThanOrEqual(512);
  });

  it("joins text blocks and trims them", async () => {
    const create = jest.fn().mockResolvedValue(textMessage(["  {", "}  "]));
    const client = new AnthropicReplyModelClient("key", sdkWith(create));
    await expect(client.complete("s", "u")).resolves.toBe("{}");
  });

  it("rejects an empty response", async () => {
    const create = jest.fn().mockResolvedValue(textMessage(["   "]));
    const client = new AnthropicReplyModelClient("key", sdkWith(create));
    await expect(client.complete("s", "u")).rejects.toMatchObject({ code: "empty_response" });
  });

  it("maps failures to codes only without response content", async () => {
    const httpError = Object.assign(new Error("secret response"), { status: 529 });
    await expect(
      new AnthropicReplyModelClient("k", sdkWith(jest.fn().mockRejectedValue(httpError))).complete(
        "s",
        "u",
      ),
    ).rejects.toMatchObject({ code: "http_529", message: "structuring:http_529" });

    const timeout = Object.assign(new Error("secret response"), {
      name: "APIConnectionTimeoutError",
    });
    await expect(
      new AnthropicReplyModelClient("k", sdkWith(jest.fn().mockRejectedValue(timeout))).complete(
        "s",
        "u",
      ),
    ).rejects.toMatchObject({ code: "timeout" });

    await expect(
      new AnthropicReplyModelClient(
        "k",
        sdkWith(jest.fn().mockRejectedValue(new TypeError("offline"))),
      ).complete("s", "u"),
    ).rejects.toMatchObject({ code: "network" });
  });
});
