import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { privacyPolicy, termsAndConditions } from "./legalText.generated";

const root = path.resolve(__dirname, "../../..");

describe("in-app legal text", () => {
  it("is generated from the published documents and is up to date", () => {
    expect(() =>
      execFileSync("node", [path.join(root, "scripts", "build-legal.mjs"), "--check"], { stdio: "pipe" }),
    ).not.toThrow();
  });

  it("covers every section of both documents and the no-medical-advice statements", () => {
    for (const doc of [privacyPolicy, termsAndConditions]) {
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(doc.sections.length).toBeGreaterThanOrEqual(8);
      for (const section of doc.sections) expect(section.blocks.length).toBeGreaterThan(0);
    }
    const privacy = JSON.stringify(privacyPolicy);
    expect(privacy).toContain("It does not give medical advice");
    expect(privacy).toContain("Subscription");
    expect(JSON.stringify(termsAndConditions)).toContain("Ormma does not provide medical advice");
  });

  it("matches the markdown headings word for word", () => {
    const md = fs.readFileSync(path.join(root, "docs", "TERMS.md"), "utf8");
    for (const section of termsAndConditions.sections) expect(md).toContain(`## ${section.heading}`);
  });
});
