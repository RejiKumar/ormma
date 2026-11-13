// Go-live readiness check for real check-in calls (docs/GO-LIVE.md, phase 2).
// Run from the repo root:  node scripts/check-go-live.mjs            (project ormma-prod)
//                          node scripts/check-go-live.mjs --project <id>
// It reads only secret NAMES and metadata (never values), your local settings file and the public
// function addresses. It changes nothing.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const project = args.includes("--project") ? args[args.indexOf("--project") + 1] : "ormma-prod";
const region = "asia-south1";
const base = `https://${region}-${project}.cloudfunctions.net`;

const SECRETS = [
  "EXOTEL_ACCOUNT_SID",
  "EXOTEL_API_KEY",
  "EXOTEL_API_TOKEN",
  "EXOTEL_CALLER_ID",
  "EXOTEL_FLOW_URL",
  "EXOTEL_WEBHOOK_URL",
  "EXOTEL_WEBHOOK_TOKEN",
  "VOICE_PROMPT_TOKEN",
  "VOICE_AUDIO_BASE_URL",
  "GOOGLE_TTS_API_KEY",
  "GOOGLE_STT_API_KEY",
  "ANTHROPIC_API_KEY",
];
const FUNCTIONS = ["exotelWebhook", "voicePrompt", "voiceReply", "getCallStatus", "scanPrescription"];

const results = [];
const record = (ok, title, detail = "") => {
  results.push({ ok, title, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${title}${detail ? `\n      ${detail}` : ""}`);
};
const warn = (title, detail = "") => {
  results.push({ ok: true, warn: true, title, detail });
  console.log(`WARN  ${title}${detail ? `\n      ${detail}` : ""}`);
};

const firebase = (cliArgs) =>
  execFileSync("firebase", [...cliArgs, "--project", project], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    timeout: 60_000,
  });

console.log(`Go-live check for ${project}\n`);

// 1. Secrets exist (metadata only).
const missingSecrets = [];
for (const name of SECRETS) {
  try {
    firebase(["functions:secrets:get", name]);
  } catch {
    missingSecrets.push(name);
  }
}
record(
  missingSecrets.length === 0,
  `All ${SECRETS.length} secrets are set`,
  missingSecrets.length > 0
    ? `Missing: ${missingSecrets.join(", ")}. Set each with: firebase functions:secrets:set NAME --project ${project}`
    : "A secret that exists can still hold a placeholder: this check cannot read values. The Exotel ones are proved by the test call; the Google keys by functions/scripts/try-speech.mjs.",
);

// 2. Local settings for the go-live moment.
const envPath = join(root, "functions", `.env.${project}`);
if (!existsSync(envPath)) {
  record(false, `Settings file functions/.env.${project} exists`, "Create it with CALL_PROVIDER=exotel and CALLS_LIVE_FROM=<ISO time>.");
} else {
  const values = Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
  );
  record(values.CALL_PROVIDER === "exotel", "CALL_PROVIDER is exotel", values.CALL_PROVIDER ? `It is "${values.CALL_PROVIDER}".` : "It is not set, so calling stays off.");
  const live = Date.parse(values.CALLS_LIVE_FROM ?? "");
  if (Number.isNaN(live)) {
    record(false, "CALLS_LIVE_FROM is a valid ISO time", "Example: CALLS_LIVE_FROM=2026-12-01T09:00:00+05:30");
  } else if (live < Date.now()) {
    warn("CALLS_LIVE_FROM is in the past", "Doses scheduled before it are never called. Fine once you are live; for the first test set it a few minutes ahead and redeploy.");
  } else {
    record(true, "CALLS_LIVE_FROM is in the future", new Date(live).toString());
  }
}

// 3. Functions deployed and healthy.
let deployed = "";
try {
  deployed = firebase(["functions:list"]);
} catch {
  deployed = "";
}
if (deployed === "") {
  record(false, "Functions list could be read", "Run: firebase login, then try again.");
} else {
  const absent = FUNCTIONS.filter((name) => !new RegExp(`\\b${name}\\b`, "i").test(deployed));
  record(absent.length === 0, "Call and reading functions are deployed", absent.length > 0 ? `Not deployed: ${absent.join(", ")}` : "");
}

// 4. The public endpoints answer, and refuse a request that has no token.
for (const path of ["voicePrompt?kind=greeting", "exotelWebhook?kind=status", "voiceReply"]) {
  try {
    const response = await fetch(`${base}/${path}`, { method: path === "voiceReply" ? "POST" : "GET" });
    record([401, 403].includes(response.status), `/${path.split("?")[0]} is up and token-protected`, `Answered ${response.status} without a token (expected 401 or 403).`);
  } catch (error) {
    record(false, `/${path.split("?")[0]} is reachable`, String(error?.message ?? error));
  }
}

const failed = results.filter((r) => !r.ok);
console.log(
  failed.length === 0
    ? "\nReady. Next: place one test call to your own phone (docs/GO-LIVE.md step 7) and watch: firebase functions:log --project " + project
    : `\n${failed.length} check(s) failed. Fix them, then run this again.`,
);
process.exit(failed.length === 0 ? 0 : 1);
