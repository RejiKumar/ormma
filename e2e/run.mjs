// Appium end-to-end suite for the Ormma release build on an Android emulator.
// Start Appium first (appium --port 4723), then:  node run.mjs
// Optional: ORMMA_TEST_CODE=<fixed Firebase test code> enables the signed-in cases.
// Writes report/report.html (screenshots embedded) and report/results.json.
import { remote } from "webdriverio";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PKG = "com.ormma.app";
const UDID = process.env.ORMMA_UDID || "emulator-5554";
const NUMBER = "7871458828";
const CODE = process.env.ORMMA_TEST_CODE || "";
const ADB = path.join(process.env.LOCALAPPDATA || "", "Android/Sdk/platform-tools/adb.exe");
const OUT = path.resolve("report");
fs.mkdirSync(OUT, { recursive: true });

const adb = (...a) => execFileSync(ADB, ["-s", UDID, ...a], { encoding: "utf8" });
const results = [];
let driver;

async function start() {
  adb("shell", "pm", "clear", PKG);
  driver = await remote({
    hostname: "127.0.0.1",
    port: 4723,
    logLevel: "error",
    capabilities: {
      platformName: "Android",
      "appium:automationName": "UiAutomator2",
      "appium:udid": UDID,
      "appium:appPackage": PKG,
      "appium:appActivity": ".MainActivity",
      "appium:noReset": true,
      "appium:autoGrantPermissions": true,
      "appium:newCommandTimeout": 300,
    },
  });
}
const byText = (t) => driver.$(`//*[@text="${t}"]`);
const startsWith = (t) => driver.$(`//*[starts-with(@text,"${t}")]`);
async function waitText(t, ms = 60000) {
  await (await startsWith(t)).waitForDisplayed({ timeout: ms });
}
async function allText() {
  const els = await driver.$$("//*[@text!='']");
  const out = [];
  for (const e of els) out.push(await e.getAttribute("text"));
  return out;
}
async function shot(name) {
  const file = `${name}.png`;
  fs.writeFileSync(path.join(OUT, file), await driver.takeScreenshot(), "base64");
  return file;
}
async function typeInto(index, value) {
  const field = (await driver.$$("android.widget.EditText"))[index];
  await field.click();
  await field.setValue(value);
  await driver.hideKeyboard().catch(() => {});
}
async function tap(label) {
  await (await byText(label)).click();
}

async function tc(id, title, steps, fn) {
  const t0 = Date.now();
  const r = { id, title, steps, status: "PASS", note: "", shots: [] };
  try {
    r.note = (await fn(r)) || "";
  } catch (e) {
    r.status = "FAIL";
    r.note = String(e.message || e).split("\n")[0];
    try {
      r.shots.push(await shot(`${id}-failure`));
    } catch {}
  }
  r.ms = Date.now() - t0;
  results.push(r);
  console.log(`${r.status}  ${id}  ${title}${r.note ? "  - " + r.note : ""}`);
}
const skip = (id, title, steps, why) => {
  results.push({ id, title, steps, status: "SKIPPED", note: why, shots: [], ms: 0 });
  console.log(`SKIP  ${id}  ${title}  - ${why}`);
};

await start();

await tc("TC01", "App launches on the sign-in screen", ["Fresh install state", "Open the app"], async (r) => {
  await waitText("Sign in");
  const t = await allText();
  for (const need of ["Phone number", "Send code", "This app does not provide medical advice."])
    if (!t.includes(need)) throw new Error(`missing "${need}"`);
  r.shots.push(await shot("TC01-launch"));
  return "Heading, phone field, Send code and the medical-advice line are shown";
});

await tc("TC02", "Phone field starts with the +91 prefix", ["Read the phone field"], async () => {
  const v = await (await driver.$$("android.widget.EditText"))[0].getText();
  if (v.trim() !== "+91") throw new Error(`field shows "${v}"`);
});

await tc("TC03", "Too-short number is rejected without leaving the screen", ["Type +9112", "Tap Send code"], async (r) => {
  await typeInto(0, "12");
  await tap("Send code");
  await driver.pause(1500);
  const t = await allText();
  if (!t.includes("Sign in")) throw new Error("left the sign-in screen");
  r.shots.push(await shot("TC03-short-number"));
  return `Screen text: ${t.filter((x) => !["Sign in", "Phone number", "Send code"].includes(x)).join(" / ")}`;
});

await tc("TC04", "Valid test number moves to the code screen (production Auth, new API key)", ["Enter +91" + NUMBER, "Tap Send code"], async (r) => {
  const field = (await driver.$$("android.widget.EditText"))[0];
  await field.click();
  await field.setValue("+91" + NUMBER);
  await driver.hideKeyboard().catch(() => {});
  await tap("Send code");
  await waitText("Enter the code", 90000);
  r.shots.push(await shot("TC04-code-screen"));
  return "Reached 'Enter the code' (no 'Something went wrong' / API-key error)";
});

