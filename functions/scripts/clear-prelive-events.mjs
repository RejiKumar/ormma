// Removes dose events scheduled before the go-live instant. A DRY RUN unless you add --apply.
//
// Run from the functions folder after `npm run build`, signed in with
//   gcloud auth application-default login
//   node scripts/clear-prelive-events.mjs --project ormma-prod --before 2026-12-01T09:00:00+05:30
//   node scripts/clear-prelive-events.mjs --project ormma-prod --before 2026-12-01T09:00:00+05:30 --apply
//
// It prints counts only. Use the same instant as CALLS_LIVE_FROM.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { clearPreLiveEvents } = require("../lib/functions/src/maintenance/clearPreLive.js");

const arg = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const project = arg("project");
const before = arg("before");
const apply = process.argv.includes("--apply");

if (!project || !before || Number.isNaN(Date.parse(before))) {
  console.error("Usage: node scripts/clear-prelive-events.mjs --project <id> --before <ISO time> [--apply]");
  process.exit(1);
}

initializeApp({ projectId: project });
const result = await clearPreLiveEvents({ db: getFirestore(), beforeMs: Date.parse(before), apply });
console.log(apply ? "APPLIED" : "DRY RUN (nothing was deleted)", `project=${project} before=${new Date(Date.parse(before)).toISOString()}`);
console.log(JSON.stringify(result, null, 2));
if (!apply && result.found > 0) console.log("Add --apply to delete the events above.");
