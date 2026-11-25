// Checks the whole book. Run from the tools folder:  npm run check
//
//  1. Structure: every chapter in book.js exists; quizzes are valid JSON with a
//     valid answer; every practice/exercise has checks; SQL exercises have a result.
//  2. Node: every ```js run / ```ts run example with an ```output block prints exactly
//     that output (run in a non-UTC time zone, so time-zone bugs show up).
//  3. TypeScript: every TS solution type-checks with no problems; JS/TS solutions run.
//  4. SQL: every ```sql run example and SQL solution gives the documented result.
//  5. Browser (skip with --no-browser): every chapter in Chromium. Documented
//     outputs match the playground, every starter fails its checks, every solution
//     passes, quizzes render, no page errors.
//
// Exits with code 1 if anything fails.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, "..");
const WORK = path.join(import.meta.dirname, ".work", `run-${process.pid}`); // one folder per run, so runs can go in parallel
const TSC = path.join(import.meta.dirname, "node_modules", ".bin", "tsc");
const NO_BROWSER = process.argv.includes("--no-browser");
const LINKS = process.argv.includes("--links");
const BROWSER = process.argv.find((a) => a.startsWith("--browser="))?.slice(10) || "chromium"; // chromium | firefox | webkit
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

fs.mkdirSync(WORK, { recursive: true });
process.on("exit", () => fs.rmSync(WORK, { recursive: true, force: true }));
fs.writeFileSync(path.join(WORK, "package.json"), '{"type":"module"}');

let failures = 0;
const fail = (msg) => { failures++; console.log("  ✗ " + msg); };

// ---- book.js ----
const win = {};
new Function("window", fs.readFileSync(path.join(ROOT, "book.js"), "utf8"))(win);
const chapters = win.BOOK.parts.flatMap((p) => p.chapters).filter((c) => c.file && (!ONLY || c.id === ONLY));

const FENCE = /```([^\n]*)\n([\s\S]*?)\n```/g;
const blocksOf = (md) => [...md.matchAll(FENCE)].map((m) => ({ info: m[1].trim(), text: m[2] }));
const kindOf = (b) => b.info.replace(/title="[^"]*"/, "").replace(/\bxp=\d+/, "").trim().split(/\s+/);
const run = (cmd) => execFileSync("sh", ["-c", cmd + " 2>&1; true"], { encoding: "utf8" }).trimEnd();

const initSqlJs = require("sql.js");
const SQL = await initSqlJs();
fs.copyFileSync(path.join(ROOT, "sql-runner.js"), path.join(WORK, "sql-runner.cjs"));
const { runStatements } = require(path.join(WORK, "sql-runner.cjs"));
const schema = fs.readFileSync(path.join(ROOT, "chapters/sql/shop.sql"), "utf8");
const runSql = (sql) => { const db = new SQL.Database(); db.exec(schema); try { return runStatements(db, sql).map((r) => r.text).join("\n\n"); } catch (e) { return "ERROR: " + e.message; } finally { db.close(); } };

