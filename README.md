# JS for QA — Playwright Automation

A self-paced study app for QA engineers learning test automation with **JavaScript and Playwright**. Modeled on a phases → modules → lessons curriculum, with a knowledge check per module and progress saved in your browser.

## Curriculum

1. **JavaScript Foundations** — the JS you actually use in test code
2. **Async JavaScript** — promises & async/await (the backbone of Playwright)
3. **Getting Started with Playwright** — setup and your first test
4. **Locators & Selectors** — resilient, user-facing locators
5. **Actions & Assertions** — web-first assertions and auto-waiting
6. **Test Organization** — fixtures, hooks, Page Object Model
7. **API Testing** — Playwright's `request` fixture
8. **Debugging & CI** — traces, the inspector, and running in CI

## Run locally

It is a static site — open it directly:

```bash
open index.html
```

Or serve it:

```bash
python3 -m http.server 8000   # http://localhost:8000
```

## Deploy

This repo is set up for **Vercel** (static, zero config beyond `vercel.json`). Connect the repo in Vercel or run:

```bash
vercel          # preview
vercel --prod   # production
```

## Add content

Edit `curriculum.js`. Each module has `lessons` (content blocks) and a `quiz`. New phases/modules render automatically.

## Project structure

```
js-qa-study-app/
├── index.html       # shell + header/footer
├── styles.css       # dark theme
├── curriculum.js    # all study content (edit this)
├── app.js           # SPA router, rendering, progress tracking
├── vercel.json      # Vercel static config
└── README.md
```

## License

MIT
