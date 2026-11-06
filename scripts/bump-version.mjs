// Raises the app version for a release: android.versionCode +1 (Play needs a higher number on every
// upload) and the patch part of "version" +1 (1.0.0 -> 1.0.1). Writes mobile/app.json and prints the new
// values; inside GitHub Actions it also sets the step outputs `version` and `version_code`.
// Run: node scripts/bump-version.mjs            (use --dry-run to only print)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "mobile", "app.json");

export function bump(config) {
  const expo = config.expo;
  const parts = String(expo.version).split(".").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new Error(`version "${expo.version}" is not major.minor.patch`);
  }
  parts[2] += 1;
  const code = Number(expo.android?.versionCode);
  if (!Number.isInteger(code) || code < 1) throw new Error("android.versionCode must be a whole number >= 1");
  expo.version = parts.join(".");
  expo.android.versionCode = code + 1;
  return { version: expo.version, versionCode: expo.android.versionCode };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raw = fs.readFileSync(file, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const config = JSON.parse(raw);
  const next = bump(config);
  if (!process.argv.includes("--dry-run")) {
    fs.writeFileSync(file, JSON.stringify(config, null, 2).replace(/\n/g, eol) + eol);
  }
  console.log(`version ${next.version}, versionCode ${next.versionCode}`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${next.version}\nversion_code=${next.versionCode}\n`);
  }
}
