import Anthropic from "@anthropic-ai/sdk";
import { StructuringError } from "../reply/errors";

export const WEEKLY_MODEL = "claude-haiku-5-5";
export const WEEKLY_MAX_TOKENS = 256;

const SYSTEM = `You write a weekly family summary. Input is structured numbers computed by code. You do NOT calculate. Write 5 to 8 lines, factual, no advice, no judgement words. End with: "Please share with the doctor if you have concerns." Use the family's language if specified.`;

export interface WeeklyNumbers {
  language: string;
  taken: number;
  missed: number;
  total: number;
  bpCurrentAvg: number | null;
  bpPrevAvg: number | null;
  sugarCurrentAvg: number | null;
  sugarPrevAvg: number | null;
  symptoms: string[];
}

export function buildWeeklyTemplate(n: WeeklyNumbers): string {
  const lines = [
    `This week: ${n.taken} taken, ${n.missed} missed out of ${n.total} doses.`,
  ];
  if (n.bpCurrentAvg !== null && n.bpPrevAvg !== null) {
    lines.push(`BP readings this week averaged ${Math.round(n.bpCurrentAvg)} compared with ${Math.round(n.bpPrevAvg)} last week.`);
  } else if (n.bpCurrentAvg !== null) {
    lines.push(`BP readings this week averaged ${Math.round(n.bpCurrentAvg)}.`);
  }
  if (n.sugarCurrentAvg !== null && n.sugarPrevAvg !== null) {
    lines.push(`Sugar readings this week averaged ${Math.round(n.sugarCurrentAvg)} compared with ${Math.round(n.sugarPrevAvg)} last week.`);
  } else if (n.sugarCurrentAvg !== null) {
    lines.push(`Sugar readings this week averaged ${Math.round(n.sugarCurrentAvg)}.`);
  }
  if (n.symptoms.length > 0) lines.push(`Symptoms noted: ${n.symptoms.join(", ")}.`);
  lines.push("Please share with the doctor if you have concerns.");
  return lines.slice(0, 8).join("\n");
}

export async function generateWeeklySummary(
  numbers: WeeklyNumbers,
  apiKey?: string,
): Promise<string> {
  if (!apiKey) return buildWeeklyTemplate(numbers);
  try {
    const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 20_000 });
    const user = JSON.stringify({ numbers, instruction: "Write 5-8 lines factual, no advice/judgement, end with required sentence." });
    const message = (await client.messages.create({
      model: WEEKLY_MODEL,
      max_tokens: WEEKLY_MAX_TOKENS,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    })) as Anthropic.Message;
    const parts: string[] = [];
    for (const block of message.content) {
      if (block.type === "text") parts.push(block.text);
    }
    const text = parts.join("").trim();
    if (!text) throw new StructuringError("empty_response");
    if (!text.includes("Please share with the doctor if you have concerns.")) {
      return buildWeeklyTemplate(numbers);
    }
    return text;
  } catch {
    return buildWeeklyTemplate(numbers);
  }
}
