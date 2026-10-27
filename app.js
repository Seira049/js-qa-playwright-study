/**
 * JS for QA — Playwright Automation study app.
 * Hash-router SPA, vanilla JS, no build step. Progress persisted in localStorage.
 */
(function () {
  "use strict";

  const data = window.CURRICULUM;
  const STORE_KEY = "js-qa-pw-progress-v1";
  const app = document.getElementById("app");

  // Flatten modules for lookup + stats.
  const allModules = [];
  data.phases.forEach((phase, pi) => {
    phase.modules.forEach((m) => allModules.push({ ...m, phaseName: phase.name, phaseIndex: pi }));
  });

  // ---- Progress store ----
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch { /* storage disabled */ }
  }
  function isDone(id) { return !!loadProgress()[id]; }
  function markDone(id, done) {
    const p = loadProgress();
    if (done) p[id] = true; else delete p[id];
    saveProgress(p);
  }
  function completedCount() { return allModules.filter((m) => isDone(m.id)).length; }

  // ---- Helpers ----
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  function totalLessons() { return allModules.reduce((n, m) => n + m.lessons.length, 0); }

  function renderBlock(b) {
    switch (b.type) {
      case "h": return `<h4>${esc(b.text)}</h4>`;
      case "code": return `<pre><code>${esc(b.text)}</code></pre>`;
      case "list": return `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
      case "p":
      default: return `<p>${esc(b.text)}</p>`;
    }
  }

  // ---- Views ----
  function renderHome() {
    const done = completedCount();
    const total = allModules.length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    const phasesHtml = data.phases.map((phase, pi) => {
      const cards = phase.modules.map((m) => {
        const complete = isDone(m.id);
        return `
          <button class="module-card" data-module="${esc(m.id)}">
            <div class="module-top">
              <h3>${esc(m.title)}</h3>
              <span class="badge ${complete ? "done" : ""}">${complete ? "Done" : esc(m.level)}</span>
            </div>
            <p class="summary">${esc(m.summary)}</p>
            <div class="module-meta">
              <span>${m.lessons.length} lessons</span>
              <span>${esc(m.duration)}</span>
              ${complete ? '<span class="check">✓ complete</span>' : ""}
            </div>
          </button>`;
      }).join("");
      return `
        <section class="phase">
          <span class="phase-label">Phase ${String(pi + 1).padStart(2, "0")}</span>
          <h2>${esc(phase.name)}</h2>
          <div class="module-grid">${cards}</div>
        </section>`;
    }).join("");

    app.innerHTML = `
      <section class="hero">
        <h1>${esc(data.title)}</h1>
        <p>${esc(data.subtitle)}</p>
        <div class="stats">
          <span><b>${data.phases.length}</b> phases</span>
          <span><b>${total}</b> modules</span>
          <span><b>${totalLessons()}</b> lessons</span>
          <span><b>${done}/${total}</b> modules complete</span>
        </div>
        <div class="overall-progress" aria-label="Overall progress ${pct}%">
          <span style="width:${pct}%"></span>
        </div>
      </section>
      ${phasesHtml}`;

    app.querySelectorAll(".module-card").forEach((card) => {
      card.addEventListener("click", () => { location.hash = "#/module/" + card.dataset.module; });
    });
  }

  function renderModule(id) {
    const m = allModules.find((x) => x.id === id);
    if (!m) { location.hash = "#/"; return; }

    const lessonsHtml = m.lessons.map((lesson) => `
      <article class="lesson">
        <h3>${esc(lesson.title)}</h3>
        ${lesson.body.map(renderBlock).join("")}
      </article>`).join("");

    const quizHtml = m.quiz && m.quiz.length ? `
      <section class="quiz">
        <h3>Knowledge check</h3>
        ${m.quiz.map((q, qi) => `
          <div class="quiz-q" data-correct="${q.correct}" data-qi="${qi}">
            <p>${qi + 1}. ${esc(q.question)}</p>
            ${q.options.map((opt, oi) => `
              <button class="quiz-opt" data-oi="${oi}">${esc(opt)}</button>`).join("")}
            <p class="quiz-exp" data-exp="${esc(q.explanation)}"></p>
          </div>`).join("")}
      </section>` : "";

    const complete = isDone(m.id);

    app.innerHTML = `
      <nav class="breadcrumb"><a id="to-home">← All modules</a> · ${esc(m.phaseName)}</nav>
      <header class="module-head">
        <span class="phase-label">${esc(m.level)}</span>
        <h1>${esc(m.title)}</h1>
        <p class="summary">${esc(m.summary)}</p>
        <div class="meta">
          <span>${m.lessons.length} lessons</span>
          <span>${esc(m.duration)}</span>
        </div>
      </header>
      ${lessonsHtml}
      ${quizHtml}
      <div class="complete-bar">
        <button class="btn" id="toggle-complete">${complete ? "Mark as not done" : "Mark module complete"}</button>
        <button class="btn secondary" id="back-btn">Back to modules</button>
        ${complete ? '<span class="complete-note">✓ You completed this module</span>' : ""}
      </div>`;

    window.scrollTo(0, 0);

    app.querySelector("#to-home").addEventListener("click", () => { location.hash = "#/"; });
    app.querySelector("#back-btn").addEventListener("click", () => { location.hash = "#/"; });
    app.querySelector("#toggle-complete").addEventListener("click", () => {
      markDone(m.id, !isDone(m.id));
      renderModule(id);
    });

    // Quiz interactions
    app.querySelectorAll(".quiz-q").forEach((qEl) => {
      const correct = Number(qEl.dataset.correct);
      const exp = qEl.querySelector(".quiz-exp");
      const btns = Array.from(qEl.querySelectorAll(".quiz-opt"));
      btns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const chosen = Number(btn.dataset.oi);
          btns.forEach((b, i) => {
            b.disabled = true;
            if (i === correct) b.classList.add("correct");
          });
          if (chosen === correct) {
            exp.textContent = "Correct. " + exp.dataset.exp;
            exp.className = "quiz-exp ok";
          } else {
            btn.classList.add("wrong");
            exp.textContent = "Not quite. " + exp.dataset.exp;
            exp.className = "quiz-exp no";
          }
        });
      });
    });
  }

  // ---- Router ----
  function route() {
    const hash = location.hash || "#/";
    const moduleMatch = hash.match(/^#\/module\/(.+)$/);
    if (moduleMatch) renderModule(decodeURIComponent(moduleMatch[1]));
    else renderHome();
  }

  // ---- Init ----
  document.getElementById("reset-progress").addEventListener("click", () => {
    if (confirm("Clear all saved progress?")) {
      saveProgress({});
      route();
    }
  });
  document.getElementById("brand").addEventListener("click", (e) => {
    e.preventDefault();
    location.hash = "#/";
  });

  window.addEventListener("hashchange", route);
  route();
})();
