// Builds the PDF edition of the book from chapters/*.md.
//   npm run pdf                    -> ../JS-and-TS-for-QA.pdf
//   npm run pdf -- <output.pdf>
// Examples show their expected output; practice/exercise solutions and quiz
// answers go in an answer key at the end of each chapter.
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "JS-and-TS-for-QA.pdf"));
const win = {};
new Function("window", fs.readFileSync(path.join(ROOT, "book.js"), "utf8"))(win);
const BOOK = win.BOOK;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const LABEL = { js: "JavaScript", ts: "TypeScript", bash: "Terminal", json: "JSON", text: "Text", sql: "SQL", yaml: "YAML" };
const ALIAS = { javascript: "js", typescript: "ts", sh: "bash", shell: "bash", yml: "yaml" };
const parseInfo = (info) => {
  const title = (info.match(/title="([^"]*)"/) || [])[1] || "";
  const xp = Number((info.match(/\bxp=(\d+)/) || [])[1]) || 0;
  const words = info.replace(/title="[^"]*"/, "").replace(/\bxp=\d+/, "").trim().split(/\s+/).filter(Boolean);
  return { kind: words[0] || "", flags: words.slice(1), title, xp };
};

function renderChapter(md, chapterLabel) {
  const tokens = marked.lexer(md);
  const answers = [];
  let exNo = 0, prNo = 0, last = null;
  for (const t of tokens) {
    if (t.type !== "code") { if (t.type !== "space") last = null; continue; }
    const info = parseInfo(t.lang || "");
    if (info.kind === "exercise" || info.kind === "practice") {
      const isPractice = info.kind === "practice";
      const label = isPractice ? `Practice ${++prNo}` : `Exercise ${++exNo}`;
      const xp = info.xp || (isPractice ? 10 : 20);
      last = { label, title: info.title, lang: ALIAS[info.flags[0]] || info.flags[0] };
      t.pdf = `<div class="exercise${isPractice ? " practice" : ""}"><div class="ex-head">${isPractice ? "🎯 " : ""}${label}: ${esc(info.title)} <span class="xp">⚡ ${xp} XP</span></div>
        <pre><code>${esc(t.text)}</code></pre><div class="ex-note">Do it in the interactive book, where your answer is checked automatically. The solution is in the answer key at the end of this chapter.</div></div>`;
    } else if (info.kind === "checks") {
      t.pdf = "";
      if (last && last.lang === "sql") last.expected = t.text;
    } else if (info.kind === "hint") {
      t.pdf = last ? `<div class="hint"><b>💡 Hint:</b> ${marked.parse(t.text)}</div>` : "";
    } else if (info.kind === "solution") {
      t.pdf = "";
      if (last) answers.push(`<h4>${last.label}: ${esc(last.title)}</h4><pre><code>${esc(t.text)}</code></pre>` +
        (last.expected ? `<div class="out-label">Expected result</div><pre class="out"><code>${esc(last.expected)}</code></pre>` : ""));
    } else if (info.kind === "quiz") {
      const qs = JSON.parse(t.text);
      t.pdf = `<div class="quiz"><div class="ex-head">Quiz</div>${qs.map((q, i) => `
        <div class="q"><div class="q-text"><b>${i + 1}.</b> ${marked.parseInline(q.q)}</div>
        ${q.code ? `<pre><code>${esc(q.code)}</code></pre>` : ""}
        <ol type="A">${q.options.map((o) => `<li>${marked.parseInline(o)}</li>`).join("")}</ol></div>`).join("")}</div>`;
      answers.push(`<h4>Quiz</h4><ol class="key">${qs.map((q) =>
        `<li><b>${String.fromCharCode(65 + q.answer)}.</b> ${marked.parseInline(q.options[q.answer])}<div class="why">${marked.parseInline(q.why)}</div></li>`).join("")}</ol>`);
    } else if (info.kind === "output") {
      t.pdf = `<div class="out-label">Output</div><pre class="out"><code>${esc(t.text)}</code></pre>`;
    } else {
      const lang = ALIAS[info.kind] || info.kind || "text";
      t.pdf = `<div class="code-head">${esc(LABEL[lang] || lang)}${info.title ? ` · ${esc(info.title)}` : ""}</div><pre><code>${esc(t.text)}</code></pre>`;
    }
  }
  const renderer = new marked.Renderer();
  renderer.code = (t) => t.pdf ?? `<pre><code>${esc(t.text)}</code></pre>`;
  let html = marked.parser(tokens, { renderer }).replace(/<details>/g, "<details open>");
  if (answers.length) html += `<section class="answers"><h2>Answer key: ${esc(chapterLabel)}</h2>${answers.join("")}</section>`;
  return html;
}

