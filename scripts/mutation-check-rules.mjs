// Mutation check for the security rules: for each mutation, weaken one rule in a temporary copy of
// firestore.rules (or storage.rules) and confirm that the test(s) that claim to cover that rule FAIL.
// A test that still passes against a weakened rule would be vacuous.
//
// Run inside the emulators:  npm run test:rules:mutations
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const fsRules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const stRules = fs.readFileSync(path.join(root, "storage.rules"), "utf8");

// [label, file, find, replace, jest -t pattern of the test that must fail]
const M = [
  [
    "unauthenticated read of parents",
    "fs",
    "allow read: if isMember(parentId);\n      // Parents are created",
    "allow read: if true;\n      // Parents are created",
    "Rules test 1:",
  ],
  [
    "non-member reads medicines",
    "fs",
    "match /medicines/{medicineId} {\n        allow read: if isMember(parentId);",
    "match /medicines/{medicineId} {\n        allow read: if signedIn();",
    "Rules test 2:",
  ],
  [
    "viewer writes medicines",
    "fs",
    "allow update: if canEdit(parentId)\n          && validMedicine",
    "allow update: if isMember(parentId)\n          && validMedicine",
    "Rules test 3:",
  ],
  [
    "editor adds members",
    "fs",
    "match /members/{uid} {\n        allow read: if isMember(parentId);\n        allow write: if false;",
    "match /members/{uid} {\n        allow read: if isMember(parentId);\n        allow write: if canEdit(parentId);",
    "Rules test 4:",
  ],
  [
    "owner writes consent",
    "fs",
    ".hasOnly(['name', 'phone', 'language', 'timezone', 'active', 'callPolicy'])",
    ".hasOnly(['name', 'phone', 'language', 'timezone', 'active', 'callPolicy', 'consent'])",
    "Rules test 5:",
  ],
  [
    "client writes callSessions",
    "fs",
    "match /callSessions/{sessionId} {\n        allow read, write: if false;",
    "match /callSessions/{sessionId} {\n        allow read, write: if signedIn();",
    "Rules test 5:",
  ],
  [
    "client writes auditLogs",
    "fs",
    "match /auditLogs/{id} {\n      allow read, write: if false;",
    "match /auditLogs/{id} {\n      allow read, write: if signedIn();",
    "Rules test 5:",
  ],
  [
    "removed member keeps access",
    "fs",
    "return signedIn() && exists(memberPath(parentId, request.auth.uid));",
    "return signedIn();",
    "Rules test 6:",
  ],
  [
    "resolvedBy dtmf allowed",
    "fs",
    "&& newData.resolvedBy == 'family'",
    "&& newData.resolvedBy in ['family', 'dtmf']",
    "Rules test 7:",
  ],
  [
    "status missed allowed for clients",
    "fs",
    "&& newData.status in ['taken', 'not_taken']",
    "&& newData.status in ['taken', 'not_taken', 'missed']",
    "Rules test 7:",
  ],
  [
    "missedAt changeable",
    "fs",
    ".hasOnly(['status', 'resolvedAt', 'resolvedBy', 'resolvedByUid'])",
    ".hasOnly(['status', 'resolvedAt', 'resolvedBy', 'resolvedByUid', 'missedAt'])",
    "Rules test 8:",
  ],
  [
    "taken moves back to missed (status list and terminal-taken clause both weakened)",
    "fs",
    ["&& newData.status in ['taken', 'not_taken']", "&& oldData.status != 'taken'\n"],
    ["&& newData.status in ['taken', 'not_taken', 'missed']", "\n"],
    "Rules test 8:",
  ],
  [
    "revokedAt boundary inclusive",
    "fs",
    "|| ts < revokedAt",
    "|| ts <= revokedAt",
    "Rules test 9:",
  ],
  [
    "revoked data visible to non-owners",
    "fs",
    "return revokedAt == null\n        || ts < revokedAt\n        || (regrantedAt != null && ts >= regrantedAt);",
    "return true;",
    "Rules test 9:",
  ],
  [
    "visibility blocks before revocation",
    "fs",
    "return revokedAt == null\n        || ts < revokedAt\n        || (regrantedAt != null && ts >= regrantedAt);",
    "return false;",
    "Rules test 10:",
  ],
  [
    "viewer updates doseEvents",
    "fs",
    "allow update: if canEdit(parentId) && doseClientUpdate",
    "allow update: if isMember(parentId) && doseClientUpdate",
    "Rules test 11:",
  ],
  [
    "resolvedByUid not required",
    "fs",
    "&& newData.resolvedByUid == request.auth.uid",
    "",
    "Rules test 12:",
  ],
  [
    "re-grant clause missing",
    "fs",
    "|| (regrantedAt != null && ts >= regrantedAt);",
    ";",
    "Rules test 13:",
  ],
  [
    "data between revoke and re-grant visible",
    "fs",
    "|| (regrantedAt != null && ts >= regrantedAt);",
    "|| (regrantedAt != null);",
    "Rules test 13:",
  ],
  [
    "null regrantedAt treated as visible",
    "fs",
    "|| (regrantedAt != null && ts >= regrantedAt);",
    "|| (regrantedAt == null || ts >= regrantedAt);",
    "Rules test 14:",
  ],
  [
    "client creates parents",
    "fs",
    "allow create: if false;\n      // Owner only.",
    "allow create: if signedIn();\n      // Owner only.",
    "Rules test 15:",
  ],
  [
    "viewer writes confirmedByHuman",
    "fs",
    "allow create: if canEdit(parentId)\n          && validMedicine(request.resource.data)",
    "allow create: if isMember(parentId)\n          && validMedicine(request.resource.data)",
    "Rules test 16:",
  ],
  [
    "viewer updates confirmedByHuman",
    "fs",
    "allow update: if canEdit(parentId)\n          && validMedicine",
    "allow update: if isMember(parentId)\n          && validMedicine",
    "Rules test 16:",
  ],
  [
    "non-editor uploads prescriptions",
    "st",
    "allow create, update: if canEdit(parentId)",
    "allow create, update: if request.auth != null",
    "owner and editor upload an image",
  ],
  [
    "non-image upload allowed",
    "st",
    "\n        && request.resource.contentType.matches('image/.*')",
    "",
    "images only",
  ],
  [
    "size limit raised to 100 MB",
    "st",
    "request.resource.size <= 10 * 1024 * 1024",
    "request.resource.size <= 100 * 1024 * 1024",
    "max 10 MB",
  ],
  [
    "any signed-in user reads prescriptions",
    "st",
    "allow read: if canEdit(parentId);",
    "allow read: if request.auth != null;",
    "only owner and editor of that parent can read",
  ],
  [
    "membership ignored in storage",
    "st",
    "return request.auth != null\n        && firestore.exists",
    "return request.auth != null || firestore.exists",
    "removed member loses Storage access",
  ],
  [
    "transcripts open to signed-in users",
    "st",
    "match /transcripts/{allPaths=**} {\n      allow read, write: if false;",
    "match /transcripts/{allPaths=**} {\n      allow read, write: if request.auth != null;",
    "no client can read or write /transcripts",
  ],
  [
    "unmatched storage paths open",
    "st",
    "match /{allPaths=**} {\n      allow read, write: if false;",
    "match /{allPaths=**} {\n      allow read, write: if true;",
    "paths outside the rules are denied",
  ],
];

