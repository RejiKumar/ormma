// Builds the public legal pages (Firebase Hosting) from docs/PRIVACY-POLICY.md and docs/TERMS.md, so the
// website says exactly what the app says. Run: node scripts/build-legal-site.mjs
// Output: hosting/public/{index,privacy/index,terms/index}.html
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "hosting", "public");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');

/** The documents carry an internal "draft, have it reviewed" note; it is not part of the published text. */
function publishedIntro(line) {
  const date = line.match(/Last updated: ([0-9-]+)/);
  return date ? `Last updated: ${date[1]}.` : line;
}

export function toHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let title = "";
  const out = [];
  let para = [];
  let list = false;
  let inBullet = false;
  const flushPara = () => {
    if (para.length === 0) return;
    let text = para.join(" ").trim();
    if (/^Last updated:/.test(text)) text = publishedIntro(text);
    out.push(`<p>${inline(text)}</p>`);
    para = [];
  };
  const closeList = () => {
    if (inBullet) out.push("</li>");
    if (list) out.push("</ul>");
    list = false;
    inBullet = false;
  };
  for (const line of lines) {
    if (line.startsWith("# ")) {
      title = line.slice(2).replace(/\s*\(draft for legal review\)\s*/i, "").trim();
    } else if (line.startsWith("## ")) {
      flushPara();
      closeList();
      out.push(`<h2>${inline(line.slice(3).trim())}</h2>`);
    } else if (line.startsWith("- ")) {
      flushPara();
      if (inBullet) out.push("</li>");
      if (!list) out.push("<ul>");
      list = true;
      inBullet = true;
      out.push(`<li>${inline(line.slice(2).trim())}`);
    } else if (line.startsWith("  ") && inBullet) {
      out.push(" " + inline(line.trim()));
    } else if (line.trim() === "") {
      flushPara();
      closeList();
    } else {
      closeList();
      para.push(line.trim());
    }
  }
  flushPara();
  closeList();
  return { title, body: out.join("\n") };
}

const page = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light dark; --bg:#F8F7F4; --ink:#1B2A25; --muted:#5B6B65; --primary:#2D5A4C; }
  @media (prefers-color-scheme: dark) { :root { --bg:#14201C; --ink:#EAF1EE; --muted:#A9B8B2; --primary:#7FC2AD; } }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.65 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width:720px; margin:0 auto; padding:32px 20px 64px; }
  h1 { font-size:28px; line-height:1.25; margin:0 0 8px; }
  h2 { font-size:20px; margin:32px 0 8px; }
  p, li { margin:8px 0; }
  ul { padding-left:22px; }
  a { color:var(--primary); }
  code { font-size:.92em; }
  .brand { font-weight:700; color:var(--primary); margin-bottom:24px; display:block; text-decoration:none; }
  footer { margin-top:48px; color:var(--muted); font-size:14px; }
</style>
</head>
<body>
<main>
<a class="brand" href="/">Ormma</a>
<h1>${esc(title)}</h1>
${body}
<footer>Ormma records and relays. It does not give medical advice.</footer>
</main>
</body>
</html>
`;

const write = (rel, content) => {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

for (const [dir, doc] of [
  ["privacy", "PRIVACY-POLICY.md"],
  ["terms", "TERMS.md"],
]) {
  const { title, body } = toHtml(fs.readFileSync(path.join(root, "docs", doc), "utf8"));
  write(`${dir}/index.html`, page(title, body));
}

write(
  "index.html",
  page(
    "Ormma",
    `<p>Ormma phones an elderly parent at medicine times, records the reply and shows it to family in an app.</p>
<ul><li><a href="/privacy">Privacy policy</a></li><li><a href="/terms">Terms of use</a></li></ul>`,
  ),
);
console.log("legal pages written to", OUT);
