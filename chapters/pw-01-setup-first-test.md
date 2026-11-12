Part 1 taught the language. Part 2 puts it to work with **Playwright Test**, the test runner that drives real Chromium, Firefox, and WebKit browsers. This chapter gets you set up, explains what every line of a test does, and shows the commands you'll use every day.

**In this chapter you will:**

- install Playwright, and learn what the installer creates
- set up this book's practice project, so you can run every example
- read a test line by line
- run tests in different ways, and read the HTML report
- record a test with codegen

> **Playwright runs on your computer, not in this page.** It needs Node.js and real browsers, so the examples in Part 2 can't run in the playground. Every example here is part of the practice project and was run with **Playwright 1.65.0** before publishing.

## 13.1 Installing Playwright in a new project

Make an empty folder, open a terminal in it, and run:

```bash
npm init playwright@latest
```

The installer asks a few questions. The Playwright docs list them as:

- TypeScript or JavaScript (default: TypeScript)
- tests folder name (default: `tests`, or `e2e` if `tests` already exists)
- add a GitHub Actions workflow
- install Playwright browsers (default: yes)

> **About the GitHub Actions question:** answering yes adds a workflow file that runs your tests on GitHub every time you push. According to GitHub's billing docs, standard GitHub-hosted runners are **free in public repositories**. Private repositories get a monthly included amount, and if no payment method is on file, usage is blocked when it runs out rather than billed. If you don't want CI yet, answer **no**. You can add it later (Chapter 19).

It creates:

```text
playwright.config.ts      # configuration: browsers, timeouts, reporters, ...
package.json
package-lock.json
tests/
  example.spec.ts         # a minimal example test
```

Playwright supports Node.js **22.x, 24.x, or 26.x** (from the system requirements in the Playwright docs). Check yours with `node --version`.

## 13.2 This book's practice project

The book's repository includes a small practice website and a ready-made Playwright project, so you can run every example in Part 2 against the same pages.

```bash
git clone https://github.com/Seira049/js-qa-playwright-study.git
cd js-qa-playwright-study/practice
npm install
npx playwright install chromium
npx playwright test
```

The last command starts the practice server automatically (see `webServer` below) and runs the tests. The practice site has:

- `/practice/login.html`: a sign-in form. The valid login is `qa@test.io` / `correct-password`.
- `/practice/dashboard.html`: a product list with search, sorting, an "in stock" filter, a cart counter, and a confirmation dialog. The products come from `/practice/api/products.json`, which Chapter 18 mocks.
- `/api/...`: a small users API for Chapter 17.

You can also browse the site yourself: run `npm run serve` in the `practice` folder and open http://localhost:3000/practice/login.html.

## 13.3 The configuration file

Here is the practice project's `playwright.config.ts`:

```ts title="practice/playwright.config.ts"
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "node server.mjs",
    url: "http://localhost:3000/practice/login.html",
    reuseExistingServer: !process.env.CI,
  },
});
```

| Setting | What it does |
|---|---|
| `testDir` | where the test files are |
| `fullyParallel` | run tests in parallel, even tests in the same file |
| `forbidOnly` | fail the run if someone left a `test.only` in the code. On in CI. |
| `retries` | retry failed tests, here only on CI (`process.env.CI` is set by most CI systems) |
| `reporter` | how results are shown. `html` writes a report you can open in a browser. |
| `use.baseURL` | the start of every URL, so tests can write `page.goto("/practice/login.html")` |
| `use.trace` | record a trace (a step-by-step recording) when a test is retried. Chapter 19 covers it. |
| `projects` | named setups, usually one per browser. The `setup` project is used in Chapter 16. |
| `webServer` | start the app before the tests, and wait until `url` responds |

`!!process.env.CI` uses the `!!` from Chapter 3 to turn the environment variable into `true` or `false`.

## 13.4 Your first test, line by line

```ts title="practice/tests/first.spec.ts"
import { test, expect } from "@playwright/test";

test("login page has a heading", async ({ page }) => {
  await page.goto("/practice/login.html");
  await expect(page).toHaveTitle(/Sign in/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
```

| Code | Meaning (and where you learned it) |
|---|---|
| `import { test, expect } from "@playwright/test";` | named imports from a package (Chapter 8) |
| `test("…", async ({ page }) => { … })` | a test is a title plus an **async** function (Chapters 6 and 10) |
| `({ page })` | Playwright passes an object of **fixtures**, and the test destructures `page` (Chapter 5). Each test gets a fresh page in its own isolated browser context. |
| `await page.goto(…)` | navigate, and wait for the page to load. The path is added to `baseURL`. |
| `await expect(page).toHaveTitle(/Sign in/)` | assert the title matches a regular expression (Chapter 4) |
| `page.getByRole("heading", { name: "Sign in" })` | a **locator**: a way to find an element (Chapter 14) |
| `.toBeVisible()` | a **web-first assertion**: it keeps checking until the element is visible, or the assertion times out (5 seconds by default) |

Test files end in `.spec.ts` (or `.test.ts`). Playwright finds them inside `testDir`.

## 13.5 Running tests

