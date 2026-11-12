/**
 * JavaScript & TypeScript for QA — interactive book.
 * Hash-router SPA, vanilla JS, no build step. Progress is saved in localStorage.
 *
 * Reviewed chapters are Markdown files (chapters/*.md) with a few special code fences:
 *   ```ts run / ```js run      runnable example (Run + Open in playground)
 *   ```output                  expected output, shown under the example
 *   ```exercise ts title="…"   exercise starter code, followed by:
 *   ```checks                  hidden checks, run after the learner's code
 *   ```solution                optional solution
 *   ```quiz                    JSON array: [{ q, code?, options, answer, why }]
 * Older modules still come from curriculum.js until each one is rewritten.
 */
(function () {
  "use strict";

  const BOOK = window.BOOK;
  const LEGACY = window.CURRICULUM;
  const PROGRESS_KEY = "js-qa-pw-progress-v1"; // same key as the earlier app, so progress carries over
  const EXERCISE_KEY = "js-qa-book-exercises-v1";
  const app = document.getElementById("app");
  const toc = document.getElementById("toc");

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
  const inline = (s) => window.marked.parseInline(String(s));

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

  // ---------------------------------------------------------------------------
  // Build the chapter list
  // ---------------------------------------------------------------------------
  const legacyById = {};
  (LEGACY ? LEGACY.phases : []).forEach((phase) => phase.modules.forEach((m) => { legacyById[m.id] = m; }));

  const entries = [];
  BOOK.parts.forEach((part, pi) => {
    part.chapters.forEach((ch) => {
      if (ch.legacy) {
        const m = legacyById[ch.legacy];
        if (!m) return;
        entries.push({ id: m.id, kind: "legacy", title: m.title, minutes: null, duration: m.duration, module: m, partIndex: pi, part, optional: !!part.optional });
      } else {
        entries.push({ ...ch, kind: ch.planned ? "planned" : "md", partIndex: pi, part, optional: !!part.optional });
      }
    });
  });
  const readable = entries.filter((e) => e.kind !== "planned");
  const counted = readable.filter((e) => !e.optional);
  const findEntry = (id) => readable.find((e) => e.id === id);
  const chapterLabel = (e) => (e.number ? `Chapter ${e.number}` : e.kind === "legacy" ? "Earlier draft" : "");

  // ---------------------------------------------------------------------------
  // Sidebar
  // ---------------------------------------------------------------------------
  function renderToc(currentId) {
    toc.innerHTML = `
      <a class="toc-home${currentId ? "" : " current"}" href="#/">Contents &amp; progress</a>
      ${BOOK.parts.map((part, pi) => {
        const items = entries.filter((e) => e.partIndex === pi).map((e) => {
          if (e.kind === "planned") {
            return `<li class="toc-item planned" title="Not written yet"><span class="toc-num">${e.number}</span><span class="toc-title">${esc(e.title)}</span><span class="toc-tag">soon</span></li>`;
          }
          const done = isDone(e.id);
          const tag = e.kind === "legacy" ? '<span class="toc-tag draft">draft</span>' : "";
          return `<li class="toc-item${e.id === currentId ? " current" : ""}${done ? " done" : ""}">
            <a href="#/c/${esc(e.id)}"><span class="toc-num">${done ? "✓" : e.number || "·"}</span><span class="toc-title">${esc(e.title)}</span>${tag}</a></li>`;
        }).join("");
        return `<div class="toc-part"><div class="toc-part-title">Part ${pi + 1}${part.optional ? " · optional" : ""}<span>${esc(part.title.replace(/^Appendix: /, ""))}</span></div><ul>${items}</ul></div>`;
      }).join("")}`;
  }

  // ---------------------------------------------------------------------------
  // Home
  // ---------------------------------------------------------------------------
  function renderHome() {
    const done = counted.filter((e) => isDone(e.id)).length;
    const pct = counted.length ? Math.round((done / counted.length) * 100) : 0;
    const firstUnread = counted.find((e) => !isDone(e.id)) || counted[0];
    const reviewedCount = readable.filter((e) => e.kind === "md").length;
    const plannedCount = entries.filter((e) => e.kind === "planned").length;

    app.innerHTML = `
      <section class="hero">
        <h1>${esc(BOOK.title)}</h1>
        <p>${esc(BOOK.subtitle)}</p>
        <div class="hero-actions">
          <a class="btn" href="#/c/${esc(firstUnread.id)}">${done ? "Continue reading" : "Start reading"}</a>
          <button class="btn secondary" id="open-pg">Open the playground</button>
        </div>
        <div class="stats">
          <span><b>${done}/${counted.length}</b> chapters complete</span>
          <span><b>${reviewedCount}</b> reviewed chapter${reviewedCount === 1 ? "" : "s"}</span>
          <span><b>${plannedCount}</b> chapter${plannedCount === 1 ? "" : "s"} planned</span>
        </div>
        <div class="overall-progress" aria-label="Overall progress ${pct}%"><span style="width:${pct}%"></span></div>
      </section>

      <section class="how">
        <h2>How this book works</h2>
        <ul>
          <li><b>Read, then run.</b> Examples marked <span class="pill">▶ Run</span> run in your browser. Change them in the playground and run them again.</li>
          <li><b>Practise.</b> Each chapter ends with an exercise that checks your answer, and a short quiz.</li>
          <li><b>Checked against the docs.</b> Chapters marked <span class="pill ok">✓ Reviewed</span> were checked against MDN, the TypeScript Handbook, the Node.js docs, and playwright.dev, and every example was run. Each one lists its sources at the end.</li>
          <li><b>Earlier drafts</b> from the first version of this guide are still available and marked <span class="pill warn">draft</span>. They haven't been re-checked yet, and each will be rewritten as a reviewed chapter.</li>
        </ul>
      </section>

      ${BOOK.parts.map((part, pi) => `
        <section class="phase">
          <span class="phase-label">Part ${pi + 1}${part.optional ? " · Optional" : ""}</span>
          <h2>${esc(part.title)}</h2>
          ${part.intro ? `<p class="part-intro">${esc(part.intro)}</p>` : ""}
          <ol class="chapter-list">
            ${entries.filter((e) => e.partIndex === pi).map((e) => {
              if (e.kind === "planned") return `<li class="planned"><span class="cl-num">${e.number}</span><span class="cl-title">${esc(e.title)}</span><span class="cl-meta">Planned</span></li>`;
              const meta = e.kind === "md" ? `${e.minutes} min · <span class="ok">✓ Reviewed</span>` : `${esc(e.duration || "")} · <span class="warn">draft</span>`;
              return `<li class="${isDone(e.id) ? "done" : ""}"><a href="#/c/${esc(e.id)}"><span class="cl-num">${isDone(e.id) ? "✓" : e.number || "·"}</span><span class="cl-title">${esc(e.title)}</span><span class="cl-meta">${meta}</span></a></li>`;
            }).join("")}
          </ol>
        </section>`).join("")}`;

    app.querySelector("#open-pg").addEventListener("click", () => window.Playground.open());
  }

  // ---------------------------------------------------------------------------
  // Markdown chapters
  // ---------------------------------------------------------------------------
  const LANG_LABEL = { js: "JavaScript", ts: "TypeScript", bash: "Terminal", json: "JSON", text: "Text", sql: "SQL" };
  const LANG_ALIAS = { javascript: "js", typescript: "ts", sh: "bash", shell: "bash", console: "bash" };

  function parseInfo(info) {
    const title = (info.match(/title="([^"]*)"/) || [])[1] || "";
    const words = info.replace(/title="[^"]*"/, "").trim().split(/\s+/).filter(Boolean);
    return { kind: words[0] || "", flags: words.slice(1), title };
  }

  function renderMarkdown(md) {
    const tokens = window.marked.lexer(md);
    const exercises = [];
    const quizzes = [];
    let lastExercise = null;
    for (const t of tokens) {
      if (t.type === "space") continue;
      if (t.type !== "code") { lastExercise = null; continue; }
      const info = parseInfo(t.lang || "");
      if (info.kind === "exercise") {
        lastExercise = { lang: LANG_ALIAS[info.flags[0]] || info.flags[0] || "js", title: info.title, starter: t.text + "\n", checks: "", solution: "" };
        t.bookExercise = exercises.push(lastExercise) - 1;
      } else if ((info.kind === "checks" || info.kind === "solution") && lastExercise) {
        lastExercise[info.kind] = t.text + "\n";
        t.bookHidden = true;
      } else {
        lastExercise = null;
      }
    }

    const renderer = new window.marked.Renderer();
    renderer.code = function (token) {
      if (token.bookHidden) return "";
      if (token.bookExercise !== undefined) return `<div class="exercise" data-ex="${token.bookExercise}"></div>`;
      const info = parseInfo(token.lang || "");
      if (info.kind === "output") {
        return `<div class="expected"><div class="expected-label">Output</div><pre><code>${esc(token.text)}</code></pre></div>`;
      }
      if (info.kind === "quiz") {
        quizzes.push(JSON.parse(token.text));
        return `<div class="quiz-slot" data-quiz="${quizzes.length - 1}"></div>`;
      }
      const lang = LANG_ALIAS[info.kind] || info.kind || "text";
      const runnable = info.flags.includes("run") && (lang === "js" || lang === "ts");
      const actions = runnable
        ? `<span class="code-actions"><button class="btn-sm" data-act="run">▶ Run</button><button class="btn-sm ghost" data-act="stop" hidden>Stop</button><button class="btn-sm ghost" data-act="edit">Open in playground</button></span>`
        : `<span class="code-actions"><button class="btn-sm ghost" data-act="copy">Copy</button></span>`;
      return `<div class="code-block${runnable ? " runnable" : ""}" data-lang="${esc(lang)}">
        <div class="code-head"><span class="code-lang">${esc(LANG_LABEL[lang] || lang)}</span>${info.title ? `<span class="code-title">${esc(info.title)}</span>` : ""}${actions}</div>
        <pre><code data-lang="${esc(lang)}">${esc(token.text)}</code></pre>
        ${runnable ? '<div class="run-output" hidden></div>' : ""}
      </div>`;
    };
    const html = window.marked.parser(tokens, { renderer });
    return { html, exercises, quizzes };
  }

  function wireCodeBlocks(root) {
    root.querySelectorAll(".code-block").forEach((block) => {
      const source = block.querySelector("code").textContent;
      const lang = block.dataset.lang;
      const runBtn = block.querySelector("[data-act=run]");
      const stopBtn = block.querySelector("[data-act=stop]");
      let current = null;
      if (runBtn) {
        runBtn.addEventListener("click", async () => {
          if (current) current.stop();
          runBtn.disabled = true;
          stopBtn.hidden = false;
          const run = window.Playground.execute(source, lang, block.querySelector(".run-output"));
          current = run;
          await run.finished;
          if (current === run) { current = null; runBtn.disabled = false; stopBtn.hidden = true; }
        });
        stopBtn.addEventListener("click", () => current && current.stop());
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

  function renderQuiz(slot, questions, chapterId) {
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
          score.textContent = `You got ${right} of ${questions.length} right.` + (right === questions.length ? " Nice work." : " Re-read the sections for the ones you missed, then reload the page to try again.");
        }
      }));
    });
    window.Playground.highlight(slot);
  }

  async function mountExercise(slot, ex, key, index) {
    const store = exerciseStore();
    slot.innerHTML = `
      <div class="ex-head">
        <span class="ex-badge">Exercise ${index + 1}</span>
        <h3>${esc(ex.title || "Exercise")}</h3>
        <span class="ex-state">${store.passed[key] ? "✅ Passed" : ""}</span>
      </div>
      <p class="ex-help">Edit the code below, then press <b>Run &amp; check</b> (or Ctrl/Cmd + Enter). Your code is saved in this browser.</p>
      <div class="ex-editor"><pre class="ex-fallback"><code>${esc(store.code[key] ?? ex.starter)}</code></pre></div>
      <div class="ex-actions">
        <button class="btn" data-act="check" disabled>▶ Run &amp; check</button>
        <button class="btn secondary" data-act="stop" disabled>Stop</button>
        <button class="btn secondary" data-act="reset">Reset</button>
        ${ex.solution ? '<button class="btn secondary" data-act="solution">Show solution</button>' : ""}
      </div>
      <div class="run-output" hidden></div>
      <div class="ex-solution" hidden></div>`;

    let ed;
    try {
      ed = await window.Playground.createEditor(slot.querySelector(".ex-editor"), store.code[key] ?? ex.starter, ex.lang, "exercise-" + key.replace(/[^a-z0-9]/gi, "-"));
    } catch (err) {
      slot.querySelector(".ex-help").textContent = "The editor couldn't load (" + (err.message || err) + "). You can still read the exercise above.";
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

    let current = null;
    async function check() {
      if (current) current.stop();
      const code = model.getValue();
      const userLines = code.split("\n").length;
      checkBtn.disabled = true;
      stopBtn.disabled = false;
      const run = window.Playground.execute(code + "\n;\n" + ex.checks, ex.lang, outEl, { userLines });
      current = run;
      const r = await run.finished;
      if (current !== run) return;
      current = null;
      checkBtn.disabled = false;
      stopBtn.disabled = true;
      if (r.reason !== "done") return;

      const summary = document.createElement("div");
      summary.className = "ex-summary";
      const passedChecks = r.checks.filter((c) => c.pass).length;
      const allPass = r.checks.length > 0 && passedChecks === r.checks.length && r.problems.length === 0 && r.errors === 0;
      if (allPass) {
        summary.classList.add("pass");
        summary.textContent = `All ${r.checks.length} checks passed.`;
        const s = exerciseStore(); s.passed[key] = true; writeStore(EXERCISE_KEY, s);
        state.textContent = "✅ Passed";
      } else if (r.errors > 0 && r.checks.length === 0) {
        summary.classList.add("fail");
        summary.textContent = "Your code stopped with an error before the checks could run. Fix the error shown above, then try again.";
      } else {
        summary.classList.add("fail");
        const parts = [];
        if (r.checks.length) parts.push(`${passedChecks} of ${r.checks.length} checks passed`);
        if (r.problems.length) parts.push(`fix the TypeScript problem${r.problems.length > 1 ? "s" : ""} too`);
        summary.textContent = parts.join("; ") + ".";
      }
      outEl.appendChild(summary);
    }
    checkBtn.addEventListener("click", check);
    stopBtn.addEventListener("click", () => current && current.stop());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, check);
    slot.querySelector("[data-act=reset]").addEventListener("click", () => {
      if (confirm("Reset this exercise to the starter code? Your changes will be lost.")) model.setValue(ex.starter);
    });
    const solBtn = slot.querySelector("[data-act=solution]");
    if (solBtn) {
      solBtn.addEventListener("click", () => {
        const box = slot.querySelector(".ex-solution");
        if (!box.hidden) { box.hidden = true; solBtn.textContent = "Show solution"; return; }
        box.innerHTML = `<div class="expected-label">One possible solution</div><pre><code data-lang="${esc(ex.lang)}">${esc(ex.solution)}</code></pre>`;
        box.hidden = false;
        solBtn.textContent = "Hide solution";
        window.Playground.highlight(box);
      });
    }
  }

  const mdCache = {};
  async function loadChapterMarkdown(file) {
    if (mdCache[file]) return mdCache[file];
    const res = await fetch(file, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Could not load ${file} (HTTP ${res.status}).`);
    mdCache[file] = await res.text();
    return mdCache[file];
  }

  // ---------------------------------------------------------------------------
  // Legacy modules (curriculum.js)
  // ---------------------------------------------------------------------------
  function renderLegacyBlock(b) {
    switch (b.type) {
      case "h": return `<h4>${esc(b.text)}</h4>`;
      case "code": return `<div class="code-block" data-lang="ts"><div class="code-head"><span class="code-lang">Code</span><span class="code-actions"><button class="btn-sm ghost" data-act="copy">Copy</button></span></div><pre><code data-lang="ts">${esc(b.text)}</code></pre></div>`;
      case "list": return `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
      default: return `<p>${esc(b.text)}</p>`;
    }
  }

  function legacyHtml(m) {
    return `
      <div class="callout warn"><b>Earlier draft.</b> This section comes from the first version of the guide and hasn't been re-checked against the official docs yet. It will be rewritten as a reviewed chapter. If something here disagrees with a reviewed chapter, the reviewed chapter is correct.</div>
      ${m.lessons.map((lesson) => `<h2>${esc(lesson.title)}</h2>${lesson.body.map(renderLegacyBlock).join("")}`).join("")}
      ${m.quiz && m.quiz.length ? '<div class="quiz-slot" data-quiz="0"></div>' : ""}`;
  }

  // ---------------------------------------------------------------------------
  // Chapter view
  // ---------------------------------------------------------------------------
  let renderToken = 0;

  async function renderChapter(id) {
    const e = findEntry(id);
    if (!e) { location.hash = "#/"; return; }
    const token = ++renderToken;
    const idx = readable.indexOf(e);
    const prev = readable[idx - 1];
    const next = readable[idx + 1];
    const partNo = e.partIndex + 1;
    const badge = e.kind === "md" ? '<span class="pill ok">✓ Reviewed</span>' : '<span class="pill warn">Earlier draft · not yet reviewed</span>';
    const optional = e.optional ? '<span class="pill">Optional</span>' : "";
    const time = e.kind === "md" ? `${e.minutes} min` : esc(e.duration || "");

    app.innerHTML = `
      <article class="chapter">
        <header class="chapter-head">
          <span class="phase-label">Part ${partNo} · ${esc(e.part.title)}${chapterLabel(e) ? " · " + chapterLabel(e) : ""}</span>
          <h1>${esc(e.title)}</h1>
          ${e.kind === "legacy" ? `<p class="summary">${esc(e.module.summary)}</p>` : ""}
          <div class="meta">${badge}${optional}<span>${time}</span></div>
        </header>
        <div class="chapter-body"><p class="loading">Loading…</p></div>
        <footer class="chapter-foot">
          <button class="btn" id="toggle-complete"></button>
          <nav class="pager">
            ${prev ? `<a class="pager-link" href="#/c/${esc(prev.id)}"><small>← Previous</small><span>${esc(prev.title)}</span></a>` : "<span></span>"}
            ${next ? `<a class="pager-link next" href="#/c/${esc(next.id)}"><small>Next →</small><span>${esc(next.title)}</span></a>` : "<span></span>"}
          </nav>
        </footer>
      </article>`;
    window.scrollTo(0, 0);
    renderToc(e.id);

    const toggle = app.querySelector("#toggle-complete");
    const paintToggle = () => { toggle.textContent = isDone(e.id) ? "✓ Completed (click to undo)" : "Mark chapter complete"; toggle.classList.toggle("secondary", isDone(e.id)); };
    paintToggle();
    toggle.addEventListener("click", () => { setDone(e.id, !isDone(e.id)); paintToggle(); renderToc(e.id); });

    const body = app.querySelector(".chapter-body");
    let exercises = [];
    let quizzes = [];
    try {
      if (e.kind === "md") {
        const rendered = renderMarkdown(await loadChapterMarkdown(e.file));
        if (token !== renderToken) return;
        body.innerHTML = rendered.html;
        exercises = rendered.exercises;
        quizzes = rendered.quizzes;
      } else {
        body.innerHTML = legacyHtml(e.module);
        quizzes = e.module.quiz && e.module.quiz.length
          ? [e.module.quiz.map((q) => ({ q: esc(q.question), options: q.options.map(esc), answer: q.correct, why: esc(q.explanation) }))]
          : [];
      }
    } catch (err) {
      body.innerHTML = `<div class="callout warn">${esc(err.message)}</div>`;
      return;
    }

    body.querySelectorAll("a[href^='http']").forEach((a) => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
    wireCodeBlocks(body);
    body.querySelectorAll(".quiz-slot").forEach((slot) => renderQuiz(slot, quizzes[Number(slot.dataset.quiz)], e.id));
    body.querySelectorAll(".exercise").forEach((slot) => {
      const i = Number(slot.dataset.ex);
      mountExercise(slot, exercises[i], `${e.id}:${i}`, i);
    });
    window.Playground.highlight(body);
  }

  // ---------------------------------------------------------------------------
  // Router + init
  // ---------------------------------------------------------------------------
  function route() {
    const hash = location.hash || "#/";
    const legacy = hash.match(/^#\/module\/(.+)$/);
    if (legacy) { location.replace("#/c/" + legacy[1]); return; }
    const m = hash.match(/^#\/c\/(.+)$/);
    document.body.classList.remove("toc-open");
    if (m) {
      renderChapter(decodeURIComponent(m[1]));
    } else {
      renderToken++;
      renderHome();
      renderToc(null);
      if (hash === "#/playground") window.Playground.open();
    }
  }

  if (location.protocol === "file:") {
    document.getElementById("file-warning").hidden = false;
  }

  document.getElementById("reset-progress").addEventListener("click", () => {
    if (confirm("Clear all saved progress, exercise code, and playground code?")) {
      writeStore(PROGRESS_KEY, {});
      writeStore(EXERCISE_KEY, {});
      try { localStorage.removeItem("js-qa-book-playground-v1"); } catch { /* ignore */ }
      route();
    }
  });
  document.getElementById("toc-toggle").addEventListener("click", () => document.body.classList.toggle("toc-open"));

  window.Playground.init();
  window.addEventListener("hashchange", route);
  route();
})();
