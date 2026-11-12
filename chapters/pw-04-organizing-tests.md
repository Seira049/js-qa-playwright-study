A handful of tests can live in one file. A real suite needs structure: shared setup, reusable page objects, a way to sign in once instead of in every test, and labels to run subsets. This chapter covers Playwright's tools for each, built step by step in the practice project.

**In this chapter you will learn:**

- `test.describe` groups and the `beforeEach` / `afterEach` / `beforeAll` / `afterAll` hooks
- test isolation: why each test starts with a clean browser
- tags, `test.step`, and skipping tests
- the Page Object Model, using the classes from Chapter 9
- custom fixtures with `test.extend`
- signing in once with a setup project and `storageState`

All code here is in the practice project (`practice/pages/`, `practice/fixtures/`, `practice/tests/organize.spec.ts`, `practice/tests/auth.setup.ts`) and was run with Playwright 1.65.0.

## 16.1 Groups and hooks

`test.describe` groups related tests. Its title is added to each test's name in reports. **Hooks** run code around the tests in their group:

| Hook | Runs |
|---|---|
| `test.beforeEach` | before **each** test |
| `test.afterEach` | after **each** test, even if it failed |
| `test.beforeAll` | once, before the first test in the group (per worker process) |
| `test.afterAll` | once, after the last test in the group (per worker process) |

You saw `beforeEach` in `locators.spec.ts`: every test there signs in first.

```ts title="practice/tests/locators.spec.ts"
test.beforeEach(async ({ page }) => {
  await page.goto("/practice/login.html");
  await page.getByLabel("Email").fill("qa@test.io");
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
});
```

Be careful with `beforeAll`. It runs once per **worker**, and tests run in several workers in parallel, so "once" may really mean several times. It also can't use the `page` fixture, because each test gets its own page.

## 16.2 Test isolation

The Playwright docs explain that each test runs in a fresh **browser context**, *"equivalent to incognito-like profiles"*, with its own cookies, local storage, and session storage. Nothing one test does (signing in, adding to the cart) leaks into the next. That's what lets tests run in parallel and in any order.

The practice project shows it. The dashboard says "Not signed in" unless the browser's local storage has a signed-in user, and a test that didn't sign in sees exactly that:

```ts title="practice/tests/organize.spec.ts"
test.describe("isolation", () => {
  test("a fresh context is not signed in", async ({ dashboardPage, page }) => {
    await expect(page.getByText("Not signed in")).toBeVisible();
  });
});
```

The consequence: **a test must never depend on another test** having run first. If a test needs data or a signed-in user, it sets that up itself (or through a fixture, section 16.5).

## 16.3 Tags, steps, and skipping

### Tags

Add tags in the test's details object, then run a subset with `--grep`:

```ts
test("valid user reaches the dashboard", { tag: "@smoke" }, async ({ loginPage, page }) => {
  // ...
});
```

```bash
npx playwright test --grep @smoke
npx playwright test --grep-invert @slow   # everything except @slow
```

In the practice project, `--grep @smoke` runs 3 tests: the two tagged tests, plus the `setup` project that the `chromium` project depends on (section 16.6).

### Steps

`test.step` names a part of a test. Steps appear in the HTML report, UI mode, and traces, which makes long tests much easier to read when they fail:

```ts title="practice/tests/organize.spec.ts"
test("adding a product updates the cart", async ({ dashboardPage }) => {
  await test.step("add two products", async () => {
    await dashboardPage.addToCart("Webcam");
    await dashboardPage.addToCart("USB-C Cable");
  });
  await expect(dashboardPage.cartCount).toHaveText("2");
});
```

### Skipping and known failures

- `test.skip(condition, "reason")` inside a test skips it when `condition` is true, e.g. `test.skip(browserName === "webkit", "Feature not supported")`.
- `test.fixme(...)` marks a test as broken, to fix later. It isn't run.
- `test.fail()` says the test is *expected* to fail. If it passes, Playwright reports that, so you notice when a bug is fixed.

## 16.4 Page Object Model

A **page object** is a class that wraps one page (or one component). It holds that page's locators and offers methods for what a user does there. Tests then describe *what* happens, and the page object knows *how*. When a label or layout changes, you update one class instead of every test.

```ts title="practice/pages/login-page.ts"
import { type Page, type Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.signInButton = page.getByRole("button", { name: "Sign in" });
    this.error = page.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/practice/login.html");
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}
```

```ts title="practice/pages/dashboard-page.ts"
import { type Page, type Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly products: Locator;
  readonly cartCount: Locator;
  readonly sortBy: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Dashboard" });
    this.products = page.getByRole("listitem");
    this.cartCount = page.getByTestId("cart-count");
    this.sortBy = page.getByLabel("Sort by");
  }

  async goto() {
    await this.page.goto("/practice/dashboard.html");
  }

  product(name: string): Locator {
    return this.products.filter({ hasText: name });
  }

  async addToCart(name: string) {
    await this.product(name).getByRole("button", { name: "Add to cart" }).click();
  }
}
```

