/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles */

import { getStorage } from "firebase-admin/storage";
import Anthropic from "@anthropic-ai/sdk";
import { scanPrescriptionImage } from "./scan";

jest.mock("firebase-admin/storage");
jest.mock("@anthropic-ai/sdk");

const goodJson = JSON.stringify({
  doctor: null,
  date: null,
  medicines: [{ name: "Metformin", doseText: "500mg", frequencyText: null, times: null, confidence: 0.9, illegible: false }],
  overallConfidence: 0.9,
});

function arrange(opts: { exists?: boolean; download?: "ok" | "throw"; reply?: any; apiError?: any }) {
  const file = {
    exists: jest.fn().mockResolvedValue([opts.exists ?? true]),
    download:
      opts.download === "throw" ? jest.fn().mockRejectedValue(new Error("x")) : jest.fn().mockResolvedValue([Buffer.from("img")]),
  };
  (getStorage as jest.Mock).mockReturnValue({ bucket: () => ({ file: () => file }) });
  const create = opts.apiError
    ? jest.fn().mockRejectedValue(opts.apiError)
    : jest.fn().mockResolvedValue(opts.reply ?? { content: [{ type: "text", text: goodJson }], stop_reason: "end_turn" });
  (Anthropic as unknown as jest.Mock).mockImplementation(() => ({ messages: { create } }));
  return { create };
}

describe("scanPrescriptionImage", () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  it("returns the validated medicines on success", async () => {
    const { create } = arrange({});
    const result = await scanPrescriptionImage("b", "prescriptions/p1/a.jpg", "key");
    expect(result.ok).toBe(true);
    expect(result.extracted?.medicines[0].name).toBe("Metformin");
    expect(create.mock.calls[0][0].max_tokens).toBeGreaterThanOrEqual(4096);
    expect(warn).not.toHaveBeenCalled();
  });

  it("accepts JSON wrapped in a code fence", async () => {
    arrange({ reply: { content: [{ type: "text", text: "```json\n" + goodJson + "\n```" }], stop_reason: "end_turn" } });
    expect((await scanPrescriptionImage("b", "p", "k")).ok).toBe(true);
  });

  it.each([
    ["not_found", () => arrange({ exists: false })],
    ["download", () => arrange({ download: "throw" })],
    ["api", () => arrange({ apiError: Object.assign(new Error("secret text"), { status: 401 }) })],
    ["empty", () => arrange({ reply: { content: [], stop_reason: "end_turn" } })],
    ["truncated", () => arrange({ reply: { content: [{ type: "text", text: goodJson.slice(0, 40) }], stop_reason: "max_tokens" } })],
    ["invalid_json", () => arrange({ reply: { content: [{ type: "text", text: "no json here" }], stop_reason: "end_turn" } })],
    [
      "invalid_shape",
      () => arrange({ reply: { content: [{ type: "text", text: JSON.stringify({ medicines: [{ name: 5 }] }) }], stop_reason: "end_turn" } }),
    ],
  ])("fails at the %s stage with nothing extracted and no content logged", async (stage, setup) => {
    setup();
    const result = await scanPrescriptionImage("b", "p", "k");
    expect(result).toMatchObject({ ok: false, extracted: null, failure: stage });
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain(stage);
    expect(logged).not.toMatch(/secret text|Metformin|500mg/);
  });

  it("logs only the HTTP status of an API error", async () => {
    arrange({ apiError: Object.assign(new Error("secret text"), { status: 404 }) });
    await scanPrescriptionImage("b", "p", "k");
    expect(warn.mock.calls[0][1]).toEqual({ failure: "api", status: 404 });
  });
});