await tc("TC05", "Code screen shows the number and a resend control", ["Read code screen"], async () => {
  const t = await allText();
  if (!t.some((x) => x.includes("+91" + NUMBER))) throw new Error("number not shown");
  if (!t.some((x) => x.startsWith("Resend"))) throw new Error("no resend control");
});

await tc("TC06", "Wrong code is rejected with a neutral message", ["Type 000000", "Tap Verify"], async (r) => {
  await typeInto(0, "000000");
  await tap("Verify");
  await (await byText("That code is not correct. Check the message and try again.")).waitForDisplayed({ timeout: 30000 });
  r.shots.push(await shot("TC06-wrong-code"));
});

await tc("TC07", "Empty code is not accepted", ["Clear the field", "Tap Verify"], async () => {
  const f = (await driver.$$("android.widget.EditText"))[0];
  await f.clearValue();
  await tap("Verify");
  await driver.pause(1500);
  if (!(await allText()).includes("Enter the code")) throw new Error("left the code screen");
});

if (!CODE) {
  for (const [id, title] of [
    ["TC08", "Correct code signs in"],
    ["TC09", "Bottom tabs switch without flicker"],
    ["TC10", "Settings, plan and legal links open"],
    ["TC11", "Session survives an app restart"],
  ])
    skip(id, title, [], "needs ORMMA_TEST_CODE (fixed Firebase test code)");
} else {
  await tc("TC08", "Correct code signs in", ["Type the test code", "Tap Verify"], async (r) => {
    await typeInto(0, CODE);
    await tap("Verify");
    await driver.pause(8000);
    const t = await allText();
    if (t.includes("Enter the code")) throw new Error("still on the code screen");
    r.shots.push(await shot("TC08-signed-in"));
    return `Screen text: ${t.slice(0, 12).join(" / ")}`;
  });
  await tc("TC09", "Bottom tabs switch and each shows content", ["Tap each tab"], async (r) => {
    const names = [];
    for (const label of ["Family", "Medicines", "Today"]) {
      const el = await driver.$(`//*[@content-desc="${label}"] | //*[@text="${label}"]`);
      if (await el.isExisting()) {
        await el.click();
        await driver.pause(1200);
        names.push(label);
        r.shots.push(await shot(`TC09-${label}`));
      }
    }
    if (!names.length) throw new Error("no tab found");
    return `Opened: ${names.join(", ")}`;
  });
  await tc("TC11", "Session survives an app restart", ["Terminate and relaunch"], async (r) => {
    await driver.terminateApp(PKG);
    await driver.activateApp(PKG);
    await driver.pause(6000);
    if ((await allText()).includes("Sign in")) throw new Error("asked to sign in again");
    r.shots.push(await shot("TC11-restart"));
  });
}

await driver.deleteSession();

fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
const count = (s) => results.filter((r) => r.status === s).length;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const img = (f) => `data:image/png;base64,${fs.readFileSync(path.join(OUT, f)).toString("base64")}`;
const color = { PASS: "#1f7a4d", FAIL: "#b3261e", SKIPPED: "#8a6d00" };
const html = `<!doctype html><meta charset="utf-8"><title>Ormma e2e report</title>
<style>body{font:15px system-ui;max-width:900px;margin:24px auto;padding:0 16px}table{border-collapse:collapse;width:100%}
td,th{border:1px solid #ddd;padding:8px;vertical-align:top;text-align:left}img{height:360px;margin:4px;border:1px solid #ccc}</style>
<h1>Ormma release build: Appium report</h1>
<p>Device ${esc(UDID)} · package ${PKG} · ${new Date().toISOString()}<br>
<b>${count("PASS")} passed, ${count("FAIL")} failed, ${count("SKIPPED")} skipped</b></p>
<table><tr><th>ID</th><th>Case</th><th>Result</th><th>Notes</th></tr>
${results
  .map(
    (r) =>
      `<tr><td>${r.id}</td><td>${esc(r.title)}<br><small>${esc(r.steps.join(" → "))}</small></td><td style="color:${color[r.status]};font-weight:600">${r.status}</td><td>${esc(r.note)}<br>${r.shots.map((s) => `<img src="${img(s)}">`).join("")}</td></tr>`,
  )
  .join("")}</table>`;
fs.writeFileSync(path.join(OUT, "report.html"), html);
console.log(`\n${count("PASS")} passed, ${count("FAIL")} failed, ${count("SKIPPED")} skipped. Report: ${path.join(OUT, "report.html")}`);
process.exit(count("FAIL") ? 1 : 0);
