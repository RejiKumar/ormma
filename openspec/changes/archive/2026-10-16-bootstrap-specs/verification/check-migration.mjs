// Verifies that the delta specs of the bootstrap-specs change preserve the old specs/ files.
//
// Usage (from the repo root):
//   node openspec/changes/bootstrap-specs/verification/check-migration.mjs <mode> [--old DIR] [--new DIR] [--ledger FILE]
// Modes: ledger | counts | tokens | all
// Exit code is non-zero if any check fails.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const mode = args[0] ?? "all";
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const OLD_DIR = opt("--old", "specs");
const NEW_DIR = opt("--new", "openspec/changes/bootstrap-specs/specs");
const LEDGER = opt("--ledger", "docs/spec-migration-map.md");

// ---------- helpers ----------
const strip = (line) =>
  line
    .trim()
    .replace(/^(\d+\.|[-*])\s+/, "")
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .replace(/\|/g, " ");

// Lowercase and drop punctuation (keeps < > = + / _ $ - and alphanumerics) so only words and
// operators are compared. Applied identically to old and new text.
const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9<>=+/_$\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const words = (s) => norm(s).split(" ").filter((w) => w.length >= 3);

// ---------- parse old specs ----------
const OLD_FILES = fs
  .readdirSync(OLD_DIR)
  .filter((f) => /^0\d-.*\.md$/.test(f))
  .sort();

const TEST_LABELS = [
  { re: /^Grouped-call tests\b/, group: "Grouped-call test", cap: "grouped-calls" },
  { re: /^Family override tests\b/, group: "Family override test", cap: "dose-event-lifecycle" },
];

function expectedCaps(file, heading, text, testGroup) {
  if (testGroup) return [testGroup.cap];
  const n = file.slice(0, 2);
  if (n === "01") return ["data-model"];
  if (n === "02") return ["access-control"];
  if (n === "03") {
    if (/^Grouped call:/.test(text)) return ["grouped-calls"];
    if (/State machine|Family override/i.test(heading)) return ["dose-event-lifecycle"];
    if (/Grouped calls/i.test(heading)) return ["grouped-calls"];
    if (/Missed-dose alert/i.test(heading)) return ["missed-dose-alerts"];
    return ["call-flow"];
  }
  if (n === "04") return /Trend flagging/i.test(heading) ? ["trend-flagging"] : ["medical-safety"];
  if (n === "05") return /^(Consent|Revocation)$/i.test(heading) || heading === "" ? ["consent"] : ["data-protection"];
  if (n === "06") {
    if (/^1\./.test(heading)) return ["reply-structuring"];
    if (/^2\./.test(heading)) return ["prescription-reading"];
    if (/^3\./.test(heading)) return ["weekly-summary"];
    return ["ai-contracts"];
  }
  return [];
}