Everything here comes from Part 1: `export` (Chapter 8), classes with `readonly` typed fields and a constructor (Chapter 9), `import type` (Chapter 8), and `async` methods (Chapter 10). Because locators are lazy (Chapter 14), creating them in the constructor is safe.

Good habits for page objects:

- Keep **assertions in tests**, not in page objects, so a page object can be reused by tests that expect different outcomes. Exposing locators (like `error`) lets tests assert on them.
- Name methods after **user intentions** (`signIn`, `addToCart`), not mechanics (`clickButton3`).
- Don't build deep inheritance chains (Chapter 9). Small classes, plus objects for shared components, are easier to follow.

## 16.5 Custom fixtures

You could write `const loginPage = new LoginPage(page); await loginPage.goto();` at the start of every test. **Fixtures** do it for you. `test.extend` creates a new `test` function with extra fixtures, which tests then destructure just like `page`:

```ts title="practice/fixtures/test.ts"
import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/login-page";
import { DashboardPage } from "../pages/dashboard-page";

type PageObjects = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<PageObjects>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);             // the test runs here
  },
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await use(dashboardPage);
  },
});

export { expect } from "@playwright/test";
```

How a fixture works:

1. The code **before** `await use(value)` is **setup**.
2. `use(value)` hands `value` to the test, and waits while the test runs.
3. The code **after** `use` is **teardown**. It runs after the test, even if the test failed. That makes it the place to clean up (Chapter 18 deletes test data there).

The generic `base.extend<PageObjects>` (Chapter 12) tells TypeScript the type of each fixture, so `loginPage` is fully typed in tests.

Tests import `test` and `expect` from the fixtures file instead of `@playwright/test`:

```ts title="practice/tests/organize.spec.ts"
import { test, expect } from "../fixtures/test";

test.describe("login", () => {
  test("valid user reaches the dashboard", { tag: "@smoke" }, async ({ loginPage, page }) => {
    await loginPage.signIn("qa@test.io", "correct-password");
    await expect(page).toHaveURL(/dashboard/);
  });

  test("wrong password shows an error", async ({ loginPage }) => {
    await loginPage.signIn("qa@test.io", "wrong");
    await expect(loginPage.error).toHaveText("Invalid email or password");
  });
});
```

The docs list two reasons fixtures beat hooks: fixtures **encapsulate setup and teardown in the same place**, and they're **on-demand**: *"Playwright Test will setup only the ones needed by your test and nothing else."* A test that only asks for `loginPage` never opens the dashboard.

(That's also why the isolation test in 16.2 lists `dashboardPage` even though it doesn't use the variable: asking for the fixture is what makes it open the dashboard.)

Fixtures can also have `{ scope: "worker" }`, which creates them once per worker process instead of once per test. That's useful for expensive things like a test account shared by many tests.

## 16.6 Sign in once: setup project and storageState

Signing in through the UI before every test is slow. The approach recommended in the Playwright *Authentication* docs:

1. A **setup project** signs in once and saves the browser's state (cookies, local storage) to a file.
2. Other projects **depend on** the setup project, and their tests start with that saved state.

```ts title="practice/tests/auth.setup.ts"
import { test as setup, expect } from "@playwright/test";

const authFile = "playwright/.auth/user.json";

setup("sign in", async ({ page }) => {
  await page.goto("/practice/login.html");
  await page.getByLabel("Email").fill("qa@test.io");
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.context().storageState({ path: authFile });
});
```

The config wires it up (from Chapter 13):

```ts title="practice/playwright.config.ts (excerpt)"
projects: [
  { name: "setup", testMatch: /.*\.setup\.ts/ },
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
    dependencies: ["setup"],      // run setup first
  },
],
```

Tests that need a signed-in user load the saved state with `test.use`:

```ts title="practice/tests/organize.spec.ts"
test.describe("dashboard (signed in)", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("shows the signed-in user", { tag: "@smoke" }, async ({ dashboardPage, page }) => {
    await expect(dashboardPage.heading).toBeVisible();
    await expect(page.getByText("Signed in as qa@test.io")).toBeVisible();
  });
});
```

To make **every** test start signed in, put `storageState: "playwright/.auth/user.json"` in the project's `use` in the config instead.

The saved file is plain JSON. For the practice site, it contains the user in local storage:

```json title="practice/playwright/.auth/user.json"
{
  "cookies": [],
  "origins": [
    {
      "origin": "http://localhost:3000",
      "localStorage": [{ "name": "practice-user", "value": "qa@test.io" }]
    }
  ]
}
```

> **Keep this file out of Git.** For a real application it contains session cookies or tokens, which are as sensitive as a password. The Playwright docs recommend creating `playwright/.auth` and adding it to `.gitignore`, and the practice project does.

