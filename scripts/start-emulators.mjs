#!/usr/bin/env node
// Starts the Firebase emulators with a longer Functions discovery timeout.
//
// `firebase emulators:start` gives user code 10s to report its backend spec. On a cold Windows disk
// cache, loading the built functions entry (firebase-admin + firebase-functions + the shared lib) can
// take far longer; discovery then fails, the Functions emulator keeps running with zero functions
// loaded, and every callable answers 404 — which the app surfaces as "unknown".
// FUNCTIONS_DISCOVERY_TIMEOUT is in seconds.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cli = require.resolve("firebase-tools/lib/bin/firebase.js");

const args = [
  cli,
  "emulators:start",
  "--project",
  "demo-ormma",
  "--import=emulator-data",
  "--export-on-exit=emulator-data",
  ...process.argv.slice(2),
];

// Inherited stdio keeps the emulator UI output and Ctrl+C (which also exports emulator data).
const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT ?? "120" },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