const toc = [];
let body = "";
BOOK.parts.forEach((part, pi) => {
  body += `<section class="part"><div class="part-no">Part ${pi + 1}${part.optional ? " · Optional" : ""}</div><h1>${esc(part.title)}</h1>${part.intro ? `<p>${esc(part.intro)}</p>` : ""}</section>`;
  toc.push(`<li class="toc-part">Part ${pi + 1}: ${esc(part.title)}</li>`);
  for (const ch of part.chapters.filter((c) => c.file)) {
    const label = ch.label || `Chapter ${ch.number}`;
    const anchor = `ch-${ch.id}`;
    toc.push(`<li><a href="#${anchor}">${ch.checkpoint ? "🏁 " : ""}${esc(label)}: ${esc(ch.title)}</a></li>`);
    const md = fs.readFileSync(path.join(ROOT, ch.file), "utf8");
    body += `<article class="chapter" id="${anchor}"><div class="ch-label">${esc(label)}</div><h1>${esc(ch.title)}</h1>${renderChapter(md, label)}</article>`;
  }
});

const today = new Date().toISOString().slice(0, 10);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(BOOK.title)}</title><style>
  @page { size: A4; margin: 18mm 16mm 20mm; }
  body { font: 10.5pt/1.5 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1d2330; }
  h1 { font-size: 22pt; margin: 0 0 10pt; line-height: 1.2; }
  h2 { font-size: 14pt; margin: 18pt 0 6pt; break-after: avoid; }
  h3 { font-size: 12pt; margin: 14pt 0 5pt; break-after: avoid; }
  h4 { font-size: 11pt; margin: 12pt 0 4pt; break-after: avoid; }
  a { color: #1f5fbf; text-decoration: none; }
  code { font-family: Menlo, Consolas, "DejaVu Sans Mono", monospace; font-size: 8.6pt; }
  :not(pre) > code { background: #eef1f5; padding: 0 2pt; border-radius: 2pt; }
  pre { background: #f5f7fa; border: 0.6pt solid #d7dde6; border-radius: 4pt; padding: 6pt 8pt; white-space: pre-wrap; word-break: break-word; margin: 4pt 0 8pt; line-height: 1.3; }
  pre.out { background: #fbfbf4; border-color: #e1dfc6; line-height: 1.12; }
  .code-head, .out-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; color: #6a7484; margin-top: 8pt; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt; font-size: 9pt; break-inside: avoid; }
  th, td { border: 0.6pt solid #cfd6e0; padding: 3pt 5pt; text-align: left; vertical-align: top; }
  th { background: #eef1f5; }
  blockquote { margin: 8pt 0; padding: 4pt 10pt; border-left: 3pt solid #3a8dde; background: #f1f6fc; }
  .exercise, .quiz { border: 0.8pt solid #2aa98f; border-radius: 5pt; padding: 6pt 10pt; margin: 10pt 0; }
  .exercise.practice { border-color: #d4a700; }
  .ex-head { font-weight: 700; color: #137a66; margin-bottom: 4pt; }
  .practice .ex-head { color: #8a6d00; }
  .xp { font-weight: 400; font-size: 8.5pt; color: #8a6d00; }
  .ex-note { font-size: 8.5pt; color: #5d6675; }
  .hint { font-size: 9pt; border-left: 3pt solid #d4a700; background: #fffbea; padding: 3pt 8pt; margin: 4pt 0 10pt; }
  .hint p { display: inline; margin: 0; }
  .q { break-inside: avoid; margin: 6pt 0; }
  .q ol { margin: 2pt 0 0 14pt; padding: 0; }
  .why { color: #475467; }
  .answers { border-top: 1pt solid #aab3c0; margin-top: 18pt; padding-top: 4pt; }
  .answers ol.key li { margin: 3pt 0; }
  .chapter { break-before: page; }
  .ch-label, .part-no { color: #137a66; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; font-size: 9pt; }
  .part { break-before: page; padding-top: 70mm; }
  .cover { padding-top: 60mm; }
  .cover h1 { font-size: 30pt; }
  .cover p { font-size: 12pt; color: #475467; max-width: 140mm; }
  .toc { break-before: page; }
  .toc ul { list-style: none; padding: 0; }
  .toc li { margin: 2pt 0; }
  .toc .toc-part { font-weight: 700; margin-top: 8pt; }
  details summary { font-weight: 700; }
</style></head><body>
<section class="cover"><div class="part-no">Interactive book · PDF edition</div><h1>${esc(BOOK.title)}</h1><p>${esc(BOOK.subtitle)}</p>
<p>The interactive version, where examples run and practices are checked automatically, is at <a href="https://js-qa-playwright-study.vercel.app/">js-qa-playwright-study.vercel.app</a>. In this PDF, examples show their expected output, and solutions and quiz answers are in an answer key at the end of each chapter.</p>
<p style="font-size:9pt;color:#6a7484">Generated ${today} from the book's source.</p></section>
<section class="toc"><h1>Contents</h1><ul>${toc.join("")}</ul></section>
${body}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({
  path: OUT, format: "A4", printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true, headerTemplate: "<span></span>",
  footerTemplate: `<div style="font-size:7pt;width:100%;text-align:center;color:#888">${esc(BOOK.title)} · <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
  margin: { top: "18mm", bottom: "20mm", left: "16mm", right: "16mm" },
});
await browser.close();
console.log(`Wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
