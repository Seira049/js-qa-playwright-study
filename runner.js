/**
 * runner.js — runs learner code inside a Web Worker.
 *
 * The page sends { code } (plain JavaScript; TypeScript is already converted).
 * The code is loaded as a JavaScript module, so top-level await works.
 * console output is formatted to look like Node.js (a subset of util.inspect)
 * and posted back to the page. The page can stop this worker at any time,
 * which is how infinite loops are handled.
 */
"use strict";

(function () {
  const post = (msg) => self.postMessage(msg);

  // ---------------------------------------------------------------------------
  // Node-style formatting (ported subset of Node's lib/internal/util/inspect.js)
  // Defaults match Node: depth 2, breakLength 80, compact 3.
  // ---------------------------------------------------------------------------
  const keyStrRegExp = /^[a-zA-Z_][a-zA-Z_0-9]*$/;
  const META = {
    "\b": "\\b", "\t": "\\t", "\n": "\\n", "\v": "\\x0B", "\f": "\\f", "\r": "\\r", "\\": "\\\\",
  };

  function strEscape(str) {
    let quote = "'";
    if (str.includes("'")) {
      if (!str.includes('"')) quote = '"';
      else if (!str.includes("`") && !str.includes("${")) quote = "`";
    }
    let out = "";
    for (const ch of str) {
      const c = ch.charCodeAt(0);
      if (ch === quote) out += "\\" + ch;
      else if (META[ch]) out += META[ch];
      else if (c < 32 || (c > 126 && c < 160)) out += "\\x" + c.toString(16).toUpperCase().padStart(2, "0");
      else out += ch;
    }
    return quote + out + quote;
  }

  function formatPrimitive(value) {
    switch (typeof value) {
      case "string": return strEscape(value);
      case "number": return Object.is(value, -0) ? "-0" : String(value);
      case "bigint": return `${value}n`;
      case "symbol": return value.toString();
      default: return String(value); // boolean, undefined
    }
  }

  function functionBase(fn) {
    const src = Function.prototype.toString.call(fn);
    if (src.startsWith("class") && src.endsWith("}")) {
      return fn.name ? `[class ${fn.name}]` : "[class (anonymous)]";
    }
    let type = "Function";
    const ctor = Object.getPrototypeOf(fn)?.constructor?.name;
    if (ctor === "AsyncFunction") type = "AsyncFunction";
    else if (ctor === "GeneratorFunction") type = "GeneratorFunction";
    else if (ctor === "AsyncGeneratorFunction") type = "AsyncGeneratorFunction";
    return fn.name ? `[${type}: ${fn.name}]` : `[${type} (anonymous)]`;
  }

  function constructorName(value) {
    let proto = Object.getPrototypeOf(value);
    if (proto === null) return null;
    const desc = Object.getOwnPropertyDescriptor(proto, "constructor");
    if (desc && typeof desc.value === "function" && desc.value.name) return desc.value.name;
    return "";
  }

  function formatValue(ctx, value, recurseTimes) {
    if (value === null) return "null";
    if (typeof value !== "object" && typeof value !== "function") return formatPrimitive(value);

    if (ctx.seen.includes(value)) {
      let index = 1;
      if (ctx.circular === undefined) {
        ctx.circular = new Map([[value, index]]);
      } else if (ctx.circular.has(value)) {
        index = ctx.circular.get(value);
      } else {
        index = ctx.circular.size + 1;
        ctx.circular.set(value, index);
      }
      return `[Circular *${index}]`;
    }
    return formatRaw(ctx, value, recurseTimes);
  }

  function getKeys(value) {
    const keys = Object.keys(value);
    const symbols = Object.getOwnPropertySymbols(value)
      .filter((s) => Object.prototype.propertyIsEnumerable.call(value, s));
    return keys.concat(symbols);
  }

  function formatProperty(ctx, value, recurseTimes, key, isArrayItem) {
    const desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
    let str;
    if ("value" in desc || (desc.get === undefined && desc.set === undefined)) {
      ctx.indentationLvl += 2;
      str = formatValue(ctx, desc.value, recurseTimes);
      ctx.indentationLvl -= 2;
    } else if (desc.get !== undefined) {
      str = desc.set !== undefined ? "[Getter/Setter]" : "[Getter]";
    } else {
      str = "[Setter]";
    }
    if (isArrayItem) return str;
    let name;
    if (typeof key === "symbol") name = `[${key.toString()}]`;
    else if (keyStrRegExp.test(key)) name = key;
    else name = strEscape(key);
    return `${name}: ${str}`;
  }

  function formatRaw(ctx, value, recurseTimes) {
    let keys = [];
    let base = "";
    let braces;
    let isArrayType = false;
    let formatter = () => [];
    const ctor = constructorName(value);
    const prefixFor = (fallback, size) => {
      const name = ctor === null ? `[${fallback}: null prototype]` : ctor || fallback;
      return size !== undefined ? `${name}(${size}) ` : (name === fallback && fallback === "Object" ? "" : `${name} `);
    };

    if (typeof value === "function") {
      base = functionBase(value);
      keys = getKeys(value);
      if (keys.length === 0) return base;
      braces = ["{", "}"];
    } else if (Array.isArray(value)) {
      isArrayType = true;
      keys = getKeys(value).filter((k) => typeof k === "symbol" || !/^(0|[1-9][0-9]*)$/.test(k));
      const prefix = ctor === "Array" ? "" : `${prefixFor("Array", value.length)}`;
      braces = [`${prefix}[`, "]"];
      if (value.length === 0 && keys.length === 0) return `${braces[0]}]`;
      formatter = (c, v, r) => {
        const out = [];
        const max = Math.min(100, v.length);
        let holes = 0;
        for (let i = 0; i < max; i++) {
          if (!Object.prototype.hasOwnProperty.call(v, i)) { holes++; continue; }
          if (holes) { out.push(`<${holes} empty item${holes > 1 ? "s" : ""}>`); holes = 0; }
          out.push(formatProperty(c, v, r, i, true));
        }
        if (holes) out.push(`<${holes} empty item${holes > 1 ? "s" : ""}>`);
        if (v.length > max) {
          const rest = v.length - max;
          out.push(`... ${rest} more item${rest > 1 ? "s" : ""}`);
        }
        return out;
      };
    } else if (value instanceof Map) {
      keys = getKeys(value);
      braces = [`${prefixFor("Map", value.size)}{`, "}"];
      if (value.size === 0 && keys.length === 0) return `${braces[0]}}`;
      formatter = (c, v, r) => {
        const out = [];
        c.indentationLvl += 2;
        for (const [k, val] of v) out.push(`${formatValue(c, k, r)} => ${formatValue(c, val, r)}`);
        c.indentationLvl -= 2;
        return out;
      };
    } else if (value instanceof Set) {
      keys = getKeys(value);
      braces = [`${prefixFor("Set", value.size)}{`, "}"];
      if (value.size === 0 && keys.length === 0) return `${braces[0]}}`;
      formatter = (c, v, r) => {
        const out = [];
        c.indentationLvl += 2;
        for (const val of v) out.push(formatValue(c, val, r));
        c.indentationLvl -= 2;
        return out;
      };
    } else if (value instanceof Date) {
      base = Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
      keys = getKeys(value);
      if (keys.length === 0) return base;
      braces = ["{", "}"];
    } else if (value instanceof RegExp) {
      base = RegExp.prototype.toString.call(value);
      keys = getKeys(value).filter((k) => k !== "lastIndex");
      if (keys.length === 0) return base;
      braces = ["{", "}"];
    } else if (value instanceof Error) {
      // Node prints the full stack trace. Browser stack traces point at
      // internal playground URLs, so only the first line is shown here.
      base = `${value.name || "Error"}: ${value.message}`;
      if (!value.message) base = value.name || "Error";
      keys = getKeys(value);
      if (recurseTimes > 0 || ctx.indentationLvl > 0) base = `[${base}]`;
      if (keys.length === 0) return base;
      braces = ["{", "}"];
    } else if (value instanceof Promise) {
      braces = ["Promise {", "}"];
      keys = getKeys(value);
      formatter = () => ["<state not visible in the playground>"];
    } else {
      keys = getKeys(value);
      const prefix = prefixFor("Object");
      if (keys.length === 0) return `${prefix}{}`;
      braces = [`${prefix}{`, "}"];
    }

    if (recurseTimes > ctx.depth) {
      if (isArrayType) return "[Array]";
      const name = ctor === null ? "Object: null prototype" : ctor || "Object";
      return `[${name}]`;
    }

    recurseTimes += 1;
    ctx.seen.push(value);
    ctx.currentDepth = recurseTimes;
    const output = formatter(ctx, value, recurseTimes);
    for (const key of keys) output.push(formatProperty(ctx, value, recurseTimes, key, false));

    if (ctx.circular !== undefined) {
      const index = ctx.circular.get(value);
      if (index !== undefined) {
        const reference = `<ref *${index}>`;
        base = base === "" ? reference : `${reference} ${base}`;
      }
    }
    ctx.seen.pop();
    return reduceToSingleString(ctx, output, base, braces, isArrayType, recurseTimes, value);
  }

  function groupArrayElements(ctx, output, value) {
    let totalLength = 0;
    let maxLength = 0;
    let i = 0;
    let outputLength = output.length;
    if (value && value.length > 100) outputLength--; // ignore "... more items"
    const separatorSpace = 2;
    const dataLen = new Array(outputLength);
    for (; i < outputLength; i++) {
      const len = output[i].length;
      dataLen[i] = len;
      totalLength += len + separatorSpace;
      if (maxLength < len) maxLength = len;
    }
    const actualMax = maxLength + separatorSpace;
    if (actualMax * 3 + ctx.indentationLvl < ctx.breakLength &&
        (totalLength / actualMax > 5 || maxLength <= 6)) {
      const averageBias = Math.sqrt(actualMax - totalLength / output.length);
      const biasedMax = Math.max(actualMax - 3 - averageBias, 1);
      const columns = Math.min(
        Math.round(Math.sqrt(2.5 * biasedMax * outputLength) / biasedMax),
        Math.floor((ctx.breakLength - ctx.indentationLvl) / actualMax),
        ctx.compact * 4,
        15,
      );
      if (columns <= 1) return output;
      const tmp = [];
      const maxLineLength = [];
      for (let c = 0; c < columns; c++) {
        let lineMaxLength = 0;
        for (let j = c; j < output.length; j += columns) {
          if (dataLen[j] > lineMaxLength) lineMaxLength = dataLen[j];
        }
        maxLineLength.push(lineMaxLength + separatorSpace);
      }
      let padStart = true;
      if (value !== undefined) {
        for (let k = 0; k < output.length; k++) {
          if (typeof value[k] !== "number" && typeof value[k] !== "bigint") { padStart = false; break; }
        }
      }
      for (let r = 0; r < outputLength; r += columns) {
        const max = Math.min(r + columns, outputLength);
        let str = "";
        let j = r;
        for (; j < max - 1; j++) {
          const cell = `${output[j]}, `;
          str += padStart ? cell.padStart(maxLineLength[j - r], " ") : cell.padEnd(maxLineLength[j - r], " ");
        }
        if (padStart) {
          str += output[j].padStart(maxLineLength[j - r] - separatorSpace, " ");
        } else {
          str += output[j];
        }
        tmp.push(str);
      }
      if (outputLength < output.length) tmp.push(output[outputLength]);
      return tmp;
    }
    return output;
  }

  function isBelowBreakLength(ctx, output, start, base) {
    let totalLength = output.length + start;
    if (totalLength + output.length > ctx.breakLength) return false;
    for (let i = 0; i < output.length; i++) {
      totalLength += output[i].length;
      if (totalLength > ctx.breakLength) return false;
    }
    return base === "" || !base.includes("\n");
  }

  function reduceToSingleString(ctx, output, base, braces, isArrayType, recurseTimes, value) {
    const entries = output.length;
    if (isArrayType && entries > 6) output = groupArrayElements(ctx, output, value);
    if (ctx.currentDepth - recurseTimes < ctx.compact && entries === output.length) {
      const start = output.length + ctx.indentationLvl + braces[0].length + base.length + 10;
      if (isBelowBreakLength(ctx, output, start, base)) {
        const joined = output.join(", ");
        if (!joined.includes("\n")) {
          return `${base ? `${base} ` : ""}${braces[0]} ${joined} ${braces[1]}`;
        }
      }
    }
    const indentation = `\n${" ".repeat(ctx.indentationLvl)}`;
    return `${base ? `${base} ` : ""}${braces[0]}${indentation}  ${output.join(`,${indentation}  `)}${indentation}${braces[1]}`;
  }

  function inspect(value, opts) {
    const ctx = {
      seen: [], indentationLvl: 0, currentDepth: 0, circular: undefined,
      depth: 2, breakLength: 80, compact: 3, ...opts,
    };
    return formatValue(ctx, value, 0);
  }

  function format(args) {
    const first = args[0];
    let a = 0;
    let str = "";
    if (typeof first === "string") {
      if (args.length === 1) return first;
      let lastPos = 0;
      for (let i = 0; i < first.length - 1; i++) {
        if (first.charCodeAt(i) !== 37) continue; // '%'
        const next = first[++i];
        if (a + 1 === args.length) {
          // No arguments left: only "%%" is still collapsed to "%".
          if (next === "%") { str += first.slice(lastPos, i); lastPos = i + 1; }
          continue;
        }
        let temp;
        switch (next) {
          case "s": {
            const v = args[++a];
            temp = typeof v === "bigint" ? `${v}n` : (typeof v !== "object" || v === null) ? String(v) : inspect(v, { depth: 0 });
            break;
          }
          case "d": case "i": {
            const v = args[++a];
            if (typeof v === "bigint") temp = `${v}n`;
            else if (typeof v === "symbol") temp = "NaN";
            else temp = formatPrimitive(next === "i" ? parseInt(v) : Number(v));
            break;
          }
          case "f": {
            const v = args[++a];
            temp = typeof v === "symbol" ? "NaN" : formatPrimitive(parseFloat(v));
            break;
          }
          case "j": {
            try { temp = JSON.stringify(args[++a]); } catch { temp = "[Circular]"; }
            break;
          }
          case "o": temp = inspect(args[++a], { depth: 4 }); break;
          case "O": temp = inspect(args[++a]); break;
          case "c": a += 1; temp = ""; break;
          case "%": str += first.slice(lastPos, i); lastPos = i + 1; continue;
          default: continue;
        }
        if (lastPos !== i - 1) str += first.slice(lastPos, i - 1);
        str += temp;
        lastPos = i + 1;
      }
      if (lastPos !== 0) {
        a++;
        if (lastPos < first.length) str += first.slice(lastPos);
      }
    }
    while (a < args.length) {
      const v = args[a];
      str += (a === 0 ? "" : " ") + (typeof v === "string" ? v : inspect(v));
      a++;
    }
    return str;
  }

  // console.table, laid out like Node.js.
  function table(data) {
    if (data === null || typeof data !== "object") return format([data]);
    const rowKeys = data instanceof Map ? [...data.keys()] : Object.keys(data);
    const rows = data instanceof Map ? [...data.values()] : rowKeys.map((k) => data[k]);
    const cols = [];
    let hasValues = false;
    rows.forEach((row) => {
      if (row !== null && typeof row === "object") {
        Object.keys(row).forEach((k) => { if (!cols.includes(k)) cols.push(k); });
      } else {
        hasValues = true;
      }
    });
    const header = ["(index)", ...cols, ...(hasValues ? ["Values"] : [])];
    const cell = (v) => (v === undefined ? "" : inspect(v, { depth: 1, breakLength: Infinity }));
    const body = rows.map((row, i) => {
      const isObj = row !== null && typeof row === "object";
      const line = [data instanceof Map ? cell(rowKeys[i]) : String(rowKeys[i])];
      cols.forEach((c) => line.push(isObj && Object.prototype.hasOwnProperty.call(row, c) ? cell(row[c]) : ""));
      if (hasValues) line.push(isObj ? "" : cell(row));
      return line;
    });
    const widths = header.map((h, i) => Math.max(h.length, ...body.map((r) => r[i].length)) + 2);
    const line = (l, m, r) => l + widths.map((w) => "─".repeat(w)).join(m) + r;
    const row = (cells) => "│" + cells.map((c, i) => " " + c.padEnd(widths[i] - 2) + " ").join("│") + "│";
    return [line("┌", "┬", "┐"), row(header), line("├", "┼", "┤"), ...body.map(row), line("└", "┴", "┘")].join("\n");
  }

  // ---------------------------------------------------------------------------
  // console replacement + helpers used by exercise checks
  // ---------------------------------------------------------------------------
  const book = { logs: [], calls: [], errors: [] };
  let groupIndent = "";
  const counts = new Map();
  const timers = new Map();

  function emit(level, text) {
    const indented = groupIndent ? text.split("\n").map((l) => groupIndent + l).join("\n") : text;
    post({ type: "log", level, text: indented });
  }

  const fakeConsole = {
    log: (...args) => { book.calls.push(args); const t = format(args); book.logs.push(t); emit("log", t); },
    info: (...args) => { book.calls.push(args); const t = format(args); book.logs.push(t); emit("log", t); },
    debug: (...args) => { book.calls.push(args); const t = format(args); book.logs.push(t); emit("log", t); },
    error: (...args) => { const t = format(args); book.errors.push(t); emit("error", t); },
    warn: (...args) => { const t = format(args); book.errors.push(t); emit("warn", t); },
    table: (data) => { const t = table(data); book.logs.push(t); emit("log", t); },
    dir: (v) => { const t = inspect(v); book.logs.push(t); emit("log", t); },
    group: (...args) => { if (args.length) fakeConsole.log(...args); groupIndent += "  "; },
    groupEnd: () => { groupIndent = groupIndent.slice(2); },
    count: (label = "default") => { const n = (counts.get(label) || 0) + 1; counts.set(label, n); fakeConsole.log(`${label}: ${n}`); },
    countReset: (label = "default") => counts.delete(label),
    time: (label = "default") => timers.set(label, performance.now()),
    timeEnd: (label = "default") => {
      if (!timers.has(label)) return;
      fakeConsole.log(`${label}: ${(performance.now() - timers.get(label)).toFixed(3)}ms`);
      timers.delete(label);
    },
    assert: (cond, ...args) => { if (!cond) fakeConsole.error(args.length ? "Assertion failed: " + format(args) : "Assertion failed"); },
    trace: (...args) => fakeConsole.error("Trace: " + format(args)),
  };
  fakeConsole.groupCollapsed = fakeConsole.group;
  fakeConsole.timeLog = (label = "default", ...rest) => {
    if (!timers.has(label)) return;
    fakeConsole.log(`${label}: ${(performance.now() - timers.get(label)).toFixed(3)}ms`, ...rest);
  };

  Object.defineProperty(self, "console", { value: fakeConsole, configurable: true, writable: true });

  book.check = (label, pass) => post({ type: "check", label: String(label), pass: !!pass });
  // Like check(), but takes a function, so a missing variable counts as a failed
  // check instead of stopping the remaining checks.
  book.test = (label, fn) => {
    let pass = false;
    try { pass = !!fn(); } catch { pass = false; }
    book.check(label, pass);
  };
  book.source = ""; // the learner's own code (exercises only)
  book.inspect = inspect;
  self.__book = book;

  // Track pending timers so the page knows when the program has finished.
  const realSetTimeout = self.setTimeout.bind(self);
  const realClearTimeout = self.clearTimeout.bind(self);
  const realSetInterval = self.setInterval.bind(self);
  const realClearInterval = self.clearInterval.bind(self);
  const pending = new Set();
  let moduleDone = false;
  let finished = false;

  function maybeFinish() {
    if (!moduleDone || finished || pending.size !== 0) return;
    // Wait one more turn: promise callbacks that run after a timer can start
    // new timers (e.g. an async function awaiting several delays in a row).
    realSetTimeout(() => {
      if (pending.size === 0 && !finished) {
        finished = true;
        post({ type: "done" });
      }
    }, 0);
  }
  self.setTimeout = (fn, ms, ...args) => {
    const id = realSetTimeout(() => {
      pending.delete(id);
      try { typeof fn === "function" ? fn(...args) : null; }
      catch (err) { reportError(err); }
      maybeFinish();
    }, ms);
    pending.add(id);
    return id;
  };
  self.clearTimeout = (id) => { pending.delete(id); realClearTimeout(id); maybeFinish(); };
  self.setInterval = (fn, ms, ...args) => {
    const id = realSetInterval(() => {
      try { fn(...args); } catch (err) { reportError(err); }
    }, ms);
    pending.add(id);
    return id;
  };
  self.clearInterval = (id) => { pending.delete(id); realClearInterval(id); maybeFinish(); };

  function errorText(err) {
    if (err instanceof Error) return `${err.name}: ${err.message}`;
    return "Uncaught " + inspect(err);
  }

  function errorLine(err) {
    // Chrome/Edge: "at blob:...:LINE:COL", Firefox/Safari: "@blob:...:LINE:COL"
    const stack = err && typeof err.stack === "string" ? err.stack : "";
    const m = stack.match(/blob:[^\s)]*?:(\d+):(\d+)/);
    return m ? Number(m[1]) : null;
  }

  function reportError(err, prefix = "") {
    book.errors.push(errorText(err));
    post({ type: "error", text: prefix + errorText(err), line: errorLine(err) });
  }

  self.addEventListener("unhandledrejection", (e) => {
    e.preventDefault();
    reportError(e.reason, "Uncaught (in promise) ");
  });
  self.addEventListener("error", (e) => {
    e.preventDefault();
    reportError(e.error || new Error(e.message));
  });

  self.onmessage = async (e) => {
    const { code, source } = e.data;
    book.source = typeof source === "string" ? source : "";
    const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    try {
      await import(url);
    } catch (err) {
      reportError(err);
    } finally {
      URL.revokeObjectURL(url);
    }
    // Let already-resolved promise callbacks run before deciding we're done.
    realSetTimeout(() => { moduleDone = true; maybeFinish(); }, 0);
  };
})();