function parseOld() {
  const units = [];
  for (const file of OLD_FILES) {
    const lines = fs.readFileSync(path.join(OLD_DIR, file), "utf8").split(/\r?\n/);
    let heading = "";
    let inFence = false;
    let testGroup = null;
    let seq = 0;
    lines.forEach((raw, idx) => {
      const line = raw.trim();
      if (line.startsWith("```")) {
        inFence = !inFence;
        return;
      }
      if (!inFence && /^#{1,6}\s/.test(line)) {
        const h = line.replace(/^#+\s+/, "");
        if (/^#{2,}\s/.test(line)) heading = h.replace(/^\d+\.\s+/, (m) => m); // keep numbering for spec 06
        testGroup = /^Required tests/i.test(h) ? { group: "Rules test", cap: "access-control" } : null;
        return;
      }
      if (!line) return;
      if (/^\|[-\s|]+\|$/.test(line)) return; // table separator
      const label = TEST_LABELS.find((t) => t.re.test(line));
      if (label && !inFence) {
        testGroup = label;
        return;
      }
      const text = strip(line);
      if (norm(text).length < 3) return;
      const numbered = /^(\d+)\.\s/.exec(line);
      const isTest = testGroup && numbered;
      seq += 1;
      units.push({
        id: `S${file.slice(0, 2)}-${String(seq).padStart(3, "0")}`,
        file,
        line: idx + 1,
        heading,
        text,
        isTest: Boolean(isTest),
        testName: isTest ? `${testGroup.group} ${numbered[1]}` : null,
        expected: expectedCaps(file, heading, text, isTest ? testGroup : null),
      });
    });
  }
  return units;
}

// ---------- parse new specs ----------
function parseNew() {
  const caps = [];
  for (const cap of fs.readdirSync(NEW_DIR).sort()) {
    const f = path.join(NEW_DIR, cap, "spec.md");
    if (!fs.existsSync(f)) continue;
    const lines = fs.readFileSync(f, "utf8").split(/\r?\n/);
    const c = { cap, purpose: [], reqs: [], raw: lines.join("\n") };
    let mode = null;
    let req = null;
    let scn = null;
    for (const l of lines) {
      let m;
      if (/^## Purpose/.test(l)) mode = "purpose";
      else if (/^## ADDED Requirements/.test(l)) mode = "reqs";
      else if ((m = /^### Requirement: (.*)$/.exec(l))) {
        req = { name: m[1].trim(), desc: [], scenarios: [] };
        c.reqs.push(req);
        scn = null;
        mode = "desc";
      } else if ((m = /^#### Scenario: (.*)$/.exec(l))) {
        scn = { name: m[1].trim(), text: [] };
        req.scenarios.push(scn);
        mode = "scn";
      } else if (mode === "purpose") c.purpose.push(l);
      else if (mode === "desc") req.desc.push(l);
      else if (mode === "scn") scn.text.push(l);
    }
    caps.push(c);
  }
  return caps;
}

const normBlock = (lines) => norm(lines.map(strip).join(" "));

// ---------- ledger ----------
const LATE = [
  ["#2 family override of missed doses", /override|missedAt|missed -> taken|missed to "taken"|`missed` (event|doseevent) to/i],
  ["#2a resolvedByUid", /resolvedByUid/],
  ["#7/#7a revokedAt, regrantedAt", /revokedAt|regrantedAt|re-grant|revocation/i],
  ["#7b fail-closed second revocation", /[Ss]econd revocation|one revoke and re-grant|fail closed|FIRST/],
  ["#8 grouped calls", /group|doseEventIds|groupConfirmed|ALL of/i],
  ["#8a group alert wording", /did not confirm all|one alert per group/i],
];

function buildLedger(units, caps) {
  const blocks = [];
  for (const c of caps) {
    blocks.push({ cap: c.cap, where: "Purpose", n: normBlock(c.purpose) });
    for (const r of c.reqs) blocks.push({ cap: c.cap, where: `Requirement: ${r.name}`, n: normBlock(r.desc) });
  }
  const rows = [];
  for (const u of units) {
    const row = { u, targets: [], status: "ok", note: "" };
    if (u.isTest) {
      const cap = caps.find((c) => c.cap === u.expected[0]);
      const sc = cap?.reqs.flatMap((r) => r.scenarios.map((s) => ({ r, s }))).find((x) => x.s.name === u.testName);
      if (!sc) {
        row.status = "UNMATCHED";
        row.note = `no scenario "${u.testName}" in ${u.expected[0]}`;
      } else {
        const have = new Set(words(sc.s.text.join(" ")));
        const want = [...new Set(words(u.text))];
        const miss = want.filter((w) => !have.has(w));
        const recall = want.length ? (want.length - miss.length) / want.length : 1;
        row.targets.push({ cap: cap.cap, where: `Scenario: ${sc.s.name}` });
        row.note = `word recall ${(recall * 100).toFixed(0)}%` + (miss.length ? ` (missing: ${miss.join(", ")})` : "");
        if (recall < 0.85) row.status = "UNMATCHED";
      }
      rows.push(row);
      continue;
    }
    const whole = norm(u.text);
    let hits = blocks.filter((b) => b.n.includes(whole));
    if (hits.length) {
      const good = hits.filter((b) => u.expected.includes(b.cap));
      if (!good.length) {
        row.status = "WRONG-LOCATION";
        row.note = `found only in ${[...new Set(hits.map((h) => h.cap))].join(", ")}, expected ${u.expected.join(", ")}`;
        row.targets = hits.slice(0, 1);
      } else row.targets = good.slice(0, 1);
    } else {
      // sentence-level fallback for bullets that were split into several requirements
      const frags = [];
      for (const part of u.text.split(/(?<=[.!?;)])\s+(?=[A-Z"(])/)) {
        if (frags.length && norm(frags[frags.length - 1]).length < 12) frags[frags.length - 1] += " " + part;
        else frags.push(part);
      }
      if (frags.length > 1 && norm(frags[frags.length - 1]).length < 12) {
        const last = frags.pop();
        frags[frags.length - 1] += " " + last;
      }
      const found = [];
      let allOk = frags.length > 1;
      for (const fr of frags) {
        const nf = norm(fr);
        const h = blocks.filter((b) => b.n.includes(nf));
        const good = h.filter((b) => u.expected.includes(b.cap));
        if (!good.length) {
          allOk = false;
          row.note += `fragment not found in expected capability: "${fr.slice(0, 50)}"; `;
        } else found.push(good[0]);
      }
      if (allOk) {
        row.targets = found.filter((b, i) => found.findIndex((x) => x.where === b.where && x.cap === b.cap) === i);
        row.note = `split into ${frags.length} sentences`;
      } else row.status = "UNMATCHED";
    }
    rows.push(row);
  }
  return rows;
}

function writeLedger(rows) {
  const esc = (s) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const out = [];
  out.push("# Spec migration map", "");
  out.push(
    "Generated by `openspec/changes/bootstrap-specs/verification/check-migration.mjs ledger` from the old `specs/01` to `specs/06` (available at tag `specs-v1-pre-openspec` once tagged). One row per atomic unit: bullet, numbered item, table row, sentence-split line or numbered test. Headings are section markers, not units. Late-addition tags are assigned by keyword and are a review aid, not a proof.",
    "",
  );
  const bad = rows.filter((r) => r.status !== "ok");
  out.push(`Units: ${rows.length}. Unmatched or misplaced: ${bad.length}.`, "");
  out.push("| ID | Old file, line | Section | Unit (first 70 chars) | New capability | New requirement or scenario | Check | Late-addition tags |", "|---|---|---|---|---|---|---|---|");
  for (const r of rows) {
    const tags = LATE.filter(([, re]) => re.test(r.u.text)).map(([t]) => t.split(" ")[0]);
    const tgt = r.targets.length ? r.targets : [{ cap: "-", where: "-" }];
    out.push(
      `| ${r.u.id} | ${r.u.file} L${r.u.line} | ${esc(r.u.heading || "(top)")} | ${esc(r.u.text.slice(0, 70))} | ${[...new Set(tgt.map((t) => t.cap))].join(", ")} | ${esc(tgt.map((t) => t.where).join("; "))} | ${r.status}${r.note ? ": " + esc(r.note) : ""} | ${tags.join(" ")} |`,
    );
  }
  out.push("", "## Late additions: where each lands", "");
  for (const [tag, re] of LATE) {
    const hit = rows.filter((r) => re.test(r.u.text));
    const caps = [...new Set(hit.flatMap((r) => r.targets.map((t) => t.cap)))];
    out.push(`- **${tag}**: ${hit.length} units, in ${caps.join(", ") || "(none)"}: ${hit.map((r) => r.u.id).join(", ")}`);
  }
  out.push("");
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.writeFileSync(LEDGER, out.join("\n"));
}

function runLedger() {
  const units = parseOld();
  const caps = parseNew();
  const rows = buildLedger(units, caps);
  writeLedger(rows);
  const bad = rows.filter((r) => r.status !== "ok");
  console.log(`LEDGER: ${rows.length} units from ${OLD_FILES.length} old files, ${bad.length} unmatched or misplaced -> ${LEDGER}`);
  for (const r of bad) console.log(`  ${r.status} ${r.u.id} ${r.u.file}:${r.u.line} "${r.u.text.slice(0, 80)}" ${r.note}`);
  const tests = rows.filter((r) => r.u.isTest);
  console.log(`LEDGER tests: ${tests.length} numbered test units; lowest word recall ${Math.min(...tests.map((t) => Number(/recall (\d+)%/.exec(t.note)?.[1] ?? 100)))}%`);
  return bad.length === 0;
}

// ---------- counts ----------
function runCounts() {
  const caps = parseNew();
  const results = [];
  const check = (label, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${Array.isArray(got) ? got.length + " [" + got.join(",") + "]" : got} (expected ${Array.isArray(want) ? want.length : want})`);
  };
  check("capability folders", caps.length, 14);
  const get = (cap) => caps.find((c) => c.cap === cap);
  const nums = (cap, re) =>
    (get(cap)?.reqs.flatMap((r) => r.scenarios.map((s) => s.name)) ?? [])
      .map((n) => re.exec(n)?.[1])
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => a - b);
  const seq = (n) => Array.from({ length: n }, (_, i) => i + 1);
  check("Rules test scenarios (access-control)", nums("access-control", /^Rules test (\d+)$/), seq(14));
  check("Grouped-call test scenarios (grouped-calls)", nums("grouped-calls", /^Grouped-call test (\d+)$/), seq(6));
  check("Family override test scenarios (dose-event-lifecycle)", nums("dose-event-lifecycle", /^Family override test (\d+)$/), seq(4));
  const reqNums = (cap, re) =>
    (get(cap)?.reqs ?? []).map((r) => re.exec(r.name)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b);
  check("Call script step requirements (call-flow)", reqNums("call-flow", /^Call script step (\d+)\b/), seq(5));
  check("Component requirements (call-flow)", reqNums("call-flow", /^Component (\d+)\b/), seq(5));
  const noScn = caps.flatMap((c) => c.reqs.filter((r) => r.scenarios.length === 0).map((r) => `${c.cap}/${r.name}`));
  check("requirements without a scenario", noScn, []);
  const total = caps.reduce((n, c) => n + c.reqs.length, 0);
  console.log(`INFO ${total} requirements, ${caps.reduce((n, c) => n + c.reqs.reduce((m, r) => m + r.scenarios.length, 0), 0)} scenarios in ${caps.length} capabilities`);
  for (const c of caps) console.log(`INFO   ${c.cap}: ${c.reqs.length} requirements`);
  return results.every(Boolean);
}

// ---------- tokens ----------
const MODALS = ["may", "should", "must", "never", "only", "cannot", "can", "optional", "skippable"];
function tokenize(text) {
  const t = [];
  for (const m of text.matchAll(/`([^`]+)`/g)) t.push("`" + m[1] + "`");
  for (const m of text.matchAll(/"([^"]+)"/g)) t.push('"' + m[1] + '"');
  for (const m of text.matchAll(/(?<![A-Za-z0-9_.])\d+(?:\.\d+)?(?![A-Za-z0-9_])/g)) t.push("#" + m[0]);
  for (const m of text.matchAll(new RegExp(`\\b(${MODALS.join("|")})\\b`, "gi"))) t.push("modal:" + m[1].toLowerCase());
  return t;
}
const count = (arr) => arr.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map());

function runTokens() {
  const units = parseOld();
  const oldText = units.map((u) => u.text).join("\n");
  const newText = parseNew().map((c) => c.raw).join("\n");
  const o = count(tokenize(oldText));
  const n = count(tokenize(newText));
  const missing = [];
  for (const [k, v] of o) if ((n.get(k) ?? 0) < v) missing.push(`${k} old=${v} new=${n.get(k) ?? 0}`);
  console.log(`TOKENS: ${o.size} distinct old tokens (${[...o.values()].reduce((a, b) => a + b, 0)} occurrences); ${missing.length} with fewer occurrences in the new specs`);
  for (const m of missing) console.log("  MISSING " + m);
  for (const k of MODALS) console.log(`  modal ${k}: old=${o.get("modal:" + k) ?? 0} new=${n.get("modal:" + k) ?? 0}`);
  return missing.length === 0;
}

// ---------- main ----------
const runs = { ledger: runLedger, counts: runCounts, tokens: runTokens };
const todo = mode === "all" ? ["ledger", "counts", "tokens"] : [mode];
let ok = true;
for (const m of todo) {
  if (!runs[m]) {
    console.error(`unknown mode ${m}`);
    process.exit(2);
  }
  console.log(`== ${m} ==`);
  ok = runs[m]() && ok;
}
console.log(ok ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(ok ? 0 : 1);
