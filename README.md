# JavaScript & TypeScript for QA — Interactive Book

An interactive book for QA engineers: learn **JavaScript and TypeScript** properly, then apply them with **Playwright**. JavaScript, TypeScript, and SQL examples run in your browser, each chapter has an exercise that checks your answer and a quiz, and there is a playground for your own code.

Live site: https://js-qa-playwright-study.vercel.app/

PDF for reading on the go: [JS-and-TS-for-QA.pdf](JS-and-TS-for-QA.pdf) (examples show their output; solutions and quiz answers are in an answer key after each chapter).

## How the book works

- **One topic per page.** Each chapter is split into short topics with Back / Next. "📜 Whole chapter on one page" shows it all at once. The side menu lists every chapter's topics (expand/collapse), and can be hidden with « or Ctrl + \\.
- **🎯 Practices after topics**, plus exercises at the end of each chapter. They're checked automatically, have a 💡 hint, and earn ⚡ XP. XP moves you up eight ranks, from New Learner to QA Hero.
- **🏁 Three checkpoint projects:** a test-run report module (after Chapter 8), a typed order loader (after Chapter 16), and a Playwright smoke suite that must catch five deliberately broken copies of the practice shop (after Chapter 23, run with `npm run checkpoint` in `practice/`).
- Progress, answers, and XP are saved in your browser only.

## Contents

- **Part 1 — JavaScript & TypeScript** (Chapters 1–16): how code runs, values and types, operators, strings, arrays and objects, functions, control flow and errors, modules, classes, async code, TypeScript types and narrowing, generics/utility types/tsconfig, dates and Map/Set, Node.js for testers (environment, files, URLs), JavaScript in the browser (DOM, `page.evaluate`, `fetch`), and TypeScript in real projects
- **Part 2 — Playwright** (17–20): setup, locators, actions and assertions, hooks/page objects/fixtures/sign-in
- **Part 3 — API Testing & Test Data** (21–22)
- **Part 4 — Debugging & CI** (23). CI is explained read-only; this repository runs no CI.
- **Appendix (optional) — SQL for QA** (A–C), with runnable queries

Every chapter lists its sources. Facts were checked against MDN, the TypeScript Handbook, the Node.js docs, playwright.dev, and SQLite's docs. Examples were run with Node.js v24.18.0, TypeScript 7.0.2, Playwright 1.65.1, and SQLite 3.54.1.

## Run the book locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Or `node practice/server.mjs`, which also serves the practice site and API at http://localhost:3000. The editor (Monaco), Markdown parser, and SQL engine (sql.js) load from pinned CDN versions, so an internet connection is needed.

## Practice project (Playwright chapters)

See [practice/README.md](practice/README.md).

## Maintaining

See [MAINTAINING.txt](MAINTAINING.txt). Before every commit, run the checks:

```bash
cd tools && npm install && npm run check
```

The check also runs in Firefox and WebKit (`--browser=firefox`, `--browser=webkit`) and can verify every source link (`--links`). The book was last checked in all three browsers, on a phone-sized screen, and with all 158 source links.

## Writing chapters

Chapters are Markdown files in `chapters/`, listed in `book.js`. Special code fences:

| Fence | Meaning |
|---|---|
| ` ```ts run ` / ` ```js run ` / ` ```sql run ` | Runnable example |
| ` ```output ` | Expected output, shown under the previous example |
| ` ```practice ts title="…" ` | A short practice after a topic (10 XP by default; `xp=N` changes it) |
| ` ```exercise ts title="…" ` | Exercise starter code (`js`, `ts`, or `sql`; 20 XP by default) |
| ` ```hint ` | Optional hint for the practice/exercise above |
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
├── practice/         # practice website + Playwright project (npm run checkpoint)
├── tools/            # maintainer tools: npm run check, npm run pdf
├── JS-and-TS-for-QA.pdf
└── vercel.json
```

## License

MIT
