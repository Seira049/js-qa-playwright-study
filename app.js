/**
 * JavaScript & TypeScript for QA — interactive book.
 * Hash-router SPA, vanilla JS, no build step. Progress is saved in localStorage.
 *
 * Chapters are Markdown files (chapters/*.md). Each "## " heading is one topic
 * page (one topic per page, with Back / Next). "Whole chapter" shows it all at once.
 *
 * Special code fences:
 *   ```ts run / ```js run / ```sql run    runnable example (Run + Open in playground)
 *   ```output                             expected output, shown under the example
 *   ```practice ts title="…" xp=10        short practice right after a topic
 *   ```exercise ts title="…" xp=20        chapter exercise (default 20 XP)
 *   ```checks                             hidden checks (JS/TS) or the expected table (SQL)
 *   ```hint                               optional hint, shown on request
 *   ```solution                           optional solution
 *   ```quiz                               JSON array: [{ q, code?, options, answer, why }]
 * Practices and exercises earn XP when all their checks pass.
 *
 * Routes: #/  ·  #/c/<id> (chapter overview)  ·  #/c/<id>/t/<n> (topic n)  ·  #/c/<id>/all
 */
(function () {
  "use strict";

  const BOOK = window.BOOK;
  const PROGRESS_KEY = "js-qa-pw-progress-v1"; // chapters marked complete (kept from the first version)
  const EXERCISE_KEY = "js-qa-book-exercises-v1";
  const UI_KEY = "js-qa-book-ui-v1";            // topics seen, sidebar state, last page
  const app = document.getElementById("app");
  const toc = document.getElementById("toc");

  // ---------------------------------------------------------------------------
  // Helpers and storage
  // ---------------------------------------------------------------------------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
  const inline = (s) => window.marked.parseInline(String(s));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function readStore(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage disabled */ }
  }
  const isDone = (id) => !!readStore(PROGRESS_KEY)[id];
  function setDone(id, done) {
    const p = readStore(PROGRESS_KEY);
    if (done) p[id] = true; else delete p[id];
    writeStore(PROGRESS_KEY, p);
  }
  function exerciseStore() {
    const s = readStore(EXERCISE_KEY);
    s.code = s.code || {};
    s.passed = s.passed || {};
    return s;
  }
  function ui() {
    const s = readStore(UI_KEY);
    s.seen = s.seen || {};
    s.tocOpen = s.tocOpen || {};
    return s;
  }
  function updateUi(fn) { const s = ui(); fn(s); writeStore(UI_KEY, s); }

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2800);
  }
  function celebrate(anchor, xp) {
    const r = anchor.getBoundingClientRect();
    const f = document.createElement("div");
    f.className = "xp-float";
    f.setAttribute("aria-hidden", "true");
    f.textContent = `+${xp} XP`;
    f.style.left = `${r.left + r.width / 2}px`;
    f.style.top = `${r.top + window.scrollY}px`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1400);
  }

  // ---------------------------------------------------------------------------
  // Chapter list
  // ---------------------------------------------------------------------------
  const entries = [];
  BOOK.parts.forEach((part, pi) => {
    part.chapters.forEach((ch) => entries.push({ ...ch, kind: ch.planned ? "planned" : "md", partIndex: pi, part, optional: !!part.optional }));
  });
  const readable = entries.filter((e) => e.kind !== "planned");
  const counted = readable.filter((e) => !e.optional && !e.checkpoint);
  const findEntry = (id) => readable.find((e) => e.id === id);
  const chapterLabel = (e) => (e.label ? e.label : e.number ? `Chapter ${e.number}` : "");
  const byNumber = {};
  readable.forEach((e) => { if (typeof e.number === "number") byNumber[e.number] = e; });

  // ---------------------------------------------------------------------------
  // Markdown parsing
  // ---------------------------------------------------------------------------
  const LANG_LABEL = { js: "JavaScript", ts: "TypeScript", bash: "Terminal", json: "JSON", text: "Text", sql: "SQL", yaml: "YAML" };
  const LANG_ALIAS = { javascript: "js", typescript: "ts", sh: "bash", shell: "bash", console: "bash", yml: "yaml" };
  const DEFAULT_XP = { practice: 10, exercise: 20 };

  function parseInfo(info) {
    const title = (info.match(/title="([^"]*)"/) || [])[1] || "";
    const xp = Number((info.match(/\bxp=(\d+)/) || [])[1]) || 0;
    const words = info.replace(/title="[^"]*"/, "").replace(/\bxp=\d+/, "").trim().split(/\s+/).filter(Boolean);
    return { kind: words[0] || "", flags: words.slice(1), title, xp };
  }

  /** Lists the chapter's tasks (practices + exercises) in order, with stable keys. */
  function collectTasks(md, chapterId) {
    const tokens = window.marked.lexer(md);
    const tasks = [];
    let last = null;
    let exerciseIndex = 0;
    for (const t of tokens) {
      if (t.type === "space") continue;
      if (t.type !== "code") { last = null; continue; }
      const info = parseInfo(t.lang || "");
      if (info.kind === "exercise" || info.kind === "practice") {
        // Exercises keep their original "<chapter>:<n>" keys, so saved progress carries over.
        const key = info.kind === "exercise" ? `${chapterId}:${exerciseIndex++}` : `${chapterId}:p:${slug(info.title)}`;
        last = {
          kind: info.kind, key, title: info.title, xp: info.xp || DEFAULT_XP[info.kind],
          lang: LANG_ALIAS[info.flags[0]] || info.flags[0] || "js",
          starter: t.text + "\n", checks: "", solution: "", hint: "", token: t,
        };
        tasks.push(last);
      } else if (["checks", "solution", "hint"].includes(info.kind) && last) {
        last[info.kind] = t.text + "\n";
        t.bookHidden = true;
      } else {
        last = null;
      }
    }
    return { tokens, tasks };
  }

  function renderMarkdown(md, chapterId) {
    const { tokens, tasks } = collectTasks(md, chapterId);
    tasks.forEach((task, i) => { task.token.bookTask = i; });
    const quizzes = [];
    const renderer = new window.marked.Renderer();
    renderer.code = function (token) {
      if (token.bookHidden) return "";
      if (token.bookTask !== undefined) return `<div class="exercise" data-task="${token.bookTask}"></div>`;
      const info = parseInfo(token.lang || "");
      if (info.kind === "output") {
        return `<div class="expected"><div class="expected-label">Output</div><pre><code>${esc(token.text)}</code></pre></div>`;
      }
      if (info.kind === "quiz") {
        quizzes.push(JSON.parse(token.text));
        return `<div class="quiz-slot" data-quiz="${quizzes.length - 1}"></div>`;
      }
      const lang = LANG_ALIAS[info.kind] || info.kind || "text";
      const runnable = info.flags.includes("run") && (lang === "js" || lang === "ts" || lang === "sql");
      const actions = runnable
        ? `<span class="code-actions"><button class="btn-sm" data-act="run">▶ Run</button><button class="btn-sm ghost" data-act="stop" hidden>Stop</button><button class="btn-sm ghost" data-act="edit">Open in playground</button></span>`
        : `<span class="code-actions"><button class="btn-sm ghost" data-act="copy">Copy</button></span>`;
      return `<div class="code-block${runnable ? " runnable" : ""}" data-lang="${esc(lang)}">
        <div class="code-head"><span class="code-lang">${esc(LANG_LABEL[lang] || lang)}</span>${info.title ? `<span class="code-title">${esc(info.title)}</span>` : ""}${actions}</div>
        <pre tabindex="0"><code data-lang="${esc(lang)}">${esc(token.text)}</code></pre>
        ${runnable ? '<div class="run-output" hidden></div>' : ""}
      </div>`;
    };
    const html = window.marked.parser(tokens, { renderer });
    return { html, tasks, quizzes };
  }

  /** Splits rendered HTML into the intro and one section per "## " heading. */
  function splitTopics(html) {
    const box = document.createElement("div");
    box.innerHTML = html;
    const intro = [];
    const topics = [];
    for (const node of Array.from(box.childNodes)) {
      if (node.nodeType === 1 && node.tagName === "H2") {
        topics.push({ title: node.textContent.trim(), nodes: [node] });
      } else if (topics.length) {
        topics[topics.length - 1].nodes.push(node);
      } else {
        intro.push(node);
      }
    }
    return { intro, topics };
  }

  const mdCache = {};
  async function loadChapterMarkdown(file) {
    if (mdCache[file]) return mdCache[file];
    const res = await fetch(file, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Could not load ${file} (HTTP ${res.status}).`);
    mdCache[file] = await res.text();
    return mdCache[file];
  }

  // Topic titles per chapter (for the sidebar), filled in as chapters load.
  const topicTitles = {};
  function topicTitlesFrom(md) {
    return window.marked.lexer(md).filter((t) => t.type === "heading" && t.depth === 2).map((t) => t.text.replace(/`/g, ""));
  }

  // ---------------------------------------------------------------------------
  // XP and ranks
  // ---------------------------------------------------------------------------
  const RANKS = [
    { at: 0, name: "New Learner", icon: "🌱" },
    { at: 0.08, name: "Console Logger", icon: "🖨" },
    { at: 0.2, name: "Bug Spotter", icon: "🔍" },
    { at: 0.35, name: "Type Checker", icon: "🧩" },
    { at: 0.5, name: "Async Awaiter", icon: "⏳" },
    { at: 0.65, name: "Test Builder", icon: "🧪" },
    { at: 0.8, name: "Automation Pro", icon: "🛠" },
    { at: 1, name: "QA Hero", icon: "🏆" },
  ];
  let allTasks = null; // [{ key, xp, chapterId, kind }]
  async function loadAllTasks() {
    if (allTasks) return allTasks;
    const list = [];
    await Promise.all(readable.map(async (e) => {
      try {
        const md = await loadChapterMarkdown(e.file);
        topicTitles[e.id] = topicTitlesFrom(md);
        collectTasks(md, e.id).tasks.forEach((t) => list.push({ key: t.key, xp: t.xp, chapterId: e.id, kind: t.kind }));
      } catch { /* a chapter that can't load just doesn't count */ }
    }));
    allTasks = list;
    return list;
  }
  const xpTotal = () => (allTasks || []).reduce((n, t) => n + t.xp, 0);
  const xpEarned = () => { const p = exerciseStore().passed; return (allTasks || []).reduce((n, t) => n + (p[t.key] ? t.xp : 0), 0); };
  function rankFor(xp) {
    const total = xpTotal();
    const share = total ? xp / total : 0;
    return [...RANKS].reverse().find((r) => share >= r.at - 1e-9) || RANKS[0];
  }
  function xpBoxHtml() {
    if (!allTasks) return `<div class="xp-box"><small>Loading XP…</small></div>`;
    const earned = xpEarned();
    const total = xpTotal();
    const rank = rankFor(earned);
    const next = RANKS.find((r) => r.at * total > earned + 1e-9);
    const pct = total ? (earned / total) * 100 : 0;
    return `<div class="xp-box">
      <div class="xp-rank"><span class="xp-icon" aria-hidden="true">${rank.icon}</span><span><strong>${esc(rank.name)}</strong>
        <small>${next ? `${Math.ceil(next.at * total - earned)} XP to ${esc(next.name)}` : "Top rank reached!"}</small></span></div>
      <div class="xp-label"><span>⚡ XP</span><span>${earned} / ${total}</span></div>
      <div class="xp-bar" role="progressbar" aria-label="XP earned" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${earned}"><span style="width:${pct}%"></span></div>
    </div>`;
  }

  // ---------------------------------------------------------------------------
  // Sidebar: chapters with expandable topics
  // ---------------------------------------------------------------------------
  let current = { id: null, topic: null };
  function renderToc() {
    const s = ui();
    const done = exerciseStore().passed;
    toc.innerHTML = `
      <div class="toc-top">
        <a class="toc-home${current.id ? "" : " current"}" href="#/">Contents &amp; progress</a>
        <button class="toc-hide" id="toc-hide" title="Hide the menu (Ctrl + \\)" aria-label="Hide the menu">«</button>
      </div>
      ${xpBoxHtml()}
      ${BOOK.parts.map((part, pi) => {
        const items = entries.filter((e) => e.partIndex === pi).map((e) => {
          const chDone = isDone(e.id);
          const isCurrent = e.id === current.id;
          const titles = topicTitles[e.id];
          const open = s.tocOpen[e.id] ?? isCurrent;
          const tasks = (allTasks || []).filter((t) => t.chapterId === e.id);
          const solved = tasks.filter((t) => done[t.key]).length;
          const badge = tasks.length ? `<span class="toc-tag${solved === tasks.length ? " ok" : ""}" title="Practices solved">🎯 ${solved}/${tasks.length}</span>` : "";
          const sub = titles && open ? `<ul class="toc-topics" id="toc-sec-${esc(e.id)}">${titles.map((t, i) => {
            const n = i + 1;
            const seen = s.seen[`${e.id}:${n}`];
            const here = isCurrent && current.topic === n;
            return `<li class="${here ? "current" : ""}${seen ? " seen" : ""}"><a href="#/c/${esc(e.id)}/t/${n}"${here ? ' aria-current="page"' : ""}><span class="toc-dot">${seen ? "✓" : "•"}</span>${esc(t)}</a></li>`;
          }).join("")}<li><a class="toc-all" href="#/c/${esc(e.id)}/all">📜 Whole chapter on one page</a></li></ul>` : "";
          const toggle = titles ? `<button class="toc-exp" data-ch="${esc(e.id)}" aria-expanded="${open}" aria-controls="toc-sec-${esc(e.id)}" title="${open ? "Collapse" : "Expand"} topics">${open ? "▾" : "▸"}</button>` : "";
          return `<li class="toc-item${isCurrent ? " current" : ""}${chDone ? " done" : ""}${e.checkpoint ? " checkpoint" : ""}">
            <div class="toc-row">${toggle}<a href="#/c/${esc(e.id)}"><span class="toc-num">${chDone ? "✓" : e.checkpoint ? "🏁" : e.number || "·"}</span><span class="toc-title">${esc(e.title)}</span>${badge}</a></div>${sub}</li>`;
        }).join("");
        return `<div class="toc-part"><div class="toc-part-title">Part ${pi + 1}${part.optional ? " · optional" : ""}<span>${esc(part.title.replace(/^Appendix: /, ""))}</span></div><ul>${items}</ul></div>`;
      }).join("")}`;
    toc.querySelectorAll(".toc-exp").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.ch;
      updateUi((u) => { u.tocOpen[id] = !(u.tocOpen[id] ?? id === current.id); });
      renderToc();
    }));
    toc.querySelector("#toc-hide").addEventListener("click", () => setMenuHidden(true));
    const here = toc.querySelector(".toc-topics li.current");
    if (here) here.scrollIntoView({ block: "nearest" });
  }

  function setMenuHidden(hidden) {
    document.body.classList.toggle("menu-hidden", hidden);
    document.getElementById("menu-btn").setAttribute("aria-expanded", String(!hidden));
    updateUi((u) => { u.menuHidden = hidden; });
  }

  // ---------------------------------------------------------------------------
  // Home
  // ---------------------------------------------------------------------------
  function renderHome() {
    const done = counted.filter((e) => isDone(e.id)).length;
    const pct = counted.length ? Math.round((done / counted.length) * 100) : 0;
    const last = ui().last;
    const firstUnread = counted.find((e) => !isDone(e.id)) || counted[0];
    const resume = last && findEntry(last.id) ? `#/c/${last.id}${last.topic ? `/t/${last.topic}` : ""}` : `#/c/${firstUnread.id}`;
    const totalTasks = allTasks ? allTasks.length : 0;
    const solved = allTasks ? allTasks.filter((t) => exerciseStore().passed[t.key]).length : 0;

    app.innerHTML = `
      <section class="hero">
        <h1>${esc(BOOK.title)}</h1>
        <p>${esc(BOOK.subtitle)}</p>
        <div class="hero-actions">
          <a class="btn" href="${resume}">${last ? "Continue where you left off →" : "Start Chapter 1 →"}</a>
          <button class="btn secondary" id="open-pg">Open the playground</button>
          <a class="btn secondary" href="JS-and-TS-for-QA.pdf" download>📄 Download the PDF</a>
        </div>
        <div class="stats">
          <span><b>${done}/${counted.length}</b> chapters complete</span>
          ${allTasks ? `<span><b>${solved}/${totalTasks}</b> practices solved</span><span><b>${xpEarned()}</b> XP</span>` : ""}
        </div>
        <div class="overall-progress" aria-label="Overall progress ${pct}%"><span style="width:${pct}%"></span></div>
      </section>

      <section class="how">
        <h2>How this book works</h2>
        <ul>
          <li><b>One topic at a time.</b> Each chapter is split into short topics. Read one, try its examples, then press <b>Next</b>. Prefer one long page? Use <b>📜 Whole chapter on one page</b>.</li>
          <li><b>Read, then run.</b> JavaScript, TypeScript, and SQL examples marked <span class="pill">▶ Run</span> run in your browser. Change them in the playground and run them again.</li>
          <li><b>Practise and earn XP.</b> 🎯 Practices and exercises check your answer automatically. Each one you solve earns ⚡ XP and moves you up the ranks. 🏁 Checkpoint projects pull several chapters together.</li>
          <li><b>Checked against the docs.</b> Every chapter was checked against MDN, the TypeScript Handbook, the Node.js docs, and playwright.dev, and every example was run. Each one lists its sources at the end.</li>
          <li><b>Playwright on your computer.</b> Part 2 onwards uses real browsers, so those examples run on your machine against the practice project in the <code>practice/</code> folder. Chapter 17 shows how to set it up.</li>
        </ul>
      </section>

      ${BOOK.parts.map((part, pi) => `
        <section class="phase">
          <span class="phase-label">Part ${pi + 1}${part.optional ? " · Optional" : ""}</span>
          <h2>${esc(part.title)}</h2>
          ${part.intro ? `<p class="part-intro">${esc(part.intro)}</p>` : ""}
          <ol class="chapter-list">
            ${entries.filter((e) => e.partIndex === pi).map((e) => {
              const meta = e.checkpoint ? `${e.minutes} min · 🏁 project` : `${e.minutes} min`;
              return `<li class="${isDone(e.id) ? "done" : ""}${e.checkpoint ? " checkpoint" : ""}"><a href="#/c/${esc(e.id)}"><span class="cl-num">${isDone(e.id) ? "✓" : e.checkpoint ? "🏁" : e.number || "·"}</span><span class="cl-title">${esc(e.title)}</span><span class="cl-meta">${meta}</span></a></li>`;
            }).join("")}
          </ol>
        </section>`).join("")}`;

    app.querySelector("#open-pg").addEventListener("click", () => window.Playground.open());
  }

  // ---------------------------------------------------------------------------
  // Code blocks, quizzes, practices
  // ---------------------------------------------------------------------------
  function wireCodeBlocks(root) {
    root.querySelectorAll(".code-block").forEach((block) => {
      const source = block.querySelector("code").textContent;
      const lang = block.dataset.lang;
      const runBtn = block.querySelector("[data-act=run]");
      const stopBtn = block.querySelector("[data-act=stop]");
      let currentRun = null;
      if (runBtn) {
        runBtn.addEventListener("click", async () => {
          if (currentRun) currentRun.stop();
          runBtn.disabled = true;
          stopBtn.hidden = false;
          const run = window.Playground.execute(source, lang, block.querySelector(".run-output"));
          currentRun = run;
          await run.finished;
          if (currentRun === run) { currentRun = null; runBtn.disabled = false; stopBtn.hidden = true; }
        });
        stopBtn.addEventListener("click", () => currentRun && currentRun.stop());
      }
      const edit = block.querySelector("[data-act=edit]");
      if (edit) edit.addEventListener("click", () => window.Playground.open(source, lang));
      const copy = block.querySelector("[data-act=copy]");
      if (copy) {
        copy.addEventListener("click", async () => {
          try { await navigator.clipboard.writeText(source); copy.textContent = "Copied"; }
          catch { copy.textContent = "Select and copy"; }
          setTimeout(() => { copy.textContent = "Copy"; }, 1500);
        });
      }
    });
  }

  function renderQuiz(slot, questions) {
    slot.innerHTML = `
      <section class="quiz">
        <h3>Check your understanding</h3>
        ${questions.map((q, qi) => `
          <div class="quiz-q" data-qi="${qi}">
            <div class="quiz-question"><span class="quiz-n">${qi + 1}.</span> ${inline(q.q)}</div>
            ${q.code ? `<pre><code data-lang="${esc(q.lang || "js")}">${esc(q.code)}</code></pre>` : ""}
            <div class="quiz-options">
              ${q.options.map((opt, oi) => `<button class="quiz-opt" data-oi="${oi}">${inline(opt)}</button>`).join("")}
            </div>
            <p class="quiz-exp" hidden></p>
          </div>`).join("")}
        <p class="quiz-score" hidden></p>
      </section>`;
    let answered = 0;
    let right = 0;
    slot.querySelectorAll(".quiz-q").forEach((qEl) => {
      const q = questions[Number(qEl.dataset.qi)];
      const exp = qEl.querySelector(".quiz-exp");
      const btns = Array.from(qEl.querySelectorAll(".quiz-opt"));
      btns.forEach((btn) => btn.addEventListener("click", () => {
        const chosen = Number(btn.dataset.oi);
        btns.forEach((b, i) => { b.disabled = true; if (i === q.answer) b.classList.add("correct"); });
        const ok = chosen === q.answer;
        if (!ok) btn.classList.add("wrong");
        exp.hidden = false;
        exp.className = "quiz-exp " + (ok ? "ok" : "no");
        exp.innerHTML = `<b>${ok ? "Correct." : "Not quite."}</b> ${inline(q.why)}`;
        answered++;
        if (ok) right++;
        if (answered === questions.length) {
          const score = slot.querySelector(".quiz-score");
          score.hidden = false;
          score.textContent = `You got ${right} of ${questions.length} right.` + (right === questions.length ? " Nice work." : " Re-read the topics for the ones you missed, then reload the page to try again.");
        }
      }));
    });
    window.Playground.highlight(slot);
  }

  function labelFor(task, numbers) {
    if (task.kind === "practice") return `🎯 Practice`;
    return task.checkpoint ? "🏁 Checkpoint project" : `Exercise ${numbers.exercise}`;
  }

  async function mountTask(slot, task, label, chapter) {
    const store = exerciseStore();
    const key = task.key;
    const passed = () => !!exerciseStore().passed[key];
    slot.classList.add(task.kind === "practice" ? "practice" : "full-exercise");
    slot.innerHTML = `
      <div class="ex-head">
        <span class="ex-badge">${esc(label)}</span>
        <h3>${esc(task.title || "Exercise")}</h3>
        <span class="xp-gem">⚡ ${task.xp} XP</span>
        <span class="ex-state">${passed() ? "✅ Solved" : ""}</span>
      </div>
      <p class="ex-help">Edit the code, then press <b>✔ Check answer</b> (or Ctrl/Cmd + Enter). Your code is saved in this browser.</p>
      <div class="ex-editor"><pre class="ex-fallback"><code>${esc(store.code[key] ?? task.starter)}</code></pre></div>
      <div class="ex-actions">
        <button class="btn" data-act="check" disabled>✔ Check answer</button>
        <button class="btn secondary" data-act="stop" disabled>Stop</button>
        <button class="btn secondary" data-act="reset">Reset</button>
        ${task.hint ? '<button class="btn secondary" data-act="hint">💡 Hint</button>' : ""}
        ${task.solution ? '<button class="btn secondary" data-act="solution">Show solution</button>' : ""}
      </div>
      <div class="ex-hint" hidden></div>
      <div class="run-output" hidden></div>
      <div class="ex-solution" hidden></div>`;

    let ed;
    try {
      ed = await window.Playground.createEditor(slot.querySelector(".ex-editor"), store.code[key] ?? task.starter, task.lang, "exercise-" + key.replace(/[^a-z0-9]/gi, "-"));
    } catch (err) {
      slot.querySelector(".ex-help").textContent = "The editor couldn't load (" + (err.message || err) + "). You can still read the task above.";
      return;
    }
    const { editor, model, monaco } = ed;
    const checkBtn = slot.querySelector("[data-act=check]");
    const stopBtn = slot.querySelector("[data-act=stop]");
    const state = slot.querySelector(".ex-state");
    const outEl = slot.querySelector(".run-output");
    checkBtn.disabled = false;

    model.onDidChangeContent(() => {
      const s = exerciseStore();
      s.code[key] = model.getValue();
      writeStore(EXERCISE_KEY, s);
    });

    let currentRun = null;
    async function check() {
      if (currentRun) currentRun.stop();
      const code = model.getValue();
      const userLines = code.split("\n").length;
      checkBtn.disabled = true;
      stopBtn.disabled = false;
      const run = task.lang === "sql"
        ? window.Playground.execute(code, "sql", outEl)
        : window.Playground.execute(code + "\n;\n" + task.checks, task.lang, outEl, { userLines, source: code });
      currentRun = run;
      const r = await run.finished;
      if (currentRun !== run) return;
      currentRun = null;
      checkBtn.disabled = false;
      stopBtn.disabled = true;
      if (r.reason !== "done") return;

      const summary = document.createElement("div");
      summary.className = "ex-summary";
      if (task.lang === "sql") {
        const expected = task.checks.trim();
        const pass = r.errors === 0 && r.texts.join("\n\n").trim() === expected;
        r.checks = [{ label: "The query returns the expected result", pass }];
        if (!pass) {
          const hint = document.createElement("div");
          hint.className = "out-line out-status";
          hint.textContent = "Expected result:\n" + expected;
          outEl.appendChild(hint);
        }
      }
      const passedChecks = r.checks.filter((c) => c.pass).length;
      const allPass = r.checks.length > 0 && passedChecks === r.checks.length && r.problems.length === 0 && r.errors === 0;
      if (allPass) {
        summary.classList.add("pass");
        summary.textContent = r.checks.length === 1 ? "The check passed." : `All ${r.checks.length} checks passed.`;
        const firstTime = !passed();
        if (firstTime) {
          const before = allTasks ? rankFor(xpEarned()) : null;
          const s = exerciseStore(); s.passed[key] = true; writeStore(EXERCISE_KEY, s);
          celebrate(checkBtn, task.xp);
          if (allTasks) {
            const after = rankFor(xpEarned());
            const chTasks = allTasks.filter((t) => t.chapterId === chapter.id);
            const p = exerciseStore().passed;
            if (before && after !== before) setTimeout(() => toast(`${after.icon} New rank: ${after.name}!`), 900);
            else if (chapter.checkpoint) setTimeout(() => toast(`🏁 ${chapter.label || "Checkpoint"} complete!`), 900);
            else if (chTasks.length && chTasks.every((t) => p[t.key])) setTimeout(() => toast(`🏅 Every practice in ${chapterLabel(chapter)} solved!`), 900);
          }
          renderToc();
        }
        state.textContent = "✅ Solved";
      } else if (r.errors > 0 && r.checks.length === 0) {
        summary.classList.add("fail");
        summary.textContent = "Your code stopped with an error before the checks could run. Fix the error shown above, then try again.";
      } else {
        summary.classList.add("fail");
        const parts = [];
        if (r.checks.length) parts.push(`${passedChecks} of ${r.checks.length} checks passed`);
        if (r.problems.length) parts.push(`fix the TypeScript problem${r.problems.length > 1 ? "s" : ""} too`);
        summary.textContent = parts.join("; ") + "." + (task.hint ? " Stuck? Try the 💡 Hint." : "");
      }
      outEl.appendChild(summary);
    }
    checkBtn.addEventListener("click", check);
    stopBtn.addEventListener("click", () => currentRun && currentRun.stop());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, check);
    slot.querySelector("[data-act=reset]").addEventListener("click", () => {
      if (confirm("Reset to the starter code? Your changes will be lost.")) model.setValue(task.starter);
    });
    const hintBtn = slot.querySelector("[data-act=hint]");
    if (hintBtn) {
      hintBtn.addEventListener("click", () => {
        const box = slot.querySelector(".ex-hint");
        box.hidden = !box.hidden;
        if (!box.hidden && !box.innerHTML) box.innerHTML = `<b>💡 Hint:</b> ${window.marked.parse(task.hint)}`;
        hintBtn.textContent = box.hidden ? "💡 Hint" : "Hide hint";
      });
    }
    const solBtn = slot.querySelector("[data-act=solution]");
    if (solBtn) {
      solBtn.addEventListener("click", () => {
        const box = slot.querySelector(".ex-solution");
        if (!box.hidden) { box.hidden = true; solBtn.textContent = "Show solution"; return; }
        box.innerHTML = `<div class="expected-label">One possible solution</div><pre><code data-lang="${esc(task.lang)}">${esc(task.solution)}</code></pre>`;
        box.hidden = false;
        solBtn.textContent = "Hide solution";
        window.Playground.highlight(box);
      });
    }
  }

  /** Turns "Chapter 5" and "section 18.2" in prose into links. */
  function linkReferences(root, chapter, topics) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest("code, pre, a, h1, h2, h3, .quiz-opt, .ex-head") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    const re = /\b(Chapter (\d+))\b|\b(section (\d+)\.(\d+))\b/g;
    for (const node of texts) {
      const s = node.nodeValue;
      if (!re.test(s)) continue;
      re.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0;
      for (const m of s.matchAll(re)) {
        let href = null;
        if (m[2]) {
          const ch = byNumber[Number(m[2])];
          if (ch) href = `#/c/${ch.id}`;
        } else {
          const ch = byNumber[Number(m[4])];
          const titles = ch && topicTitles[ch.id];
          const idx = titles ? titles.findIndex((t) => t.startsWith(`${m[4]}.${m[5]} `)) : -1;
          if (idx >= 0) href = `#/c/${ch.id}/t/${idx + 1}`;
        }
        if (!href) continue;
        frag.append(s.slice(last, m.index));
        const a = document.createElement("a");
        a.href = href;
        a.className = "xref";
        a.textContent = m[0];
        frag.append(a);
        last = m.index + m[0].length;
      }
      if (last === 0) continue;
      frag.append(s.slice(last));
      node.replaceWith(frag);
    }
  }

  // ---------------------------------------------------------------------------
  // Chapter view: overview, one topic, or the whole chapter
  // ---------------------------------------------------------------------------
  let renderToken = 0;

  async function renderChapter(id, mode, topicNo) {
    const e = findEntry(id);
    if (!e) { location.hash = "#/"; return; }
    const token = ++renderToken;
    current = { id, topic: mode === "topic" ? topicNo : null };
    updateUi((u) => { u.last = { id, topic: current.topic }; if (current.topic) u.seen[`${id}:${topicNo}`] = true; });

    let md;
    try {
      md = await loadChapterMarkdown(e.file);
    } catch (err) {
      app.innerHTML = `<div class="callout warn">${esc(err.message)}</div>`;
      return;
    }
    if (token !== renderToken) return;
    topicTitles[e.id] = topicTitlesFrom(md);
    const rendered = renderMarkdown(md, e.id);
    const { intro, topics } = splitTopics(rendered.html);
    if (mode === "topic" && (topicNo < 1 || topicNo > topics.length)) { location.replace(`#/c/${id}`); return; }

    const idx = readable.indexOf(e);
    const prevCh = readable[idx - 1];
    const nextCh = readable[idx + 1];
    const optional = e.optional ? '<span class="pill">Optional</span>' : "";
    const tasks = rendered.tasks;
    const solved = tasks.filter((t) => exerciseStore().passed[t.key]).length;

    const head = `
      <header class="chapter-head">
        <span class="phase-label">Part ${e.partIndex + 1} · ${esc(e.part.title)}${chapterLabel(e) ? " · " + chapterLabel(e) : ""}</span>
        <h1>${mode === "topic" ? `<a class="ch-link" href="#/c/${esc(id)}">${esc(e.title)}</a>` : esc(e.title)}</h1>
        <div class="meta">${optional}<span>${e.minutes} min</span><span>${topics.length} topics</span>${tasks.length ? `<span>🎯 ${solved}/${tasks.length} practices</span>` : ""}
          ${mode !== "all" ? `<a class="small-link" href="#/c/${esc(id)}/all">📜 Whole chapter on one page</a>` : `<a class="small-link" href="#/c/${esc(id)}">One topic per page</a>`}</div>
      </header>`;

    const body = document.createElement("div");
    body.className = "chapter-body";
    let foot = "";

    if (mode === "overview") {
      intro.forEach((n) => body.appendChild(n));
      const seen = ui().seen;
      const startAt = Math.max(0, topics.findIndex((_, i) => !seen[`${id}:${i + 1}`]));
      const list = document.createElement("div");
      list.innerHTML = `
        <h2 class="topics-head">Topics in this ${e.checkpoint ? "project" : "chapter"}</h2>
        <ol class="topic-list">${topics.map((t, i) => `<li class="${seen[`${id}:${i + 1}`] ? "seen" : ""}"><a href="#/c/${esc(id)}/t/${i + 1}"><span class="tl-dot">${seen[`${id}:${i + 1}`] ? "✓" : i + 1}</span>${esc(t.title)}</a></li>`).join("")}</ol>
        <div class="topic-nav">
          ${prevCh ? `<a class="btn secondary" href="#/c/${esc(prevCh.id)}">← ${esc(chapterLabel(prevCh) || prevCh.title)}</a>` : `<a class="btn secondary" href="#/">← Contents</a>`}
          <a class="btn" href="#/c/${esc(id)}/t/${startAt + 1}">${startAt > 0 ? `Continue: ${esc(topics[startAt].title)} →` : `Start: ${esc(topics[0]?.title || "first topic")} →`}</a>
        </div>`;
      body.appendChild(list);
    } else if (mode === "topic") {
      const t = topics[topicNo - 1];
      t.nodes.forEach((n) => body.appendChild(n));
      const isLast = topicNo === topics.length;
      foot = `
        <div class="topic-progress" aria-label="Topic ${topicNo} of ${topics.length}"><span style="width:${(topicNo / topics.length) * 100}%"></span></div>
        <p class="topic-count">Topic ${topicNo} of ${topics.length}</p>
        ${isLast ? `<button class="btn" id="toggle-complete"></button>` : ""}
        <div class="topic-nav">
          <a class="btn secondary" href="${topicNo > 1 ? `#/c/${esc(id)}/t/${topicNo - 1}` : `#/c/${esc(id)}`}">← Back</a>
          ${isLast
            ? (nextCh ? `<a class="btn" href="#/c/${esc(nextCh.id)}">Next: ${esc(chapterLabel(nextCh) ? chapterLabel(nextCh) + " · " : "")}${esc(nextCh.title)} →</a>` : `<a class="btn" href="#/">Back to the contents →</a>`)
            : `<a class="btn" href="#/c/${esc(id)}/t/${topicNo + 1}">Next: ${esc(topics[topicNo].title)} →</a>`}
        </div>`;
    } else {
      intro.forEach((n) => body.appendChild(n));
      topics.forEach((t) => t.nodes.forEach((n) => body.appendChild(n)));
      foot = `<button class="btn" id="toggle-complete"></button>
        <nav class="pager">
          ${prevCh ? `<a class="pager-link" href="#/c/${esc(prevCh.id)}/all"><small>← Previous</small><span>${esc(prevCh.title)}</span></a>` : "<span></span>"}
          ${nextCh ? `<a class="pager-link next" href="#/c/${esc(nextCh.id)}/all"><small>Next →</small><span>${esc(nextCh.title)}</span></a>` : "<span></span>"}
        </nav>`;
    }

    app.innerHTML = `<article class="chapter">${head}<div class="chapter-body-slot"></div><footer class="chapter-foot">${foot}</footer></article>`;
    app.querySelector(".chapter-body-slot").replaceWith(body);
    window.scrollTo(0, 0);
    renderToc();

    const toggle = app.querySelector("#toggle-complete");
    if (toggle) {
      const paint = () => { toggle.textContent = isDone(e.id) ? `✓ ${e.checkpoint ? "Project" : "Chapter"} complete (click to undo)` : `Mark ${e.checkpoint ? "project" : "chapter"} complete`; toggle.classList.toggle("secondary", isDone(e.id)); };
      paint();
      toggle.addEventListener("click", () => {
        setDone(e.id, !isDone(e.id));
        paint();
        renderToc();
        if (isDone(e.id)) toast(nextCh ? "Nice work! On to the next one." : "🏆 You finished the book!");
      });
    }

    body.querySelectorAll("a[href^='http']").forEach((a) => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
    linkReferences(body, e, topics);
    wireCodeBlocks(body);
    body.querySelectorAll(".quiz-slot").forEach((slot) => renderQuiz(slot, rendered.quizzes[Number(slot.dataset.quiz)]));
    let exNo = 0;
    tasks.forEach((task) => { if (task.kind === "exercise") task.number = ++exNo; task.checkpoint = !!e.checkpoint; });
    body.querySelectorAll(".exercise").forEach((slot) => {
      const task = tasks[Number(slot.dataset.task)];
      mountTask(slot, task, labelFor(task, { exercise: task.number }), e);
    });
    window.Playground.highlight(body);
    document.getElementById("app").focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------------------
  // Router + init
  // ---------------------------------------------------------------------------
  function route() {
    const hash = location.hash || "#/";
    document.body.classList.remove("toc-open");
    const m = hash.match(/^#\/c\/([^/]+)(?:\/(t)\/(\d+)|\/(all))?$/);
    if (m) {
      const id = decodeURIComponent(m[1]);
      if (m[2]) renderChapter(id, "topic", Number(m[3]));
      else if (m[4]) renderChapter(id, "all");
      else renderChapter(id, "overview");
    } else {
      renderToken++;
      current = { id: null, topic: null };
      renderHome();
      renderToc();
      if (hash === "#/playground") window.Playground.open();
    }
  }

  if (location.protocol === "file:") {
    document.getElementById("file-warning").hidden = false;
  }

  document.getElementById("reset-progress").addEventListener("click", () => {
    if (confirm("Clear all saved progress, practice answers, XP, and playground code saved in this browser?")) {
      writeStore(PROGRESS_KEY, {});
      writeStore(EXERCISE_KEY, {});
      writeStore(UI_KEY, {});
      try { localStorage.removeItem("js-qa-book-playground-v1"); } catch { /* ignore */ }
      route();
    }
  });
  document.getElementById("toc-toggle").addEventListener("click", () => document.body.classList.toggle("toc-open"));
  document.getElementById("menu-btn").addEventListener("click", () => setMenuHidden(!document.body.classList.contains("menu-hidden")));
  document.querySelector(".skip-link").addEventListener("click", (ev) => { ev.preventDefault(); document.getElementById("app").focus(); });
  document.addEventListener("keydown", (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === "\\") { ev.preventDefault(); setMenuHidden(!document.body.classList.contains("menu-hidden")); }
  });
  if (ui().menuHidden) setMenuHidden(true);

  window.Playground.init();
  window.addEventListener("hashchange", route);
  route();
  // Load every chapter's practice list in the background, for XP and the sidebar.
  loadAllTasks().then(() => { renderToc(); if (!current.id) renderHome(); });
})();
