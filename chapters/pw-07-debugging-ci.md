Tests fail. What matters is how fast you can find out **why**: is it a real bug, a broken locator, or a timing problem? This chapter covers reading Playwright's error messages, the tools that let you see what happened (UI mode, the Inspector, traces, screenshots, and videos), what makes tests flaky, and how tests run in CI.

**In this chapter you will learn:**

- how to read the two most common failure messages
- debugging with UI mode, `--debug`, and `page.pause()`
- recording and opening **traces**
- capturing screenshots and video on failure
- seeing the browser's console output in your test
- common causes of flaky tests, and how to fix them
- how CI runs Playwright, shown **read-only**: this book's repository doesn't run any CI

The failure output below is real. It was produced with Playwright 1.65.0 by two deliberately broken tests against the practice project.

## 19.1 Reading a failure

### A locator that finds nothing

```text
TimeoutError: locator.click: Timeout 3000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Log in' })

  3 | test("button that does not exist", async ({ page }) => {
  4 |   await page.goto("/practice/login.html");
> 5 |   await page.getByRole("button", { name: "Log in" }).click();
    |                                                      ^
```

Read it in this order:

1. **What failed:** `locator.click` timed out. (This test set `actionTimeout: 3000`. Without it, the click waits until the 30-second test timeout.)
2. **The call log:** Playwright was `waiting for getByRole('button', { name: 'Log in' })`, and never found it. The button is actually called **Sign in**.
3. **Where:** the code frame with `>` marks the line.

A click that times out usually means the locator matches nothing, or the element never becomes actionable (hidden, disabled, covered). The call log tells you which.

### An assertion that never matched

```text
Error: expect(locator).toHaveText(expected) failed

Locator:  getByRole('heading')
Expected: "Welcome"
Received: "Sign in"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" getByRole('heading') with timeout 5000ms
  - waiting for getByRole('heading')
    14 × locator resolved to <h1>Sign in</h1>
       - unexpected value "Sign in"
```

**Expected** and **Received** show the difference. The call log shows Playwright checked **14 times** over 5 seconds, and the element was there each time with the wrong text. So the locator is fine, and either the test's expectation or the application is wrong. This is where you decide whether you've found a bug.

## 19.2 Seeing what happened

| Tool | Command | Best for |
|---|---|---|
| **UI mode** | `npx playwright test --ui` | running and re-running tests while you write them, with a timeline, DOM snapshots, and a locator picker |
| **Inspector** | `npx playwright test --debug` | stepping through a test one action at a time |
| **`page.pause()`** | add `await page.pause();` to a test, run with `--headed` | stopping at one exact point to look around |
| **Trace Viewer** | `npx playwright show-trace path/to/trace.zip` | investigating a failure after the fact, especially from CI |
| **HTML report** | `npx playwright show-report` | an overview of the run, with errors, screenshots, videos, and traces attached |

The Playwright CLI docs describe `--debug` as a shortcut for running *"with Playwright Inspector"*, with no timeout, stopping after the first failure, headed, and with one worker.

Remove `page.pause()` before committing. It stops the run and waits, which would hang a CI job.

## 19.3 Traces

A **trace** records everything about a test: each action, a DOM snapshot before and after it, screenshots, network requests, console messages, and the source line. It's the most useful artefact for a failure you can't reproduce on your own machine.

Turn it on with the `trace` option in the config (or with `test.use` for one file):

| Common values | Records a trace… |
|---|---|
| `"off"` | never |
| `"on"` | for every test (slow; use while debugging) |
| `"retain-on-failure"` | for every test, but keeps it only if the test failed |
| `"on-first-retry"` | only when a failed test is retried. This is what `npm init playwright` sets up, and the practice config uses it. |

With the failing tests above, Playwright saved the trace next to the other results and printed how to open it:

```text
attachment #4: trace (application/zip)
test-results/zz-fail-button-that-does-not-exist-chromium/trace.zip
Usage:
    npx playwright show-trace test-results/zz-fail-button-that-does-not-exist-chromium/trace.zip
```

