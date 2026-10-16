// Fails unless the tools the emulator suite needs are present.
// Firebase CLI 15.34.0 requires Java 21 or newer (MIN_SUPPORTED_JAVA_MAJOR_VERSION = 21).
import { spawnSync } from "node:child_process";

const MIN_JAVA_MAJOR = 21;
let failed = false;

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32" });
}

const java = run("java", ["-version"]);
if (java.error || java.status !== 0) {
  console.error(`FAIL java: not found on PATH (need Java ${MIN_JAVA_MAJOR}+ for the emulators)`);
  failed = true;
} else {
  const out = `${java.stdout}${java.stderr}`;
  const match = /version "(\d+)/.exec(out);
  const major = match ? Number(match[1]) : NaN;
  if (!(major >= MIN_JAVA_MAJOR)) {
    console.error(
      `FAIL java: found major version ${match ? major : "unknown"}, need ${MIN_JAVA_MAJOR}+`,
    );
    failed = true;
  } else {
    console.log(`ok   java ${major}`);
  }
}

const firebase = run("firebase", ["--version"]);
if (firebase.error || firebase.status !== 0) {
  console.error("FAIL firebase: CLI not found on PATH (npm i -g firebase-tools, or use npx)");
  failed = true;
} else {
  console.log(`ok   firebase ${firebase.stdout.trim().split("\n").pop()}`);
}

process.exit(failed ? 1 : 0);
