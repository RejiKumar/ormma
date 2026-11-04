#!/usr/bin/env node
/**
 * Build the Android APK from this repo, in place, on Windows.
 *
 * Why this script exists: CMake mirrors absolute source paths into its object
 * directories. Under "D:\RARK\AI Native\Projects\..." those paths pass the 260
 * character Windows limit and ninja fails with
 *
 *   ninja: error: mkdir(...D_/RARK/...): No such file or directory
 *
 * The Gradle changes added by mobile/plugins/withWindowsNativePaths.js keep the
 * native build paths short, but they depend on two fixed short paths:
 *
 *   D:\nm  junction -> mobile/node_modules   (native module sources/build dirs)
 *   D:\a   CMake staging directory for :app  (created by Gradle)
 *
 * The junction is machine setup rather than source code, so it is created here.
 * Nothing is copied and the project keeps living in its normal folder.
 *
 * Usage:
 *   node scripts/android-build.mjs                 # debug APK, arm64-v8a
 *   node scripts/android-build.mjs --prepare       # only set up the junction
 *   node scripts/android-build.mjs :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
 */
import {
  copyFileSync,
  existsSync,
  lstatSync,
  readlinkSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHORT_NODE_MODULES = "D:\\nm";
const APK_FILE = "ormma-debug-arm64.apk";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobileDir = path.join(repoRoot, "mobile");
const androidDir = path.join(mobileDir, "android");
const nodeModulesDir = path.join(mobileDir, "node_modules");
const apkSource = path.join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const apkTarget = path.join(repoRoot, APK_FILE);

const args = process.argv.slice(2);
const prepareOnly = args.includes("--prepare");
const gradleArgs = args.filter((arg) => arg !== "--prepare" && arg !== "--");
const isWindows = process.platform === "win32";

function ensureShortNodeModulesJunction() {
  if (!isWindows) {
    return;
  }
  if (!existsSync(nodeModulesDir)) {
    console.error(
      `[android-build] Missing ${nodeModulesDir}. Run "npm --prefix mobile install" first.`,
    );
    process.exit(1);
  }

  let existingTarget = null;
  try {
    const stats = lstatSync(SHORT_NODE_MODULES);
    if (stats.isSymbolicLink()) {
      existingTarget = path.resolve(readlinkSync(SHORT_NODE_MODULES));
    } else {
      console.error(
        `[android-build] ${SHORT_NODE_MODULES} exists but is not a junction. Remove it and re-run.`,
      );
      process.exit(1);
    }
  } catch {
    // Does not exist yet.
  }

  const wantedTarget = path.resolve(nodeModulesDir);
  if (existingTarget === wantedTarget) {
    return;
  }
  if (existingTarget) {
    unlinkSync(SHORT_NODE_MODULES);
  }
  symlinkSync(wantedTarget, SHORT_NODE_MODULES, "junction");
  console.log(`[android-build] Created ${SHORT_NODE_MODULES} -> ${wantedTarget}`);
}

if (!existsSync(androidDir)) {
  console.error(
    '[android-build] mobile/android is missing. Run "npx expo prebuild --platform android" in mobile/ first.',
  );
  process.exit(1);
}

ensureShortNodeModulesJunction();
if (prepareOnly) {
  console.log("[android-build] Short paths ready.");
  process.exit(0);
}

const gradleCommand = isWindows ? "gradlew.bat" : "./gradlew";
const requestedArgs = gradleArgs.length
  ? gradleArgs
  : [":app:assembleDebug", "-PreactNativeArchitectures=arm64-v8a"];
const quotedArgs = [...requestedArgs, "--console=plain"].map((arg) =>
  /\s/.test(arg) ? `"${arg}"` : arg,
);

console.log(`[android-build] ${gradleCommand} ${requestedArgs.join(" ")}`);
// A shell is needed for gradlew.bat on Windows. Passing one pre-quoted command
// string (instead of an args array) avoids Node's DEP0190 warning.
const result = isWindows
  ? spawnSync(`${gradleCommand} ${quotedArgs.join(" ")}`, {
      cwd: androidDir,
      stdio: "inherit",
      shell: true,
    })
  : spawnSync(gradleCommand, quotedArgs, { cwd: androidDir, stdio: "inherit" });
if (result.status !== 0) {
  console.error(`[android-build] Gradle failed with exit code ${result.status ?? result.error}.`);
  process.exit(result.status ?? 1);
}

if (!existsSync(apkSource)) {
  console.error(`[android-build] Gradle succeeded but ${apkSource} is missing.`);
  process.exit(1);
}

copyFileSync(apkSource, apkTarget);
const { size } = statSync(apkTarget);
console.log(
  `[android-build] APK: ${apkTarget} (${(size / 1024 / 1024).toFixed(1)} MB)\n` +
    `[android-build] Install with: adb install -r "${apkTarget}"`,
);
