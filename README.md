# JavaScript & TypeScript for QA — Interactive Book

An interactive book for QA engineers: learn **JavaScript and TypeScript** properly, then apply them with **Playwright**. Examples run in your browser, each chapter has an exercise that checks your answer and a short quiz, and there is a playground for writing and running your own code.

## Contents

- **Part 1 — JavaScript & TypeScript** (being rewritten one chapter at a time)
  1. How Your Code Runs ✓ reviewed
  2. Values, Variables, and Types
  3. Operators, Equality, and Truthiness
  4. Strings and Template Literals
  5. Arrays and Objects
  6. Functions
  7. Control Flow and Errors
  8. Modules: import and export
  9. Classes
  10. Asynchronous Code: Promises and async/await
  11. TypeScript: Types, Interfaces, and Narrowing
  12. TypeScript: Generics, Utility Types, and tsconfig
- **Part 2 — Playwright**: setup, locators, actions and assertions, fixtures and the Page Object Model
- **Part 3 — API Testing & Test Data**: the `request` fixture, mocking with `page.route`, HAR replay, seeding data
- **Part 4 — Debugging & CI**
- **Appendix (optional) — SQL for QA**: beginner, intermediate, advanced

**Reviewed** chapters are checked against MDN, the TypeScript Handbook, the Node.js docs, and playwright.dev, and every example is run. Each lists its sources. Sections marked **draft** come from the first version of this guide and haven't been re-checked yet.

## Run locally

The book must be served over HTTP (chapters and the code runner can't load from `file://`):

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

An internet connection is needed for the code editor (Monaco) and the Markdown parser, which load from a pinned CDN version.

## How the playground works

- Code runs in a Web Worker in your browser (not Node.js) and is stopped after 10 seconds.
- TypeScript is checked and converted by the TypeScript service built into Monaco. As with `node file.ts` and Playwright, code still runs when there are type errors; the errors are listed with the output.
- `console.log` output is formatted like Node.js's `util.inspect` for everyday values.

## Writing chapters

Reviewed chapters are Markdown files in `chapters/`, listed in `book.js`. Special code fences:

| Fence | Meaning |
|---|---|
| ` ```ts run ` / ` ```js run ` | Runnable example (▶ Run and Open in playground) |
| ` ```output ` | Expected output, shown under the previous example |
| ` ```exercise ts title="…" ` | Exercise starter code |
| ` ```checks ` | Hidden checks run after the learner's code. Use `__book.check(label, pass)`, `__book.logs` (printed lines), `__book.calls` (raw `console.log` arguments) |
| ` ```solution ` | Optional solution |
| ` ```quiz ` | JSON array of `{ q, code?, options, answer, why }` |

Draft modules still live in `curriculum.js` and are removed as each is rewritten.

## Project structure

```
js-qa-study-app/
├── index.html       # page shell: header, contents sidebar, playground drawer
├── styles.css       # dark theme
├── book.js          # table of contents (parts and chapters)
├── chapters/        # reviewed chapters (Markdown)
├── curriculum.js    # earlier draft modules (not yet reviewed)
├── app.js           # router, chapter rendering, quizzes, exercises, progress
├── playground.js    # Monaco editor, TypeScript checking, running code
├── runner.js        # Web Worker that runs code and formats console output
├── vercel.json
└── README.md
```

## License

MIT