| Command | What it does |
|---|---|
| `npx playwright test` | run every test, headless (no visible browser) |
| `npx playwright test tests/first.spec.ts` | run one file |
| `npx playwright test -g "heading"` | run tests whose title matches `heading` (`--grep`) |
| `npx playwright test --project=chromium` | run only one project |
| `npx playwright test --headed` | show the browser windows |
| `npx playwright test --ui` | open **UI mode**: pick tests, watch them run, step through each action |
| `npx playwright test --debug` | run with the Playwright Inspector, one step at a time |
| `npx playwright test --last-failed` | re-run only the tests that failed last time |
| `npx playwright show-report` | open the last HTML report |

When a run finishes, the terminal shows a summary like this (from the practice project):

```text
Running 9 tests using 5 workers
  ✓  2 [chromium] › tests/first.spec.ts:3:1 › login page has a heading (377ms)
  ...
  9 passed (3.2s)
```

Tests run in parallel in several *worker* processes. The default number of workers is half your CPU cores (the Playwright CLI docs list the default as "50%").

### Focusing and skipping

While you work on one test, `test.only(...)` runs only that test, and `test.skip(...)` skips one. Remove `test.only` before you commit: with `forbidOnly` on, CI will fail the run if one is left in.

## 13.6 Recording a test with codegen

Codegen opens a browser and writes test code as you click around:

```bash
npx playwright codegen http://localhost:3000/practice/login.html
```

(Start the practice server first with `npm run serve`.) Codegen picks good locators for you, which makes it a quick way to learn. Treat the result as a first draft: rename things, remove extra steps, and add the assertions that matter.

## Try it

> Run these in the `practice` folder. There's nothing to check in the playground. Use the solutions to compare.

1. Run only `first.spec.ts`, with the browser visible.
2. Open UI mode and run the "invalid login shows an error" test. Click through its steps.
3. Write a new test in `tests/my-first.spec.ts` that opens the login page and checks that the **Remember me** checkbox is **not** checked. (Hint: `page.getByLabel("Remember me")` and `toBeChecked`, with `.not`.)

<details>
<summary>Show solutions</summary>

```bash
# 1.
npx playwright test tests/first.spec.ts --headed
# 2.
npx playwright test --ui
```

```ts
// 3. tests/my-first.spec.ts
import { test, expect } from "@playwright/test";

test("remember me starts unchecked", async ({ page }) => {
  await page.goto("/practice/login.html");
  await expect(page.getByLabel("Remember me")).not.toBeChecked();
});
```

</details>

## Quiz

```quiz
[
  {
    "q": "Why is the test function written `async ({ page }) => { … }`?",
    "options": [
      "`async` makes the test faster",
      "Browser actions return promises that must be awaited, and `{ page }` destructures the page fixture Playwright passes in",
      "`page` is a global variable",
      "It's required by TypeScript only"
    ],
    "answer": 1,
    "why": "Playwright calls your function with an object of fixtures. Everything the browser does is asynchronous, so the function is `async` and uses `await`."
  },
  {
    "q": "What does `baseURL: \"http://localhost:3000\"` let you write?",
    "options": [
      "`page.goto(\"/practice/login.html\")`",
      "`page.goto()` with no argument",
      "Only absolute URLs",
      "Nothing; it's for reports"
    ],
    "answer": 0,
    "why": "Relative paths passed to `page.goto` are resolved against `baseURL`."
  },
  {
    "q": "Which command opens the interactive UI mode?",
    "options": ["`npx playwright test --headed`", "`npx playwright test --ui`", "`npx playwright show-report`", "`npx playwright codegen`"],
    "answer": 1,
    "why": "`--ui` opens UI mode. `--headed` only shows the browser windows."
  },
  {
    "q": "What does `forbidOnly: !!process.env.CI` protect against?",
    "options": [
      "Running tests in parallel",
      "A `test.only` accidentally committed, which would make CI run just one test",
      "Tests without assertions",
      "Using `only` as a variable name"
    ],
    "answer": 1,
    "why": "With `forbidOnly` on, a run that finds `test.only` fails, instead of silently skipping every other test."
  },
  {
    "q": "How long does a web-first assertion like `toBeVisible()` keep retrying by default?",
    "options": ["It doesn't retry", "1 second", "5 seconds", "30 seconds"],
    "answer": 2,
    "why": "The default assertion timeout is 5 seconds. The default timeout for a whole test is 30 seconds."
  }
]
```

## Sources

Every test and command shown was run with Playwright Test 1.65.0 and Node.js v24.18.0 against the practice project.

- Playwright, *Installation* (installer questions, created files, system requirements): [playwright.dev/docs/intro](https://playwright.dev/docs/intro)
- Playwright, *Writing tests*: [playwright.dev/docs/writing-tests](https://playwright.dev/docs/writing-tests)
- Playwright, *Running and debugging tests*: [playwright.dev/docs/running-tests](https://playwright.dev/docs/running-tests)
- Playwright, *Command line* (options and defaults): [playwright.dev/docs/test-cli](https://playwright.dev/docs/test-cli)
- Playwright, *Test configuration* (`baseURL`, `webServer`, `forbidOnly`, `fullyParallel`): [playwright.dev/docs/test-configuration](https://playwright.dev/docs/test-configuration)
- Playwright, *Timeouts* (test 30 s, assertion 5 s): [playwright.dev/docs/test-timeouts](https://playwright.dev/docs/test-timeouts)
- Playwright, *Test generator* (codegen): [playwright.dev/docs/codegen-intro](https://playwright.dev/docs/codegen-intro)
- GitHub, *About billing for GitHub Actions*: [docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions)
