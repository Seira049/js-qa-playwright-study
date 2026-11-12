# JavaScript & TypeScript for QA — Interactive Book

An interactive book for QA engineers: learn **JavaScript and TypeScript** properly, then apply them with **Playwright**. JavaScript, TypeScript, and SQL examples run in your browser, each chapter has an exercise that checks your answer and a quiz, and there is a playground for your own code.

Live site: https://js-qa-playwright-study.vercel.app/

## Contents

- **Part 1 — JavaScript & TypeScript** (Chapters 1–12): how code runs, values and types, operators, strings, arrays and objects, functions, control flow and errors, modules, classes, async code, TypeScript types and narrowing, generics/utility types/tsconfig
- **Part 2 — Playwright** (13–16): setup, locators, actions and assertions, hooks/page objects/fixtures/sign-in
- **Part 3 — API Testing & Test Data** (17–18)
- **Part 4 — Debugging & CI** (19). CI is explained read-only; this repository runs no CI.
- **Appendix (optional) — SQL for QA** (A–C), with runnable queries

Every chapter lists its sources. Facts were checked against MDN, the TypeScript Handbook, the Node.js docs, playwright.dev, and SQLite's docs. Examples were run with Node.js v24.18.0, TypeScript 7.0.2, Playwright 1.65.0, and SQLite 3.54.1.

## Run the book locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Or `node practice/server.mjs`, which also serves the practice site and API at http://localhost:3000. The editor (Monaco), Markdown parser, and SQL engine (sql.js) load from pinned CDN versions, so an internet connection is needed.

## Practice project (Playwright chapters)

See [practice/README.md](practice/README.md).

## Writing chapters

Chapters are Markdown files in `chapters/`, listed in `book.js`. Special code fences:

| Fence | Meaning |
|---|---|
| ` ```ts run ` / ` ```js run ` / ` ```sql run ` | Runnable example |
| ` ```output ` | Expected output, shown under the previous example |
| ` ```exercise ts title="…" ` | Exercise starter code (`js`, `ts`, or `sql`) |
| ` ```checks ` | JS/TS: hidden checks using `__book.test(label, fn)`, `__book.logs`, `__book.calls`, `__book.source`. SQL: the expected result table. |
| ` ```solution ` | Optional solution |
| ` ```quiz ` | JSON array of `{ q, code?, options, answer, why }` |

The SQL sample database is `chapters/sql/shop.sql`.

## Project structure

```
├── index.html        # page shell: header, contents sidebar, playground drawer
├── styles.css
├── book.js           # table of contents
├── chapters/         # the chapters (Markdown) and the SQL sample database
├── app.js            # router, chapter rendering, quizzes, exercises, progress
├── playground.js     # Monaco editor, TypeScript checking, running JS/TS/SQL
├── runner.js         # Web Worker that runs JS and formats console output like Node.js
├── sql-runner.js     # Web Worker that runs SQL with sql.js
├── practice/         # practice website + Playwright project
└── vercel.json
```

## License

MIT
