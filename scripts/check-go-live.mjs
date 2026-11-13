// Go-live readiness check for real check-in calls (docs/GO-LIVE.md, phase 2; docs/TWILIO-FLOW.md).
// Run from the repo root:  node scripts/check-go-live.mjs                      (project ormma-prod)
//                          node scripts/check-go-live.mjs --project <id>
//                          node scripts/check-go-live.mjs --provider twilio    (overrides the settings file)
// It reads only secret NAMES and metadata (never values), your local settings file and the public
// function addresses. It changes nothing. The provider is CALL_PROVIDER from functions/.env.<project>
// (exotel or twilio); without one it checks Exotel, the original provider.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const project = flag("--project") ?? "ormma-prod";
const region = "asia-south1";
const base = `https://${region}-${project}.cloudfunctions.net`;

const COMMON_SECRETS = ["VOICE_PROMPT_TOKEN", "VOICE_AUDIO_BASE_URL", "GOOGLE_TTS_API_KEY", "GOOGLE_STT_API_KEY", "ANTHROPIC_API_KEY"];
const PROVIDERS = {
  exotel: {
    secrets: [
      "EXOTEL_ACCOUNT_SID",
      "EXOTEL_API_KEY",
      "EXOTEL_API_TOKEN",
      "EXOTEL_CALLER_ID",
      "EXOTEL_FLOW_URL",
      "EXOTEL_WEBHOOK_URL",
      "EXOTEL_WEBHOOK_TOKEN",
      ...COMMON_SECRETS,
    ],
    functions: ["exotelWebhook", "voicePrompt", "voiceReply", "getCallStatus", "scanPrescription"],
    // A request with no token is refused with 401.
    endpoints: [
      { path: "voicePrompt?kind=greeting", method: "GET", expect: [401, 403] },
      { path: "exotelWebhook?kind=status", method: "GET", expect: [401, 403] },
      { path: "voiceReply", method: "POST", expect: [401, 403] },
    ],
  },
  twilio: {
    secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER", ...COMMON_SECRETS],
    functions: ["twilioVoice", "twilioStatus", "voicePrompt", "voiceAudio", "getCallStatus", "scanPrescription"],
    // Twilio calls these with a signature; an unsigned request is refused with 403.
    endpoints: [
      { path: "twilioVoice?step=greeting&parentId=check", method: "POST", expect: [403] },
      { path: "twilioStatus?parentId=check", method: "POST", expect: [403] },
      { path: "voiceAudio", method: "GET", expect: [401, 403] },
    ],
  },
};

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

// The local settings file decides the provider (unless --provider says otherwise).
const envPath = join(root, "functions", `.env.${project}`);
const values = existsSync(envPath)
  ? Object.fromEntries(
      readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
    )
  : null;
const providerName = flag("--provider") ?? values?.CALL_PROVIDER ?? "exotel";
const provider = PROVIDERS[providerName];
if (!provider) {
  console.log(`Unknown provider "${providerName}". Use exotel or twilio.`);
  process.exit(1);
}

console.log(`Go-live check for ${project} (provider: ${providerName})\n`);

// 1. Secrets exist (metadata only).
const missingSecrets = [];
for (const name of provider.secrets) {
  try {
    firebase(["functions:secrets:get", name]);
  } catch {
    missingSecrets.push(name);
  }
}
record(
  missingSecrets.length === 0,
  `All ${provider.secrets.length} secrets are set`,
  missingSecrets.length > 0
    ? `Missing: ${missingSecrets.join(", ")}. Set each with: firebase functions:secrets:set NAME --project ${project}`
    : providerName === "twilio"
      ? "A secret that exists can still hold a placeholder: this check cannot read values. The Twilio ones are proved by the test call; the Google keys by functions/scripts/try-speech.mjs."
      : "A secret that exists can still hold a placeholder: this check cannot read values. The Exotel ones are proved by the test call; the Google keys by functions/scripts/try-speech.mjs.",
);

// 2. Local settings for the go-live moment.
if (values === null) {
  record(false, `Settings file functions/.env.${project} exists`, `Create it with CALL_PROVIDER=${providerName}${providerName === "twilio" ? ", TWILIO_PUBLIC_BASE_URL=" + base : ""} and CALLS_LIVE_FROM=<ISO time>.`);
} else {
  record(values.CALL_PROVIDER === providerName, `CALL_PROVIDER is ${providerName}`, values.CALL_PROVIDER ? `It is "${values.CALL_PROVIDER}".` : "It is not set, so calling stays off.");
  if (providerName === "twilio") {
    const publicBase = values.TWILIO_PUBLIC_BASE_URL ?? "";
    record(
      /^https:\/\/[^/\s]+/.test(publicBase),
      "TWILIO_PUBLIC_BASE_URL is an https address",
      publicBase ? `It is "${publicBase}". Twilio signs this exact address, so it must be the public functions address (${base}).` : `Set it to ${base}.`,
    );
  }
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
  const absent = provider.functions.filter((name) => !new RegExp(`\\b${name}\\b`, "i").test(deployed));
  record(absent.length === 0, "Call and reading functions are deployed", absent.length > 0 ? `Not deployed: ${absent.join(", ")}` : "");
}

// 4. The public endpoints answer, and refuse a request that has no proof it came from the provider.
for (const endpoint of provider.endpoints) {
  const name = endpoint.path.split("?")[0];
  try {
    const response = await fetch(`${base}/${endpoint.path}`, { method: endpoint.method });
    record(
      endpoint.expect.includes(response.status),
      `/${name} is up and protected`,
      `Answered ${response.status} to an unsigned request (expected ${endpoint.expect.join(" or ")}).`,
    );
  } catch (error) {
    record(false, `/${name} is reachable`, String(error?.message ?? error));
  }
}

const failed = results.filter((r) => !r.ok);
console.log(
  failed.length === 0
    ? "\nReady. Next: place one test call to your own phone (docs/GO-LIVE.md step 7, or docs/TWILIO-FLOW.md) and watch: firebase functions:log --project " + project
    : `\n${failed.length} check(s) failed. Fix them, then run this again.`,
);
// Set the code and let the process end by itself: process.exit with open network handles trips a libuv assertion on Windows.
process.exitCode = failed.length === 0 ? 0 : 1;