You can also open a trace by dragging the `.zip` onto [trace.playwright.dev](https://trace.playwright.dev). Traces can contain everything the page showed and sent, including personal data and tokens, so share them with the same care as the application's data.

## 19.4 Screenshots, video, and the browser console

```ts
// In playwright.config.ts → use, or with test.use(...) in one file:
use: {
  screenshot: "only-on-failure",
  video: "retain-on-failure",
  trace: "retain-on-failure",
}
```

With these settings, each failed test above got a `test-failed-1.png` screenshot, a `video.webm`, and a `trace.zip` in its `test-results` folder. They're also attached to the HTML report. Playwright also wrote an `error-context.md` file for each failure.

You can take a screenshot yourself at any point: `await page.screenshot({ path: "debug.png", fullPage: true })`.

### Messages from the page

Errors in the page's JavaScript often explain a UI failure. Forward the page's console to the test output:

```ts
page.on("console", (msg) => console.log(`[browser ${msg.type()}] ${msg.text()}`));
page.on("pageerror", (error) => console.log(`[page error] ${error.message}`));
```

In the run above, a `console.warn("hello from the page")` inside the page appeared in the terminal as:

```text
[browser warning] hello from the page
```

## 19.5 Flaky tests

A **flaky** test sometimes passes and sometimes fails with no change to the code. Common causes, and their fixes:

| Cause | Fix |
|---|---|
| Fixed waits (`waitForTimeout`) | wait for a real signal: an assertion, a URL, a response (Chapter 15) |
| Reading a value, then checking it once | use a retrying assertion: `await expect(locator).toHaveText(...)` |
| A missing `await` | lint with `@typescript-eslint/no-floating-promises` (Chapter 10) |
| Tests that share data or depend on order | create unique data per test, and clean up in fixtures (Chapters 17–18) |
| Locators that match several elements, or depend on position | make the locator unique (Chapter 14) |
| An unstable backend | mock the parts that aren't under test (Chapter 18) |

Two commands help you find flakiness before your colleagues do:

```bash
npx playwright test tests/checkout.spec.ts --repeat-each=10   # run each test 10 times
npx playwright test --retries=2                                # see which tests only pass on retry
```

Playwright reports a test that failed and then passed on retry as **flaky**. Treat that as a bug to investigate, not a pass. Retries hide problems if nobody looks at them.

## 19.6 Running in CI

**CI** (continuous integration) runs your tests automatically, for example on every push or pull request. Playwright's docs include setup guides for many CI systems.

> **This book's repository has no CI and runs nothing on GitHub.** Nothing in this chapter is added to the repository. The workflow below is shown for reading only, so you know what `npm init playwright` creates if you answer "yes" to the GitHub Actions question.

If you do add CI later: GitHub's billing docs say standard GitHub-hosted runners are free in **public** repositories. **Private** repositories use a monthly included amount, and when it runs out, usage is blocked unless you've added a payment method (Chapter 13).

### The workflow from the Playwright docs (read-only)

```yaml title=".github/workflows/playwright.yml (example only, not in this repository)"
name: Playwright Tests
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: lts/*
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    - name: Run Playwright tests
      run: npx playwright test
    - uses: actions/upload-artifact@v5
      if: ${{ !cancelled() }}
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

Step by step:

1. **`on`**: run on pushes and pull requests to `main` or `master`.
2. **`runs-on: ubuntu-latest`**: use a Linux machine provided by GitHub.
3. **checkout** and **setup-node**: get the code, and install the latest LTS version of Node.js.
4. **`npm ci`**: install exactly the versions in `package-lock.json`.
5. **`npx playwright install --with-deps`**: download the browsers and the system libraries they need.
6. **`npx playwright test`**: run the tests. Most CI systems set the `CI` environment variable, which turns on `forbidOnly` and `retries` in the config (Chapter 13).
7. **upload-artifact**: save the HTML report, with its traces and screenshots, for 30 days, so you can download it and open it with `npx playwright show-report`. `if: ${{ !cancelled() }}` makes it run even when tests failed, which is exactly when you need the report.

### A type check in CI

Playwright doesn't check types (Chapter 12). The Playwright TypeScript docs suggest running the compiler as its own CI step, before the tests:

```yaml
- name: Run type checks
  run: npx tsc -p tsconfig.json --noEmit
```

### Faster CI: sharding

Large suites can be split across several machines with `--shard`: `npx playwright test --shard=1/4` runs the first quarter of the tests. The Playwright *Sharding* guide shows how to merge the reports afterwards.

## Try it

1. In the practice project, change one expected text in `tests/actions.spec.ts` so the test fails, run it with `--trace on`, and open the trace with `npx playwright show-trace`. Find the action where it failed, and look at the DOM snapshot.
2. Run `npx playwright test --ui`, pick a test, and use the locator picker to find a locator for the **Sort by** dropdown.
3. Run `npx playwright test --repeat-each=5`. Do all tests pass every time?

<details>
<summary>Show hints</summary>

- `--trace on` overrides the config's trace setting for that run. The trace file's path is printed with the failure.
- In UI mode, use the "Pick locator" button, then click the dropdown in the snapshot. Compare its suggestion with the options in Chapter 14.
- The practice suite is designed to pass with `--repeat-each`, because every test that creates data uses unique values and cleans up.

</details>

## Quiz

```quiz
[
  {
    "q": "A failure shows `Expected: \"Welcome\"`, `Received: \"Sign in\"`, and `14 × locator resolved to <h1>Sign in</h1>`. What does that tell you?",
    "options": [
      "The locator found nothing",
      "The locator found the element every time, but its text was different from what the test expected",
      "Playwright crashed",
      "The test timed out before starting"
    ],
    "answer": 1,
    "why": "The element was found repeatedly with the wrong text, so check the expectation or the application, not the locator."
  },
  {
    "q": "Which trace setting records only when a failed test is retried?",
    "options": ["`\"on\"`", "`\"off\"`", "`\"on-first-retry\"`", "`\"always\"`"],
    "answer": 2,
    "why": "`on-first-retry` keeps CI fast, but still gives you a trace for failures. `retain-on-failure` records every test and keeps only failures."
  },
  {
    "q": "A test failed, then passed on retry. How should you treat it?",
    "options": [
      "It passed, so ignore it",
      "As flaky: investigate the cause, because retries are hiding a problem",
      "Delete the test",
      "Increase the timeout to 10 minutes"
    ],
    "answer": 1,
    "why": "Playwright reports it as flaky. Find the timing or data problem instead of relying on retries."
  },
  {
    "q": "Why should `await page.pause()` never be committed?",
    "options": [
      "It's slow",
      "It stops the test and waits for you, which would hang a CI run",
      "It only works in Firefox",
      "It deletes traces"
    ],
    "answer": 1,
    "why": "`page.pause()` is for interactive debugging."
  },
  {
    "q": "In the example workflow, why does the upload step use `if: ${{ !cancelled() }}`?",
    "options": [
      "So it only runs when tests pass",
      "So the report is uploaded even when tests fail, which is when you need it",
      "To skip it on pull requests",
      "To cancel the job"
    ],
    "answer": 1,
    "why": "Without it, a failed test step would skip the upload, and you'd lose the report and traces."
  }
]
```

## Sources

The failure messages, attachments, and console output were produced by running deliberately failing tests with Playwright Test 1.65.0. The GitHub Actions workflow is quoted from the Playwright docs and was **not** added to this repository.

- Playwright, *Debugging tests* (UI mode, Inspector, `--debug`, `page.pause`): [playwright.dev/docs/debug](https://playwright.dev/docs/debug)
- Playwright, *Trace viewer* (trace options, `show-trace`, trace.playwright.dev): [playwright.dev/docs/trace-viewer](https://playwright.dev/docs/trace-viewer)
- Playwright, *Test use options* (`screenshot`, `video`, `trace`): [playwright.dev/docs/test-use-options](https://playwright.dev/docs/test-use-options)
- Playwright, *Command line* (`--debug`, `--repeat-each`, `--retries`, `--shard`): [playwright.dev/docs/test-cli](https://playwright.dev/docs/test-cli)
- Playwright, *Retries* (flaky tests): [playwright.dev/docs/test-retries](https://playwright.dev/docs/test-retries)
- Playwright, *Setting up CI* (the GitHub Actions workflow): [playwright.dev/docs/ci-intro](https://playwright.dev/docs/ci-intro)
- Playwright, *Sharding*: [playwright.dev/docs/test-sharding](https://playwright.dev/docs/test-sharding)
- Playwright, *TypeScript* (run `tsc --noEmit` in CI): [playwright.dev/docs/test-typescript](https://playwright.dev/docs/test-typescript)
- GitHub, *GitHub Actions billing*: [docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions)
