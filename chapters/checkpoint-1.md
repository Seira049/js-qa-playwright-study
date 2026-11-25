Time to put Chapters 1 to 8 together. In this project you'll write the helper module that turns a list of test results into a short run report, the kind of summary a test runner prints at the end. You'll use variables, strings and template literals, arrays and objects, functions, control flow and errors, and `export`.

The book checks your module automatically with **ten checks**. They tell you which part isn't right yet, without giving away how to write it. Take your time: this is bigger than a practice.

## The brief

Your team's test runner produces results like this:

```js
const results = [
  { title: "login", status: "passed", durationMs: 850 },
  { title: "checkout", status: "failed", durationMs: 2300 },
  { title: "search", status: "passed", durationMs: 420 },
  { title: "export", status: "skipped", durationMs: 0 },
  { title: "profile", status: "failed", durationMs: 1250 },
];
```

Write and **export** these five functions:

| Function | Returns |
|---|---|
| `summarize(results)` | an object `{ total, passed, failed, skipped }` with the counts |
| `formatDuration(ms)` | `"850 ms"` under 1000 ms; otherwise seconds with one decimal, like `"2.3 s"` |
| `failedTitles(results)` | the titles of failed tests, sorted alphabetically |
| `slowest(results)` | the result with the largest `durationMs` (the first one if there's a tie), or `undefined` for an empty list |
| `buildReport(results)` | the report text below. It must **throw an `Error`** with the message `No results` when the list is empty. |

For the results above, `buildReport(results)` returns exactly these three lines:

```text
Run: 5 tests, 2 passed, 2 failed, 1 skipped
Slowest: checkout (2.3 s)
Failed: checkout, profile
```

When nothing failed, the last line is `Failed: none`.

> **Tips:** build `buildReport` out of the other four functions. Don't change the `results` array you're given: sort a copy (Chapter 5). The words "test" and "tests" don't change with the count here, to keep it simple.

## Build it

```exercise js title="Run report module" xp=100
// Checkpoint 1: export summarize, formatDuration, failedTitles, slowest, buildReport.

export function summarize(results) {
}

export function formatDuration(ms) {
}

export function failedTitles(results) {
}

export function slowest(results) {
}

export function buildReport(results) {
}

const results = [
  { title: "login", status: "passed", durationMs: 850 },
  { title: "checkout", status: "failed", durationMs: 2300 },
  { title: "search", status: "passed", durationMs: 420 },
  { title: "export", status: "skipped", durationMs: 0 },
  { title: "profile", status: "failed", durationMs: 1250 },
];
console.log(buildReport(results));
```

```checks
const __r = [
  { title: "login", status: "passed", durationMs: 850 },
  { title: "checkout", status: "failed", durationMs: 2300 },
  { title: "search", status: "passed", durationMs: 420 },
  { title: "export", status: "skipped", durationMs: 0 },
  { title: "profile", status: "failed", durationMs: 1250 },
];
const __copy = JSON.stringify(__r);
__book.test("summarize counts every status", () => JSON.stringify(summarize(__r)) === '{"total":5,"passed":2,"failed":2,"skipped":1}');
__book.test("summarize works for an empty list", () => { const s = summarize([]); return s.total === 0 && s.passed === 0 && s.failed === 0 && s.skipped === 0; });
__book.test("formatDuration under a second", () => formatDuration(850) === "850 ms" && formatDuration(0) === "0 ms" && formatDuration(999) === "999 ms");
__book.test("formatDuration in seconds, one decimal", () => formatDuration(2300) === "2.3 s" && formatDuration(1000) === "1.0 s" && formatDuration(1250) === "1.3 s");
__book.test("failedTitles is sorted", () => JSON.stringify(failedTitles(__r)) === '["checkout","profile"]' && JSON.stringify(failedTitles([{ title: "b", status: "failed", durationMs: 1 }, { title: "a", status: "failed", durationMs: 1 }])) === '["a","b"]');
__book.test("slowest finds the longest test", () => slowest(__r)?.title === "checkout" && slowest([]) === undefined);
__book.test("the report matches exactly", () => buildReport(__r) === "Run: 5 tests, 2 passed, 2 failed, 1 skipped\nSlowest: checkout (2.3 s)\nFailed: checkout, profile");
__book.test('"Failed: none" when nothing failed', () => buildReport([{ title: "a", status: "passed", durationMs: 10 }]) === "Run: 1 tests, 1 passed, 0 failed, 0 skipped\nSlowest: a (10 ms)\nFailed: none");
__book.test('an empty list throws Error("No results")', () => { try { buildReport([]); return false; } catch (e) { return e instanceof Error && e.message === "No results"; } });
__book.test("the results array isn't changed", () => { failedTitles(__r); slowest(__r); buildReport(__r); return JSON.stringify(__r) === __copy; });
```

```hint
- `summarize`: start from `{ total: results.length, passed: 0, failed: 0, skipped: 0 }` and add 1 to `counts[r.status]` in a `for...of` loop (Chapters 5 and 7).
- `formatDuration`: `ms < 1000 ? ... : ...` with `(ms / 1000).toFixed(1)` (Chapters 2 and 7).
- `failedTitles`: `filter`, then `map`, then `toSorted` with `localeCompare` (Chapters 4 and 5).
- `slowest`: `reduce`, keeping the result with the bigger duration; check for an empty list first.
- `buildReport`: `throw new Error("No results")` first, then a template literal with `\n` between lines (Chapters 4 and 7).
```

```solution
export function summarize(results) {
  const counts = { total: results.length, passed: 0, failed: 0, skipped: 0 };
  for (const r of results) counts[r.status]++;
  return counts;
}

export function formatDuration(ms) {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function failedTitles(results) {
  return results
    .filter((r) => r.status === "failed")
    .map((r) => r.title)
    .toSorted((a, b) => a.localeCompare(b));
}

export function slowest(results) {
  if (results.length === 0) return undefined;
  return results.reduce((best, r) => (r.durationMs > best.durationMs ? r : best));
}

export function buildReport(results) {
  if (results.length === 0) throw new Error("No results");
  const s = summarize(results);
  const slow = slowest(results);
  const failed = failedTitles(results);
  return [
    `Run: ${s.total} tests, ${s.passed} passed, ${s.failed} failed, ${s.skipped} skipped`,
    `Slowest: ${slow.title} (${formatDuration(slow.durationMs)})`,
    `Failed: ${failed.length ? failed.join(", ") : "none"}`,
  ].join("\n");
}

const results = [
  { title: "login", status: "passed", durationMs: 850 },
  { title: "checkout", status: "failed", durationMs: 2300 },
  { title: "search", status: "passed", durationMs: 420 },
  { title: "export", status: "skipped", durationMs: 0 },
  { title: "profile", status: "failed", durationMs: 1250 },
];
console.log(buildReport(results));
```

`(1250 / 1000).toFixed(1)` is `"1.3"`. Be careful with `toFixed` on other halves, though: `(1.005).toFixed(2)` gives `"1.00"`, not `"1.01"`, because `1.005` can't be stored exactly in binary and is really a tiny bit less (Chapter 2).

## What you practised

- template literals and `join` to build text (Chapter 4)
- `filter`, `map`, `reduce`, and copying before sorting (Chapter 5)
- small functions that each do one job (Chapter 6)
- `for...of`, early returns, and throwing an `Error` (Chapter 7)
- `export` (Chapter 8)