## Try it

1. Add a `cartCount()` method to `DashboardPage` that returns the cart count as a **number**. Use it in a test that adds one product and asserts the count is `1`. (Hint: `textContent()`, then `Number()`, as in Chapter 2.)
2. Add a fixture `signedInDashboard` that signs in through `LoginPage` and then gives the test a `DashboardPage`.
3. Tag the "wrong password" test with `@negative` and run only that tag.

<details>
<summary>Show solutions</summary>

```ts
// 1. In DashboardPage:
async cartCountValue(): Promise<number> {
  return Number(await this.cartCount.textContent());
}
// In a test (prefer the retrying assertion for the check itself):
await dashboardPage.addToCart("Webcam");
await expect(dashboardPage.cartCount).toHaveText("1");
expect(await dashboardPage.cartCountValue()).toBe(1);
```

The method is named `cartCountValue` because `cartCount` is already the locator. Reading the number is useful for calculations, but for the assertion itself `toHaveText` is better, because it retries.

```ts
// 2. In fixtures/test.ts: add to the type, then:
signedInDashboard: async ({ page }, use) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.signIn("qa@test.io", "correct-password");
  await use(new DashboardPage(page));
},
```

```bash
# 3. After adding { tag: "@negative" } to the test:
npx playwright test --grep @negative
```

</details>

## Quiz

```quiz
[
  {
    "q": "Test A signs in. Test B, in the same file, runs next without signing in. Is test B signed in?",
    "options": [
      "Yes, they share the browser",
      "No, each test gets a fresh, isolated browser context",
      "Only if they're in the same describe block",
      "Only in Chromium"
    ],
    "answer": 1,
    "why": "Isolation means no state carries over between tests. Use a fixture or storageState to start signed in."
  },
  {
    "q": "In a fixture, when does the code after `await use(value)` run?",
    "options": ["Before the test", "After the test, even if it failed", "Only if the test passed", "Never"],
    "answer": 1,
    "why": "Code after `use` is the fixture's teardown, which makes it the right place for cleanup."
  },
  {
    "q": "Why keep assertions out of page objects?",
    "options": [
      "Page objects can't import `expect`",
      "So the same page object works for tests that expect different outcomes, and failures point at the test's intent",
      "Assertions are slower in classes",
      "Playwright forbids it"
    ],
    "answer": 1,
    "why": "Page objects describe how to use a page. Tests decide what the right result is."
  },
  {
    "q": "What does a setup project with `storageState` give you?",
    "options": [
      "Faster browsers",
      "Sign in once, save cookies and storage to a file, and start other tests already signed in",
      "A database snapshot",
      "Screenshots of every page"
    ],
    "answer": 1,
    "why": "It avoids signing in through the UI in every test."
  },
  {
    "q": "Should `playwright/.auth/user.json` be committed to Git?",
    "options": [
      "Yes, so CI can use it",
      "No, it can contain session cookies or tokens; the Playwright docs recommend adding it to .gitignore",
      "Only if it's small",
      "Only in public repositories"
    ],
    "answer": 1,
    "why": "Treat stored sessions like passwords. The setup project recreates the file on every run."
  },
  {
    "q": "How do you run only tests tagged `@smoke`?",
    "options": [
      "`npx playwright test @smoke`",
      "`npx playwright test --grep @smoke`",
      "`npx playwright test --tag smoke`",
      "`npx playwright smoke`"
    ],
    "answer": 1,
    "why": "Tags are part of the test's title for filtering, so `--grep` selects them."
  }
]
```

## Sources

All code shown was run with Playwright Test 1.65.0 against the practice project: 21 tests passed, `--grep @smoke` selected 3, and `tsc --noEmit` reported no problems.

- Playwright, *Writing tests* and *Annotations* (`describe`, hooks, tags, `skip`, `fixme`, `fail`, `test.step`): [playwright.dev/docs/writing-tests](https://playwright.dev/docs/writing-tests), [playwright.dev/docs/test-annotations](https://playwright.dev/docs/test-annotations)
- Playwright, *Isolation* (browser contexts are like incognito profiles): [playwright.dev/docs/browser-contexts](https://playwright.dev/docs/browser-contexts)
- Playwright, *Page object models*: [playwright.dev/docs/pom](https://playwright.dev/docs/pom)
- Playwright, *Fixtures* (setup/teardown with `use`, on-demand, worker scope): [playwright.dev/docs/test-fixtures](https://playwright.dev/docs/test-fixtures)
- Playwright, *Authentication* (setup project, `storageState`, keep `playwright/.auth` out of Git): [playwright.dev/docs/auth](https://playwright.dev/docs/auth)
- Playwright, *Projects* (dependencies): [playwright.dev/docs/test-projects](https://playwright.dev/docs/test-projects)