// Every chapter, for cross-reference checks (even when --only is used)
const allChapters = win.BOOK.parts.flatMap((p) => p.chapters).filter((c) => c.file);
const byNumber = Object.fromEntries(allChapters.filter((c) => typeof c.number === "number").map((c) => [c.number, c]));
const proseOf = (md) => md.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
const topicNumbers = (c) => new Set([...fs.readFileSync(path.join(ROOT, c.file), "utf8").matchAll(/^## (\d+\.\d+) /gm)].map((m) => m[1]));

let fileNo = 0;
for (const ch of chapters) {
  const file = path.join(ROOT, ch.file);
  console.log(`${ch.id}`);
  if (!fs.existsSync(file)) { fail(`missing file ${ch.file}`); continue; }
  const md = fs.readFileSync(file, "utf8");
  const blocks = blocksOf(md);
  // Cross-references: "Chapter N" must exist, "section N.M" must be a real topic heading.
  const prose = proseOf(md);
  for (const m of prose.matchAll(/\bChapter (\d+)\b/g)) if (!byNumber[Number(m[1])]) fail(`${ch.id}: "Chapter ${m[1]}" doesn't exist`);
  for (const m of prose.matchAll(/\bsection (\d+)\.(\d+)\b/g)) {
    const target = byNumber[Number(m[1])];
    if (!target || !topicNumbers(target).has(`${m[1]}.${m[2]}`)) fail(`${ch.id}: "section ${m[1]}.${m[2]}" doesn't exist`);
  }
  if (/\bChapter [A-C]\b/.test(prose)) fail(`${ch.id}: says "Chapter A/B/C" (appendices are called "Appendix A/B/C")`);
  // Practice titles must be unique within a chapter (they identify saved progress).
  const titles = [...md.matchAll(/^```practice \w+ title="([^"]+)"/gm)].map((m) => m[1]);
  for (const t of new Set(titles.filter((x, i) => titles.indexOf(x) !== i))) fail(`${ch.id}: duplicate practice title "${t}"`);
  let examples = 0, ok = 0, task = null;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const [kind, ...flags] = kindOf(b);
    const next = blocks[i + 1];
    if (kind === "quiz") {
      try {
        const qs = JSON.parse(b.text);
        qs.forEach((q, n) => { if (!(q.answer >= 0 && q.answer < q.options.length) || !q.why) fail(`quiz question ${n + 1} has no valid answer/why`); });
      } catch (e) { fail("quiz JSON: " + e.message); }
    }
    if (kind === "exercise" || kind === "practice") {
      task = { kind, lang: flags[0], starter: b.text, checks: null, solution: null, title: (b.info.match(/title="([^"]*)"/) || [])[1] };
      if (!task.title) fail(`${kind} without a title`);
      for (let j = i + 1; j < blocks.length; j++) {
        const k = kindOf(blocks[j])[0];
        if (k === "checks") task.checks = blocks[j].text;
        else if (k === "solution") task.solution = blocks[j].text;
        else if (k !== "hint") break;
      }
      if (!task.checks?.trim()) fail(`${kind} "${task.title}" has no checks`);
      if (!task.solution) fail(`${kind} "${task.title}" has no solution`);
      if (task.solution && task.lang === "sql") {
        if (runSql(task.solution).trim() !== task.checks.trim()) fail(`SQL solution for "${task.title}" doesn't give the expected result`);
        if (runSql(task.starter).trim() === task.checks.trim()) fail(`SQL starter for "${task.title}" already passes`);
      } else if (task.solution) {
        const f = path.join(WORK, `sol${++fileNo}.${task.lang}`);
        fs.writeFileSync(f, task.solution + "\nexport {};\n");
        if (task.lang === "ts") {
          const out = run(`"${TSC}" --ignoreConfig --noEmit --pretty false --strict --target esnext --module esnext --moduleResolution bundler --lib esnext,dom "${f}"`);
          if (out) fail(`TS solution for "${task.title}" has type problems:\n${out}`);
        }
        if (!/\bfetch\(/.test(task.solution)) {
          const out = run(`node "${f}"`);
          if (/ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX/.test(out)) { /* compiled and checked in the browser */ }
          else if (/^\S*Error\b|^\s+at /m.test(out) && !/ReferenceError: __book/.test(out)) fail(`solution for "${task.title}" throws:\n${out.split("\n").slice(0, 6).join("\n")}`);
        }
      }
    }
    const isRunnable = (kind === "js" || kind === "ts" || kind === "sql") && flags.includes("run");
    if (isRunnable && next && kindOf(next)[0] === "output") {
      examples++;
      let got;
      if (kind === "sql") got = runSql(b.text);
      else if (/\bfetch\(/.test(b.text)) { ok++; continue; } // browser-only, checked in step 5
      else {
        const f = path.join(WORK, `ex${++fileNo}.${kind === "ts" ? "mts" : "mjs"}`);
        fs.writeFileSync(f, b.text);
        got = run(`TZ=America/New_York node "${f}"`);
        if (/ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX/.test(got)) {
          run(`"${TSC}" --ignoreConfig --target esnext --module esnext --outDir "${WORK}" "${f}"`);
          got = run(`TZ=America/New_York node "${f.replace(/\.mts$/, ".mjs")}"`);
        }
      }
      if (got === next.text) ok++;
      else fail(`example output differs:\n${b.text.split("\n").slice(0, 3).join("\n")}\n--- expected:\n${next.text}\n--- got:\n${got}`);
    }
  }
  console.log(`  examples ${ok}/${examples}`);
}

// ---- links (npm run check -- --links) ----
if (LINKS) {
  console.log("\nLinks");
  const urls = new Map();
  for (const ch of allChapters) {
    const md = fs.readFileSync(path.join(ROOT, ch.file), "utf8");
    for (const m of md.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
      const u = m[1].replace(/#.*$/, "");
      if (!urls.has(u)) urls.set(u, ch.id);
    }
  }
  const list = [...urls];
  let bad = 0, next = 0;
  const worker = async () => {
    while (next < list.length) {
      const [u, where] = list[next++];
      let status = 0;
      for (const method of ["HEAD", "GET"]) {
        try {
          const r = await fetch(u, { method, redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "Mozilla/5.0 (book link check)" } });
          status = r.status;
          if (r.ok) break;
        } catch (e) { status = 0; }
      }
      if (status < 200 || status >= 300) { bad++; fail(`${where}: ${u} -> ${status || "no response"}`); }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(`  ${list.length - bad}/${list.length} links reachable`);
}

// ---- browser ----
if (!NO_BROWSER) {
  const playwright = await import("@playwright/test");
  const engine = playwright[BROWSER];
  if (!engine) { console.log(`Unknown --browser=${BROWSER}`); process.exit(1); }
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".md": "text/markdown", ".json": "application/json", ".sql": "text/plain", ".svg": "image/svg+xml" };
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!p.startsWith(ROOT)) return res.writeHead(403).end();
    const file = p.endsWith(path.sep) || p === ROOT ? path.join(p, "index.html") : p;
    fs.readFile(file, (err, data) => {
      if (err) return res.writeHead(404).end();
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }).end(data);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await engine.launch();
  console.log(`\nBrowser (${BROWSER})`);
  for (const ch of chapters) {
    const md = fs.readFileSync(path.join(ROOT, ch.file), "utf8");
    const solutions = [...md.matchAll(/```solution\n([\s\S]*?)\n```/g)].map((m) => m[1] + "\n");
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // Browsers log failed requests (like an example's deliberate 404) as console errors. Those are expected.
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.goto(`${base}/#/c/${ch.id}/all`);
    await page.locator(".chapter-body h2").first().waitFor();
    let ok = 0, bad = 0;
    const blocks = page.locator(".code-block.runnable");
    for (let i = 0; i < await blocks.count(); i++) {
      const b = blocks.nth(i);
      await b.getByRole("button", { name: "▶ Run" }).click();
      await b.getByRole("button", { name: "▶ Run" }).and(page.locator(":enabled")).waitFor({ timeout: 60000 });
      const got = (await b.locator(".run-output").evaluate((el) => Array.from(el.querySelectorAll(".out-line:not(.out-status)"), (l) => l.innerText).join("\n"))).trim();
      const exp = await b.evaluate((el) => el.nextElementSibling?.classList.contains("expected") ? el.nextElementSibling.querySelector("pre").innerText.trim() : null);
      if (exp !== null) { if (got === exp) ok++; else { bad++; fail(`${ch.id}: browser output differs for example ${i}\n--- expected:\n${exp}\n--- got:\n${got}`); } }
    }
    const tasks = page.locator(".exercise");
    let tasksOk = 0;
    for (let i = 0; i < await tasks.count(); i++) {
      const t = tasks.nth(i);
      await t.locator(".monaco-editor").waitFor({ timeout: 60000 });
      const title = await t.locator("h3").innerText();
      for (const code of [null, solutions[i]]) {
        if (code) await page.evaluate(([idx, c]) => window.monaco.editor.getModels().filter((m) => m.uri.path.startsWith("/exercise-"))[idx].setValue(c), [i, code]);
        await t.getByRole("button", { name: "✔ Check answer" }).click();
        await page.waitForFunction((idx) => document.querySelectorAll(".exercise")[idx].querySelector(".ex-summary, .run-output .out-error"), i, { timeout: 60000 });
        await page.waitForTimeout(150);
        const pass = /All \d+ checks passed|The check passed/.test(await t.locator(".run-output").innerText());
        if (!code && pass) fail(`${ch.id}: starter for "${title}" already passes`);
        if (code && !pass) fail(`${ch.id}: solution for "${title}" doesn't pass in the browser:\n${await t.locator(".run-output").innerText()}`);
        if (code && pass) tasksOk++;
      }
    }
    const quiz = await page.locator(".quiz-q").count();
    if (!quiz && !ch.checkpoint) fail(`${ch.id}: no quiz rendered`);
    if (errors.length) fail(`${ch.id}: page errors ${JSON.stringify(errors)}`);
    console.log(`  ${ch.id}: outputs ${ok} ok${bad ? `, ${bad} differ` : ""} · practices ${tasksOk}/${await tasks.count()} · quiz ${quiz}`);
    await page.close();
  }
  await browser.close();
  server.close();
}

console.log(failures ? `\n${failures} problem(s) found.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
