/**
 * JS for QA — Playwright Automation curriculum.
 *
 * Structure: phases -> modules -> lessons.
 * Each module has a level, lesson list, estimated duration, and a short quiz.
 * Content is tilted toward Playwright end-to-end testing with JavaScript/TypeScript.
 *
 * Lesson `body` is an array of blocks:
 *   { type: "p", text }        paragraph
 *   { type: "h", text }        sub-heading
 *   { type: "code", text }     code block
 *   { type: "list", items: [] } bullet list
 */

const CURRICULUM = {
  title: "JS for QA — Playwright Automation",
  subtitle: "A self-paced path for QA engineers learning test automation with JavaScript and Playwright.",
  phases: [
    {
      name: "JavaScript Foundations",
      modules: [
        {
          id: "js-basics",
          title: "JavaScript Essentials for QA",
          level: "Beginner",
          duration: "1 week",
          summary: "The JavaScript you actually use in test code: variables, types, equality, and the array/object methods that show up in every suite.",
          lessons: [
            {
              title: "Variables and types",
              body: [
                { type: "p", text: "JavaScript has three ways to declare a variable. In test code you will almost always use const, and let when a value must change." },
                { type: "code", text: "const baseUrl = 'https://example.com'; // never reassigned\nlet attempts = 0;                      // changes over the test\nattempts = attempts + 1;" },
                { type: "p", text: "Primitive types you meet constantly in QA: string, number, boolean, null, and undefined. API responses are usually objects and arrays built from these." },
                { type: "list", items: [
                  "string — text like a URL or a user name",
                  "number — status codes, counts, prices",
                  "boolean — flags like isLoggedIn",
                  "null / undefined — missing values you must assert carefully",
                ]},
              ],
            },
            {
              title: "Equality and truthiness (the pitfalls)",
              body: [
                { type: "p", text: "Use === (strict equality) in assertions. == coerces types and hides bugs." },
                { type: "code", text: "0 == '';     // true  (coercion — surprising)\n0 === '';    // false (what you want in a test)" },
                { type: "h", text: "Falsy values" },
                { type: "p", text: "These six values are falsy: false, 0, '' (empty string), null, undefined, and NaN. Everything else is truthy — including the string '0' and '[]'." },
                { type: "code", text: "if (response.body) { /* runs only when body is truthy */ }" },
              ],
            },
            {
              title: "Arrays and objects you will use daily",
              body: [
                { type: "p", text: "Validating API and UI data means working with arrays and objects. Learn these methods well." },
                { type: "code", text: "const users = [{ name: 'Ana' }, { name: 'Ben' }];\n\nusers.length;                         // 2\nusers.map(u => u.name);               // ['Ana', 'Ben']\nusers.filter(u => u.name.startsWith('A'));\nusers.find(u => u.name === 'Ben');\nusers.some(u => u.name === 'Ana');    // true\nusers.every(u => u.name.length > 1);  // true" },
                { type: "p", text: "Destructuring pulls fields out cleanly — common in Playwright test signatures." },
                { type: "code", text: "const { name, email } = user;" },
              ],
            },
          ],
          quiz: [
            {
              question: "Which comparison should you prefer in test assertions?",
              options: ["==", "===", "=", "!="],
              correct: 1,
              explanation: "=== compares value and type with no coercion, avoiding surprises like 0 == ''.",
            },
            {
              question: "Which of these is truthy?",
              options: ["0", "''", "'0'", "null"],
              correct: 2,
              explanation: "The string '0' is non-empty, so it is truthy. 0, '', and null are all falsy.",
            },
            {
              question: "Which array method returns the FIRST element matching a condition?",
              options: ["filter", "map", "find", "some"],
              correct: 2,
              explanation: "find returns the first matching element (or undefined). filter returns all matches as an array.",
            },
          ],
        },
      ],
    },
    {
      name: "Async JavaScript",
      modules: [
        {
          id: "async-js",
          title: "Promises & async/await",
          level: "Beginner → Intermediate",
          duration: "1 week",
          summary: "Playwright is asynchronous end to end. If you understand promises and await, Playwright stops feeling like magic.",
          lessons: [
            {
              title: "Why async matters in Playwright",
              body: [
                { type: "p", text: "Almost every Playwright call returns a Promise — a value that arrives later. You await it to get the result before moving on." },
                { type: "code", text: "await page.goto('https://example.com');\nawait page.getByRole('button', { name: 'Login' }).click();" },
                { type: "p", text: "Forgetting await is the number one beginner bug: the test continues before the action finishes, causing flaky or false-passing tests." },
              ],
            },
            {
              title: "Promise states and error handling",
              body: [
                { type: "p", text: "A promise is pending, then either fulfilled or rejected. await unwraps a fulfilled value and throws on rejection." },
                { type: "code", text: "try {\n  await page.goto('https://example.com');\n} catch (err) {\n  // navigation failed — handle or rethrow\n}" },
                { type: "h", text: "Running things in parallel" },
                { type: "code", text: "const [resA, resB] = await Promise.all([\n  page.request.get('/api/a'),\n  page.request.get('/api/b'),\n]);" },
              ],
            },
          ],
          quiz: [
            {
              question: "What is the most common beginner mistake with Playwright calls?",
              options: [
                "Using const instead of let",
                "Forgetting to await an async call",
                "Naming tests poorly",
                "Using too many assertions",
              ],
              correct: 1,
              explanation: "Without await, the test continues before the action completes, causing flaky or false-passing tests.",
            },
            {
              question: "What does Promise.all do?",
              options: [
                "Runs promises one after another",
                "Waits for all to resolve, rejects on the first rejection",
                "Returns only the fastest result",
                "Ignores errors",
              ],
              correct: 1,
              explanation: "Promise.all resolves when every promise resolves and rejects as soon as any one rejects.",
            },
          ],
        },
      ],
    },
    {
      name: "Getting Started with Playwright",
      modules: [
        {
          id: "pw-setup",
          title: "Setup & Your First Test",
          level: "Beginner",
          duration: "1 week",
          summary: "Install Playwright, understand the project layout, and write and run your first end-to-end test.",
          lessons: [
            {
              title: "Install and scaffold",
              body: [
                { type: "p", text: "Create a new Playwright project with the official initializer. It sets up config, a sample test, and the browsers." },
                { type: "code", text: "npm init playwright@latest" },
                { type: "p", text: "This creates playwright.config.ts, a tests/ folder, and installs Chromium, Firefox, and WebKit." },
              ],
            },
            {
              title: "Anatomy of a test",
              body: [
                { type: "p", text: "A Playwright test imports test and expect, then describes steps against a page." },
                { type: "code", text: "import { test, expect } from '@playwright/test';\n\ntest('homepage has title', async ({ page }) => {\n  await page.goto('https://playwright.dev/');\n  await expect(page).toHaveTitle(/Playwright/);\n});" },
                { type: "list", items: [
                  "test(name, fn) — defines one test case",
                  "{ page } — a fresh browser page fixture, provided automatically",
                  "expect(...) — web-first assertions that auto-wait",
                ]},
              ],
            },
            {
              title: "Running tests",
              body: [
                { type: "code", text: "npx playwright test            # run all tests (headless)\nnpx playwright test --headed   # watch the browser\nnpx playwright test --ui       # interactive UI mode\nnpx playwright show-report     # open the HTML report" },
              ],
            },
          ],
          quiz: [
            {
              question: "Which command scaffolds a new Playwright project?",
              options: [
                "npm install playwright-test",
                "npm init playwright@latest",
                "npx create-react-app",
                "playwright new",
              ],
              correct: 1,
              explanation: "npm init playwright@latest sets up config, a sample test, and installs the browsers.",
            },
            {
              question: "What does the { page } fixture give your test?",
              options: [
                "A database connection",
                "A fresh, isolated browser page",
                "The HTML report",
                "A list of selectors",
              ],
              correct: 1,
              explanation: "page is an isolated browser page provided automatically for each test, keeping tests independent.",
            },
          ],
        },
      ],
    },
    {
      name: "Locators & Selectors",
      modules: [
        {
          id: "pw-locators",
          title: "Finding Elements Reliably",
          level: "Beginner → Intermediate",
          duration: "1-2 weeks",
          summary: "Playwright's locator engine is what makes tests resilient. Learn the recommended, user-facing locators and why they beat brittle CSS/XPath.",
          lessons: [
            {
              title: "Recommended locators",
              body: [
                { type: "p", text: "Prefer locators that reflect how users and assistive tech see the page. They survive styling and markup changes." },
                { type: "code", text: "page.getByRole('button', { name: 'Submit' });\npage.getByLabel('Email');\npage.getByPlaceholder('Search');\npage.getByText('Welcome back');\npage.getByTestId('cart-count');" },
                { type: "p", text: "getByRole is the top choice — it matches the accessibility tree. getByTestId is the fallback when nothing user-facing fits." },
              ],
            },
            {
              title: "Why not CSS/XPath by default",
              body: [
                { type: "list", items: [
                  "Styling classes change often and silently break tests",
                  "Absolute XPath like /html/body/div[2] breaks on any layout change",
                  "User-facing locators document intent and are self-healing to small DOM changes",
                ]},
                { type: "p", text: "You can still use CSS when needed, but reach for it last." },
                { type: "code", text: "page.locator('.legacy-widget'); // last resort" },
              ],
            },
            {
              title: "Filtering and chaining",
              body: [
                { type: "code", text: "// a row that contains specific text, then its button\npage.getByRole('row', { name: 'Ana' })\n    .getByRole('button', { name: 'Edit' });\n\npage.getByRole('listitem').filter({ hasText: 'In stock' });" },
              ],
            },
          ],
          quiz: [
            {
              question: "Which locator does Playwright recommend first?",
              options: ["getByRole", "Absolute XPath", "A styling CSS class", "Element index"],
              correct: 0,
              explanation: "getByRole matches the accessibility tree, reflecting how users perceive the page, and is the most resilient.",
            },
            {
              question: "Why avoid absolute XPath like /html/body/div[2]?",
              options: [
                "It is slower to type",
                "It breaks on any layout/markup change",
                "Playwright does not support it",
                "It cannot be chained",
              ],
              correct: 1,
              explanation: "Absolute XPath is tightly coupled to structure and breaks whenever the DOM layout shifts.",
            },
          ],
        },
      ],
    },
    {
      name: "Actions & Assertions",
      modules: [
        {
          id: "pw-assertions",
          title: "Interacting and Verifying",
          level: "Intermediate",
          duration: "1-2 weeks",
          summary: "Perform actions and verify outcomes with web-first assertions that auto-wait — the feature that kills most flakiness.",
          lessons: [
            {
              title: "Common actions",
              body: [
                { type: "code", text: "await page.getByRole('textbox', { name: 'Email' }).fill('qa@test.io');\nawait page.getByRole('button', { name: 'Login' }).click();\nawait page.getByLabel('Country').selectOption('PH');\nawait page.getByRole('checkbox').check();" },
                { type: "p", text: "Playwright auto-waits for an element to be actionable (visible, enabled, stable) before acting, so you rarely need manual waits." },
              ],
            },
            {
              title: "Web-first assertions",
              body: [
                { type: "p", text: "expect() on a locator retries until the condition is met or it times out. This is why you should NOT add fixed sleeps." },
                { type: "code", text: "await expect(page.getByText('Welcome')).toBeVisible();\nawait expect(page.getByRole('alert')).toHaveText('Saved');\nawait expect(page).toHaveURL(/dashboard/);\nawait expect(page.getByRole('listitem')).toHaveCount(3);" },
                { type: "h", text: "Avoid this" },
                { type: "code", text: "await page.waitForTimeout(3000); // anti-pattern: fixed sleep -> flaky" },
              ],
            },
          ],
          quiz: [
            {
              question: "What makes web-first assertions reliable?",
              options: [
                "They run only once",
                "They retry until the condition is met or they time out",
                "They require a fixed sleep first",
                "They skip invisible elements",
              ],
              correct: 1,
              explanation: "expect() on a locator auto-retries, so the UI has time to update without hard-coded sleeps.",
            },
            {
              question: "Which line is an anti-pattern?",
              options: [
                "await expect(locator).toBeVisible()",
                "await page.waitForTimeout(3000)",
                "await locator.click()",
                "await expect(page).toHaveURL(/home/)",
              ],
              correct: 1,
              explanation: "Fixed sleeps cause flaky tests. Rely on auto-waiting actions and retrying assertions instead.",
            },
          ],
        },
      ],
    },
    {
      name: "Test Organization",
      modules: [
        {
          id: "pw-fixtures",
          title: "Fixtures, Hooks & Structure",
          level: "Intermediate",
          duration: "1 week",
          summary: "Keep a growing suite maintainable with hooks, fixtures, and the Page Object Model.",
          lessons: [
            {
              title: "Hooks and grouping",
              body: [
                { type: "code", text: "import { test, expect } from '@playwright/test';\n\ntest.describe('Login', () => {\n  test.beforeEach(async ({ page }) => {\n    await page.goto('/login');\n  });\n\n  test('valid credentials', async ({ page }) => {\n    await page.getByLabel('Email').fill('qa@test.io');\n    await page.getByLabel('Password').fill('secret');\n    await page.getByRole('button', { name: 'Sign in' }).click();\n    await expect(page).toHaveURL(/dashboard/);\n  });\n});" },
                { type: "p", text: "beforeEach keeps each test starting from the same state, so tests stay independent." },
              ],
            },
            {
              title: "Page Object Model",
              body: [
                { type: "p", text: "Wrap page details in a class so tests read like intent and selectors live in one place." },
                { type: "code", text: "export class LoginPage {\n  constructor(page) { this.page = page; }\n  async login(email, pw) {\n    await this.page.getByLabel('Email').fill(email);\n    await this.page.getByLabel('Password').fill(pw);\n    await this.page.getByRole('button', { name: 'Sign in' }).click();\n  }\n}" },
              ],
            },
          ],
          quiz: [
            {
              question: "What is the main benefit of beforeEach?",
              options: [
                "It makes tests run in parallel",
                "It gives every test the same clean starting state",
                "It generates the HTML report",
                "It replaces assertions",
              ],
              correct: 1,
              explanation: "beforeEach resets state so tests stay independent and order-insensitive.",
            },
            {
              question: "Why use the Page Object Model?",
              options: [
                "To avoid writing assertions",
                "To centralize selectors and make tests read like intent",
                "To make tests slower on purpose",
                "It is required by Playwright",
              ],
              correct: 1,
              explanation: "POM keeps selectors in one place and makes tests express behavior, not DOM detail.",
            },
          ],
        },
      ],
    },
    {
      name: "API Testing",
      modules: [
        {
          id: "pw-api",
          title: "API Testing with Playwright",
          level: "Intermediate → Advanced",
          duration: "1 week",
          summary: "Playwright can test HTTP APIs directly — great for setup, teardown, and backend validation alongside UI tests.",
          lessons: [
            {
              title: "The request fixture",
              body: [
                { type: "code", text: "test('create user via API', async ({ request }) => {\n  const res = await request.post('/api/users', {\n    data: { name: 'Ana', role: 'qa' },\n  });\n  expect(res.ok()).toBeTruthy();\n  const body = await res.json();\n  expect(body.name).toBe('Ana');\n});" },
                { type: "p", text: "Use the API to seed data fast, then verify the result in the UI — faster and more stable than clicking through setup." },
              ],
            },
            {
              title: "Validating responses",
              body: [
                { type: "code", text: "const res = await request.get('/api/users/1');\nexpect(res.status()).toBe(200);\nconst user = await res.json();\nexpect(user).toMatchObject({ id: 1, role: 'qa' });" },
              ],
            },
          ],
          quiz: [
            {
              question: "Which fixture does Playwright provide for API calls?",
              options: ["page", "request", "browser", "context"],
              correct: 1,
              explanation: "The request fixture makes HTTP calls directly, without a browser page.",
            },
            {
              question: "A common use of API testing in a UI suite is to…",
              options: [
                "Replace all UI tests",
                "Seed or clean up test data quickly",
                "Render screenshots",
                "Avoid assertions",
              ],
              correct: 1,
              explanation: "APIs seed and tear down state far faster and more reliably than driving the UI for setup.",
            },
          ],
        },
      ],
    },
    {
      name: "Debugging & CI",
      modules: [
        {
          id: "pw-ci",
          title: "Debugging, Traces & CI",
          level: "Advanced",
          duration: "1-2 weeks",
          summary: "Diagnose failures with traces and run your suite in continuous integration so every change is tested.",
          lessons: [
            {
              title: "Traces and debugging",
              body: [
                { type: "code", text: "npx playwright test --trace on\nnpx playwright show-trace trace.zip   # time-travel through the run" },
                { type: "p", text: "The Playwright Inspector and UI mode let you step through actions and see exactly what the test saw." },
                { type: "code", text: "npx playwright test --debug" },
              ],
            },
            {
              title: "Running in CI",
              body: [
                { type: "p", text: "A typical GitHub Actions job installs dependencies and browsers, then runs the suite headlessly on every push." },
                { type: "code", text: "- run: npm ci\n- run: npx playwright install --with-deps\n- run: npx playwright test" },
                { type: "list", items: [
                  "Run headless in CI for speed and stability",
                  "Upload the HTML report and traces as artifacts",
                  "Fail the pipeline on any test failure to block bad changes",
                ]},
              ],
            },
          ],
          quiz: [
            {
              question: "What does a Playwright trace let you do?",
              options: [
                "Edit the application code",
                "Time-travel through a test run to see each action",
                "Skip failing tests",
                "Deploy the app",
              ],
              correct: 1,
              explanation: "show-trace opens a viewer that steps through the run with DOM snapshots, network, and console.",
            },
            {
              question: "Why run tests headless in CI?",
              options: [
                "It is the only mode CI supports",
                "For speed and stability on servers without a display",
                "To skip assertions",
                "To avoid installing browsers",
              ],
              correct: 1,
              explanation: "Headless runs are faster and do not need a display, which suits CI servers.",
            },
          ],
        },
      ],
    },
  ],
};

window.CURRICULUM = CURRICULUM;
