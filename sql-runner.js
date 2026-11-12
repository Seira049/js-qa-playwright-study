/**
 * sql-runner.js — runs SQL in a Web Worker using sql.js (SQLite compiled to WebAssembly).
 *
 * The page sends { sql, schema }. Every run starts from a fresh in-memory database
 * built from `schema`, so nothing carries over between runs. Results are posted back
 * as text tables. The page stops this worker after a time limit.
 *
 * formatTable is also used by the book's verification scripts (via module.exports).
 */
"use strict";

const SQLJS_VERSION = "1.16.0";
const SQLJS = `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist`;

function cellText(v) {
  if (v === null || v === undefined) return "NULL";
  if (v instanceof Uint8Array) return `<blob ${v.length} bytes>`;
  return String(v);
}

/** Formats columns + rows as a box table, like `sqlite3 -box`. */
function formatTable(columns, rows) {
  const body = rows.map((r) => r.map(cellText));
  const widths = columns.map((c, i) => Math.max(String(c).length, ...body.map((r) => r[i].length)) + 2);
  const line = (l, m, r) => l + widths.map((w) => "─".repeat(w)).join(m) + r;
  const row = (cells) => "│" + cells.map((c, i) => " " + String(c).padEnd(widths[i] - 2) + " ").join("│") + "│";
  return [line("┌", "┬", "┐"), row(columns), line("├", "┼", "┤"), ...body.map(row), line("└", "┴", "┘")].join("\n");
}

/**
 * Runs each statement; returns [{ type: "table"|"changed"|"empty", text }].
 * onResult (optional) receives each result as soon as it's ready, so results of
 * earlier statements are still shown if a later statement fails.
 */
function runStatements(db, sql, onResult) {
  const out = [];
  const push = (r) => { out.push(r); if (onResult) onResult(r); };
  for (const stmt of db.iterateStatements(sql)) {
    const columns = stmt.getColumnNames();
    const rows = [];
    while (stmt.step()) rows.push(stmt.get());
    const text = stmt.getSQL().trim().replace(/;$/, "");
    if (columns.length) {
      push(rows.length
        ? { type: "table", text: formatTable(columns, rows) + `\n(${rows.length} row${rows.length === 1 ? "" : "s"})` }
        : { type: "empty", text: `${formatTable(columns, [])}\n(0 rows)` });
    } else if (/^(insert|update|delete|replace)\b/i.test(text)) {
      const n = db.getRowsModified();
      push({ type: "changed", text: `${n} row${n === 1 ? "" : "s"} changed` });
    }
  }
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatTable, runStatements };
} else {
  let SQL = null;
  self.onmessage = async (e) => {
    const { sql, schema } = e.data;
    try {
      if (!SQL) {
        importScripts(`${SQLJS}/sql-wasm.js`);
        SQL = await self.initSqlJs({ locateFile: (file) => `${SQLJS}/${file}` });
      }
      const db = new SQL.Database();
      if (schema) db.exec(schema);
      try {
        const results = runStatements(db, sql, (r) => self.postMessage({ ...r, kind: r.type, type: "result" }));
        if (!results.length) self.postMessage({ type: "result", kind: "none", text: "Done. No rows returned." });
      } finally {
        db.close();
      }
    } catch (err) {
      self.postMessage({ type: "error", text: String(err && err.message ? err.message : err) });
    }
    self.postMessage({ type: "done" });
  };
}