if (process.argv.includes("--list")) {
  for (const m of M) console.log(`${m[4]}  ${m[0]}`);
  process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ormma-mut-"));
const shell = process.platform === "win32";
let escaped = 0;
for (const [label, which, find, replace, pattern] of M) {
  const base = which === "fs" ? fsRules : stRules;
  const finds = Array.isArray(find) ? find : [find];
  const replaces = Array.isArray(replace) ? replace : [replace];
  let mutated = base;
  for (let i = 0; i < finds.length; i += 1) {
    if (!mutated.includes(finds[i])) {
      console.error(`FAIL mutation does not apply (rules text changed?): ${label}`);
      process.exit(1);
    }
    mutated = mutated.replace(finds[i], replaces[i]);
  }
  const file = path.join(tmp, which === "fs" ? "firestore.rules" : "storage.rules");
  fs.writeFileSync(file, mutated);
  const env = { ...process.env, [which === "fs" ? "RULES_FILE" : "STORAGE_RULES_FILE"]: file };
  const r = spawnSync(
    "npx",
    ["jest", "-c", "jest.rules.config.js", "--runInBand", "-t", `"${pattern}"`],
    {
      cwd: path.join(root, "functions"),
      env,
      encoding: "utf8",
      shell,
    },
  );
  const killed = r.status !== 0;
  if (!killed) escaped += 1;
  console.log(`${killed ? "killed " : "ESCAPED"} ${pattern.padEnd(16)} ${label}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(
  escaped === 0
    ? `RESULT: all ${M.length} mutations were caught`
    : `RESULT: ${escaped} mutation(s) escaped`,
);
process.exit(escaped === 0 ? 0 : 1);
