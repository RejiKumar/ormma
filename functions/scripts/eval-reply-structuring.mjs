import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const { structureReply } = require(join(root, "lib/functions/src/reply/replyStructuring.js"));
const { createReplyModelClient } = require(join(root, "lib/functions/src/reply/config.js"));

function canonicalReading(reading) {
  return reading.type === "bp"
    ? `bp:${reading.systolic}/${reading.diastolic}`
    : `sugar:${reading.value}`;
}

function sameReadings(actual, expected) {
  const a = actual.map(canonicalReading).sort();
  const b = expected.map(canonicalReading).sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function scoreCase(result, expected) {
  return {
    tookMedicine: result.tookMedicine === expected.tookMedicine,
    urgent: result.urgent === expected.urgent,
    readings: sameReadings(result.readings, expected.readings),
    confirmationNote: (result.confirmationNote !== null) === expected.hasConfirmationNote,
  };
}

async function main() {
  const client = createReplyModelClient();
  if (!client) {
    console.error("ANTHROPIC_API_KEY is not set. This eval needs a real key and costs tokens.");
    process.exit(2);
  }

  const fixtures = JSON.parse(
    readFileSync(join(root, "test/fixtures/reply-transcripts.json"), "utf8"),
  );

  const totals = { tookMedicine: 0, urgent: 0, readings: 0, confirmationNote: 0 };
  let failedCases = 0;

  for (const entry of fixtures.cases) {
    try {
      const result = await structureReply(
        { transcript: entry.transcript, language: entry.language, question: entry.question },
        { client },
      );
      const scores = scoreCase(result, entry.expected);
      for (const field of Object.keys(totals)) {
        if (scores[field]) totals[field] += 1;
      }
      const passed = Object.values(scores).every(Boolean);
      if (!passed) failedCases += 1;
      console.log(`${entry.id}: ${passed ? "PASS" : "FAIL"} ${JSON.stringify(scores)}`);
    } catch (error) {
      failedCases += 1;
      console.log(`${entry.id}: ERROR ${error?.code ?? "unknown"}`);
    }
  }

  const count = fixtures.cases.length;
  console.log(`cases: ${count - failedCases}/${count} passed`);
  for (const [field, value] of Object.entries(totals)) {
    console.log(`${field}: ${value}/${count} (${((value / count) * 100).toFixed(1)}%)`);
  }

  if (failedCases > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`eval failed: ${error?.code ?? "unknown"}`);
  process.exit(1);
});
