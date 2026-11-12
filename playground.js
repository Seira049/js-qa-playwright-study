/**
 * playground.js — code editor, TypeScript checking, and the code runner.
 *
 * - Editor: Monaco (the editor used by VS Code), loaded from a pinned CDN build.
 * - TypeScript: Monaco's built-in TypeScript service checks types and
 *   converts TS to JS. Like `node file.ts` and Playwright, code still runs
 *   when there are type errors; the errors are shown next to the output.
 * - Running: code runs in a Web Worker (runner.js) that is stopped after
 *   a time limit, so an infinite loop can't freeze the page.
 *
 * Exposes window.Playground.
 */
(function () {
  "use strict";

  const MONACO_VERSION = "0.57.0";
  const MONACO = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min`;
  // Worker files in this Monaco build (file names include a content hash).
  const MONACO_WORKERS = {
    typescript: "ts.worker-g3pjEjl4.js",
    javascript: "ts.worker-g3pjEjl4.js",
    default: "editor.worker-_vAIFJDs.js",
  };
  const TIME_LIMIT_MS = 10000;
  const STORE = "js-qa-book-playground-v1";

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

  // ---------------------------------------------------------------------------
  // Monaco loading
  // ---------------------------------------------------------------------------
  let monacoPromise = null;

  function loadMonaco() {
    if (monacoPromise) return monacoPromise;
    monacoPromise = new Promise((resolve, reject) => {
      window.MonacoEnvironment = {
        getWorker(_moduleId, label) {
          const file = MONACO_WORKERS[label] || MONACO_WORKERS.default;
          const src = `import "${MONACO}/vs/assets/${file}";`;
          const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
          return new Worker(url, { type: "module", name: label });
        },
      };
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = `${MONACO}/vs/editor/editor.main.css`;
      document.head.appendChild(css);

      const script = document.createElement("script");
      script.src = `${MONACO}/vs/loader.js`;
      script.onload = () => {
        window.require.config({ paths: { vs: `${MONACO}/vs` } });
        window.require(["vs/editor/editor.main"], () => {
          configureMonaco(window.monaco);
          resolve(window.monaco);
        }, reject);
      };
      script.onerror = () => reject(new Error("Could not load the code editor. Check your internet connection."));
      document.head.appendChild(script);
    });
    return monacoPromise;
  }

  function configureMonaco(monaco) {
    const ts = monaco.typescript;
    const base = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      strict: true,
      noEmitOnError: false,
      allowNonTsExtensions: true,
      // Treat every file as its own module, so variables in one example
      // never clash with another example or with browser globals like `name`.
      moduleDetection: 3, // ts.ModuleDetectionKind.Force
      // Code runs in a Web Worker, so there is no `document` or `window`.
      // (Monaco expects the lib file names here, not the tsconfig short names.)
      lib: ["lib.esnext.d.ts", "lib.webworker.d.ts"],
    };
    ts.typescriptDefaults.setCompilerOptions(base);
    ts.javascriptDefaults.setCompilerOptions({ ...base, allowJs: true, checkJs: false });
    // JavaScript files: report syntax errors only (no type checking).
    ts.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });
    ts.typescriptDefaults.setEagerModelSync(true);
    const bookTypes = "declare const __book: {\n  logs: string[];\n  calls: unknown[][];\n  errors: string[];\n  check(label: string, pass: boolean): void;\n};\n";
    ts.typescriptDefaults.addExtraLib(bookTypes, "file:///book-globals.d.ts");
    ts.javascriptDefaults.addExtraLib(bookTypes, "file:///book-globals.d.ts");
    monaco.editor.setTheme("vs-dark");
  }

  function editorOptions(extra) {
    return {
      theme: "vs-dark",
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      renderLineHighlight: "line",
      fixedOverflowWidgets: true,
      ...extra,
    };
  }

  // ---------------------------------------------------------------------------
  // TypeScript -> JavaScript, with type errors
  // ---------------------------------------------------------------------------
  let modelSeq = 0;

  function flattenMessage(m) {
    if (typeof m === "string") return m;
    let text = m.messageText;
    if (m.next) text += "\n  " + m.next.map(flattenMessage).join("\n  ");
    return text;
  }

  /**
   * Returns { js, problems: [{ line, message, code }] }.
   * JavaScript is run as-is (syntax errors are reported by the runtime, like Node.js).
   */
  async function compile(code, lang) {
    if (lang !== "ts") return { js: code, problems: [] };
    const monaco = await loadMonaco();
    const ext = lang === "ts" ? "ts" : "js";
    const uri = monaco.Uri.parse(`file:///__run-${++modelSeq}.${ext}`);
    const model = monaco.editor.createModel(code, lang === "ts" ? "typescript" : "javascript", uri);
    try {
      const getWorker = lang === "ts" ? monaco.typescript.getTypeScriptWorker : monaco.typescript.getJavaScriptWorker;
      const client = await (await getWorker())(uri);
      const file = uri.toString();
      const diagnostics = [...await client.getSyntacticDiagnostics(file)];
      if (lang === "ts") diagnostics.push(...await client.getSemanticDiagnostics(file));
      const problems = diagnostics
        .filter((d) => d.category === 1) // errors only
        .map((d) => ({
          line: d.start != null ? model.getPositionAt(d.start).lineNumber : null,
          message: flattenMessage(d.messageText),
          code: d.code,
        }));
      let js = code;
      if (lang === "ts") {
        const out = await client.getEmitOutput(file);
        const jsFile = out.outputFiles.find((f) => f.name.endsWith(".js"));
        js = jsFile ? jsFile.text : "";
      }
      return { js, problems };
    } finally {
      model.dispose();
    }
  }

  // ---------------------------------------------------------------------------
  // Running code in a worker
  // ---------------------------------------------------------------------------
  /**
   * Runs JavaScript. Returns { stop(), finished: Promise<"done"|"timeout"|"stopped"> }.
   * onEvent receives { type: "log"|"error"|"check", ... } messages.
   */
  function runJs(js, onEvent) {
    const worker = new Worker("runner.js");
    let settle;
    const finished = new Promise((r) => { settle = r; });
    let over = false;
    const end = (reason) => {
      if (over) return;
      over = true;
      clearTimeout(timer);
      worker.terminate();
      settle(reason);
    };
    const timer = setTimeout(() => end("timeout"), TIME_LIMIT_MS);
    worker.onmessage = (e) => {
      if (e.data.type === "done") end("done");
      else if (!over) onEvent(e.data);
    };
    worker.onerror = (e) => {
      e.preventDefault();
      onEvent({ type: "error", text: e.message || "The code could not run." });
      end("done");
    };
    worker.postMessage({ code: js });
    return { stop: () => end("stopped"), finished };
  }

  // ---------------------------------------------------------------------------
  // Output panel (shared by inline examples, exercises, and the playground)
  // ---------------------------------------------------------------------------
  function createOutput(el) {
    el.innerHTML = "";
    el.hidden = false;
    const add = (cls, html) => {
      const line = document.createElement("div");
      line.className = "out-line " + cls;
      line.innerHTML = html;
      el.appendChild(line);
      return line;
    };
    return {
      el,
      clear() { el.innerHTML = ""; },
      status(text) { return add("out-status", esc(text)); },
      log(text) { add("out-log", esc(text)); },
      warn(text) { add("out-warn", esc(text)); },
      error(text, line) { add("out-error", esc(text) + (line ? ` <span class="out-where">(line ${line})</span>` : "")); },
      problems(list) {
        if (!list.length) return;
        const box = document.createElement("div");
        box.className = "out-problems";
        box.innerHTML = `<div class="out-problems-head">TypeScript found ${list.length} problem${list.length > 1 ? "s" : ""}. The code still runs, the same way it would with <code>node file.ts</code>.</div>` +
          list.map((p) => `<div class="out-problem">${p.line ? `Line ${p.line}: ` : ""}${esc(p.message)} <span class="out-code">TS${p.code}</span></div>`).join("");
        el.appendChild(box);
      },
      check(label, pass) { add(pass ? "out-check pass" : "out-check fail", `${pass ? "✅" : "❌"} ${esc(label)}`); },
    };
  }

  /**
   * Compile (if TS) and run code, writing everything to `outputEl`.
   * Returns { stop, finished: Promise<{ reason, checks, problems, errors }> }.
   * `userLines` limits reported type errors to the learner's own code.
   */
  function execute(code, lang, outputEl, opts = {}) {
    const out = createOutput(outputEl);
    const statusLine = out.status(lang === "ts" ? "Checking types and running…" : "Running…");
    const result = { checks: [], problems: [], errors: 0, reason: "done" };
    let handle = null;
    let stopped = false;

    const finished = (async () => {
      let js = code;
      try {
        const compiled = await compile(code, lang);
        js = compiled.js;
        result.problems = opts.userLines
          ? compiled.problems.filter((p) => !p.line || p.line <= opts.userLines)
          : compiled.problems;
      } catch (err) {
        statusLine.remove();
        out.error(String(err.message || err));
        result.reason = "error";
        return result;
      }
      if (stopped) { statusLine.textContent = "Stopped."; result.reason = "stopped"; return result; }
      out.problems(result.problems);
      handle = runJs(js, (msg) => {
        if (msg.type === "log") {
          if (msg.level === "error") out.error(msg.text);
          else if (msg.level === "warn") out.warn(msg.text);
          else out.log(msg.text);
        } else if (msg.type === "error") {
          result.errors++;
          out.error(msg.text, lang === "js" ? msg.line : null);
        } else if (msg.type === "check") {
          result.checks.push(msg);
          out.check(msg.label, msg.pass);
        }
      });
      result.reason = await handle.finished;
      statusLine.remove();
      if (result.reason === "timeout") out.status(`Stopped after ${TIME_LIMIT_MS / 1000} seconds (time limit). Check for a loop that never ends.`);
      else if (result.reason === "stopped") out.status("Stopped.");
      else if (!outputEl.querySelector(".out-line:not(.out-status), .out-problems")) out.status("Finished. Nothing was printed.");
      return result;
    })();

    return {
      stop() { stopped = true; if (handle) handle.stop(); },
      finished,
    };
  }

  // ---------------------------------------------------------------------------
  // Playground drawer
  // ---------------------------------------------------------------------------
  const STARTERS = {
    js: "// Write JavaScript here, then press Run (Ctrl/Cmd + Enter).\nconsole.log(\"Hello, QA!\");\n",
    ts: "// Write TypeScript here, then press Run (Ctrl/Cmd + Enter).\nconst passed: number = 5;\nconsole.log(\"Passed:\", passed);\n",
  };

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
  }
  function saveState(s) {
    try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* storage disabled */ }
  }

  let pg = null; // { editor, models: {js, ts}, lang, run }

  async function ensurePlayground() {
    if (pg) return pg;
    const root = document.getElementById("playground");
    const host = root.querySelector(".pg-editor");
    host.innerHTML = '<div class="pg-loading">Loading the editor…</div>';
    let monaco;
    try {
      monaco = await loadMonaco();
    } catch (err) {
      host.innerHTML = `<div class="pg-loading">${esc(err.message)}</div>`;
      throw err;
    }
    host.innerHTML = "";
    const state = loadState();
    const models = {
      js: monaco.editor.createModel(state.js ?? STARTERS.js, "javascript", monaco.Uri.parse("file:///playground.js")),
      ts: monaco.editor.createModel(state.ts ?? STARTERS.ts, "typescript", monaco.Uri.parse("file:///playground.ts")),
    };
    const lang = state.lang === "js" ? "js" : "ts";
    const editor = monaco.editor.create(host, editorOptions({ model: models[lang] }));
    pg = { editor, models, lang, run: null };

    const persist = () => {
      const s = loadState();
      s.js = models.js.getValue();
      s.ts = models.ts.getValue();
      s.lang = pg.lang;
      saveState(s);
    };
    models.js.onDidChangeContent(persist);
    models.ts.onDidChangeContent(persist);

    root.querySelectorAll(".pg-lang button").forEach((b) => {
      b.classList.toggle("active", b.dataset.lang === lang);
      b.addEventListener("click", () => setLang(b.dataset.lang));
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runPlayground());
    return pg;
  }

  function setLang(lang) {
    if (!pg) return;
    pg.lang = lang;
    pg.editor.setModel(pg.models[lang]);
    document.querySelectorAll("#playground .pg-lang button").forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
    const s = loadState(); s.lang = lang; saveState(s);
  }

  async function runPlayground() {
    const p = await ensurePlayground();
    if (p.run) p.run.stop();
    const outputEl = document.querySelector("#playground .pg-output");
    const runBtn = document.querySelector("#playground [data-act=run]");
    const stopBtn = document.querySelector("#playground [data-act=stop]");
    runBtn.disabled = true;
    stopBtn.disabled = false;
    const run = execute(p.editor.getValue(), p.lang, outputEl);
    p.run = run;
    await run.finished;
    if (p.run === run) {
      p.run = null;
      runBtn.disabled = false;
      stopBtn.disabled = true;
    }
  }

  function openPlayground(code, lang) {
    document.body.classList.add("pg-open");
    document.getElementById("playground").setAttribute("aria-hidden", "false");
    return ensurePlayground().then((p) => {
      if (lang) setLang(lang);
      if (typeof code === "string") p.models[p.lang].setValue(code);
      p.editor.layout();
      p.editor.focus();
    }).catch(() => {});
  }

  function closePlayground() {
    document.body.classList.remove("pg-open");
    document.getElementById("playground").setAttribute("aria-hidden", "true");
  }

  function initPlayground() {
    const root = document.getElementById("playground");
    root.querySelector("[data-act=run]").addEventListener("click", runPlayground);
    root.querySelector("[data-act=stop]").addEventListener("click", () => { if (pg && pg.run) pg.run.stop(); });
    root.querySelector("[data-act=clear]").addEventListener("click", () => { root.querySelector(".pg-output").innerHTML = ""; });
    root.querySelector("[data-act=reset]").addEventListener("click", async () => {
      const p = await ensurePlayground();
      if (confirm("Replace the code in the editor with the starter example?")) p.models[p.lang].setValue(STARTERS[p.lang]);
    });
    root.querySelector("[data-act=close]").addEventListener("click", closePlayground);
    document.getElementById("pg-toggle").addEventListener("click", () => {
      if (document.body.classList.contains("pg-open")) closePlayground(); else openPlayground();
    });
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        if (document.body.classList.contains("pg-open")) closePlayground(); else openPlayground();
      } else if (e.key === "Escape" && document.body.classList.contains("pg-open") && !e.target.closest(".monaco-editor")) {
        closePlayground();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Syntax highlighting for read-only code blocks
  // ---------------------------------------------------------------------------
  const MONACO_LANG = { js: "javascript", ts: "typescript", javascript: "javascript", typescript: "typescript", bash: "shell", sh: "shell", shell: "shell", json: "json", sql: "sql", html: "html", css: "css" };

  async function highlight(root) {
    const blocks = root.querySelectorAll("pre code[data-lang]");
    if (!blocks.length) return;
    let monaco;
    try { monaco = await loadMonaco(); } catch { return; }
    for (const code of blocks) {
      const lang = MONACO_LANG[code.dataset.lang];
      if (!lang || code.dataset.highlighted) continue;
      try {
        const html = await monaco.editor.colorize(code.textContent, lang, { tabSize: 2 });
        code.innerHTML = html;
        code.dataset.highlighted = "1";
      } catch { /* keep plain text */ }
    }
  }

  // ---------------------------------------------------------------------------
  // Exercise editors
  // ---------------------------------------------------------------------------
  async function createEditor(host, code, lang, uriName) {
    const monaco = await loadMonaco();
    const uri = monaco.Uri.parse(`file:///${uriName}.${lang}`);
    const existing = monaco.editor.getModel(uri);
    if (existing) existing.dispose();
    const model = monaco.editor.createModel(code, lang === "ts" ? "typescript" : "javascript", uri);
    const lines = code.split("\n").length;
    host.style.height = Math.max(160, Math.min(460, lines * 20 + 24)) + "px";
    host.innerHTML = "";
    const editor = monaco.editor.create(host, editorOptions({ model }));
    return { editor, model, monaco };
  }

  window.Playground = {
    loadMonaco, compile, execute, open: openPlayground, close: closePlayground, init: initPlayground,
    highlight, createEditor, monacoVersion: MONACO_VERSION,
  };
})();
