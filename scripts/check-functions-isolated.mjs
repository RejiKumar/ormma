// Proves the built functions/ output runs with nothing from outside functions/:
// builds, copies package.json, the lockfile and lib/ to a temp dir, installs production
// dependencies there and loads the built entry with Node.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const fnDir = path.join(root, "functions");
const shell = process.platform === "win32";

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", shell });
  if (r.status !== 0) {
    console.error(`FAIL ${cmd} ${args.join(" ")}\n${r.stdout}${r.stderr}`);
    process.exit(1);
  }
  return r.stdout;
}

run("npm", ["run", "build"], fnDir);
const pkg = JSON.parse(fs.readFileSync(path.join(fnDir, "package.json"), "utf8"));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ormma-fn-"));
const copy = path.join(tmp, "functions");
fs.mkdirSync(copy);
for (const f of ["package.json", "package-lock.json"])
  fs.copyFileSync(path.join(fnDir, f), path.join(copy, f));
fs.cpSync(path.join(fnDir, "lib"), path.join(copy, "lib"), { recursive: true });
run("npm", ["install", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], copy);
fs.writeFileSync(
  path.join(copy, "load-check.cjs"),
  `const m = require("./${pkg.main}");
console.log(Object.keys(m).join(","));
`,
);
const out = run("node", ["load-check.cjs"], copy);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`ok   built functions/ runs in isolation (exports: ${out.trim()})`);
