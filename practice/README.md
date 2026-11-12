# Practice project for the Playwright chapters

A small practice website (sign-in page, product dashboard, users API) and a
Playwright Test project with every example from Chapters 13–19 and Appendix C.

```bash
cd practice
npm install
npx playwright install chromium
npx playwright test          # starts the practice server automatically
npx playwright show-report
npm run typecheck            # tsc --noEmit
npm run serve                # browse the site at http://localhost:3000/practice/login.html
```

- Valid login: `qa@test.io` / `correct-password`
- `tests/solutions/` holds the solutions to the chapters' "Try it" tasks.
- The API keeps data in memory; restarting the server resets it.
- Requires Node.js 22 or later. No CI is configured, and nothing runs on GitHub.
