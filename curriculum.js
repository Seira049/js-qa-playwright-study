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
      name: "TypeScript for QA",
      modules: [
        {
          id: "ts-for-qa",
          title: "TypeScript Essentials",
          level: "Beginner → Intermediate",
          duration: "1-2 weeks",
          summary: "Modern Playwright is TypeScript-first. Learn just enough TypeScript to write typed, self-documenting tests and catch mistakes before they run.",
          lessons: [
            {
              title: "Why TypeScript for test automation",
              body: [
                { type: "p", text: "TypeScript is JavaScript with types. The types are checked before the test runs, so whole classes of bugs (wrong field names, missing properties, bad arguments) are caught in your editor instead of at runtime." },
                { type: "list", items: [
                  "Autocomplete for Playwright's API — fewer docs lookups",
                  "Typos in property names become compile errors",
                  "Refactoring is safe: rename a field and TS finds every use",
                  "Playwright's own types describe page, locator, expect for you",
                ]},
                { type: "p", text: "Playwright projects created with npm init use .ts files by default — you already have TypeScript set up." },
              ],
            },
            {
              title: "Basic type annotations",
              body: [
                { type: "p", text: "Annotate values with : type. Often you can let TypeScript infer the type and only annotate function parameters and public APIs." },
                { type: "code", text: "const baseUrl: string = 'https://example.com';\nlet attempts: number = 0;\nconst isLoggedIn: boolean = false;\n\nfunction buildUrl(path: string): string {\n  return baseUrl + path;\n}" },
                { type: "h", text: "Arrays and unions" },
                { type: "code", text: "const roles: string[] = ['admin', 'qa'];\nlet status: 'active' | 'locked' | 'pending' = 'active'; // union type" },
              ],
            },
            {
              title: "Interfaces and types for test data",
              body: [
                { type: "p", text: "Describe the shape of API payloads and fixtures so the compiler verifies you use them correctly." },
                { type: "code", text: "interface User {\n  id: number;\n  name: string;\n  email: string;\n  role: 'admin' | 'qa' | 'viewer';\n  verified?: boolean; // optional\n}\n\nconst user: User = { id: 1, name: 'Ana', email: 'ana@test.io', role: 'qa' };\n// user.rol = 'qa';  // compile error: typo caught before running" },
              ],
            },
            {
              title: "Typing a Playwright test",
              body: [
                { type: "p", text: "Playwright ships its own types. You rarely annotate fixtures by hand, but typed helpers and page objects pay off fast." },
                { type: "code", text: "import { test, expect, Page } from '@playwright/test';\n\nasync function login(page: Page, email: string, password: string): Promise<void> {\n  await page.getByLabel('Email').fill(email);\n  await page.getByLabel('Password').fill(password);\n  await page.getByRole('button', { name: 'Sign in' }).click();\n}\n\ntest('typed login helper', async ({ page }) => {\n  await page.goto('/login');\n  await login(page, 'qa@test.io', 'secret');\n  await expect(page).toHaveURL(/dashboard/);\n});" },
              ],
            },
          ],
          quiz: [
            {
              question: "What is the main advantage of TypeScript in test code?",
              options: [
                "Tests run faster at runtime",
                "Type errors are caught before the test runs",
                "It removes the need for assertions",
                "It replaces Playwright",
              ],
              correct: 1,
              explanation: "TypeScript checks types at compile time, catching wrong field names and bad arguments in your editor before running.",
            },
            {
              question: "How do you declare a value that can only be one of a fixed set of strings?",
              options: [
                "string[]",
                "a union type like 'active' | 'locked'",
                "any",
                "object",
              ],
              correct: 1,
              explanation: "A union of string literals restricts the value to exactly those options, and TS flags anything else.",
            },
            {
              question: "What does the ? in `verified?: boolean` mean?",
              options: [
                "The field is required",
                "The field is optional",
                "The field is a boolean question",
                "The field is read-only",
              ],
              correct: 1,
              explanation: "A ? marks a property as optional — it may be present or absent on the object.",
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
          id: "api-testing",
          title: "API Testing with Playwright",
          level: "Intermediate → Advanced",
          duration: "1-2 weeks",
          summary: "Test HTTP APIs directly: status codes, request bodies, authentication, schema validation, and chaining calls. Great for backend checks and fast setup/teardown alongside UI tests.",
          lessons: [
            {
              title: "HTTP basics every QA should know",
              body: [
                { type: "p", text: "An API test sends an HTTP request and asserts on the response. You verify three things: the status code, the headers, and the body." },
                { type: "h", text: "Common methods" },
                { type: "list", items: [
                  "GET — read a resource (no body)",
                  "POST — create a resource (send a body)",
                  "PUT / PATCH — update a resource",
                  "DELETE — remove a resource",
                ]},
                { type: "h", text: "Status code families" },
                { type: "list", items: [
                  "2xx — success (200 OK, 201 Created, 204 No Content)",
                  "4xx — client error (400 Bad Request, 401 Unauthorized, 404 Not Found)",
                  "5xx — server error (500, 503) — usually a defect to report",
                ]},
              ],
            },
            {
              title: "The request fixture",
              body: [
                { type: "p", text: "Playwright's request fixture makes HTTP calls without a browser page — fast and stable." },
                { type: "code", text: "test('create user via API', async ({ request }) => {\n  const res = await request.post('/api/users', {\n    data: { name: 'Ana', role: 'qa' },\n  });\n  expect(res.status()).toBe(201);\n  const body = await res.json();\n  expect(body.name).toBe('Ana');\n});" },
                { type: "p", text: "Use the API to seed data fast, then verify the result in the UI — faster and more stable than clicking through setup." },
              ],
            },
            {
              title: "Authentication: headers and tokens",
              body: [
                { type: "p", text: "Most APIs need an auth token. Send it as a header, or configure it once for the whole suite." },
                { type: "code", text: "const res = await request.get('/api/profile', {\n  headers: { Authorization: `Bearer ${token}` },\n});\nexpect(res.status()).toBe(200);" },
                { type: "p", text: "A 401 means the token is missing or invalid; a 403 means the token is valid but lacks permission — a key distinction when writing negative tests." },
              ],
            },
            {
              title: "Validating the response body",
              body: [
                { type: "p", text: "Check the fields you care about. toMatchObject verifies a subset without requiring every field." },
                { type: "code", text: "const res = await request.get('/api/users/1');\nexpect(res.status()).toBe(200);\nconst user = await res.json();\n\nexpect(user).toMatchObject({ id: 1, role: 'qa' });\nexpect(user.email).toContain('@');\nexpect(Array.isArray(user.permissions)).toBeTruthy();" },
                { type: "h", text: "Schema-style checks" },
                { type: "p", text: "For stronger validation, assert types and required fields explicitly (or use a schema library like Zod)." },
                { type: "code", text: "expect(typeof user.id).toBe('number');\nexpect(typeof user.name).toBe('string');" },
              ],
            },
            {
              title: "Chaining requests and negative tests",
              body: [
                { type: "p", text: "Real flows span several calls: create, read back, then clean up. And always test the unhappy paths." },
                { type: "code", text: "// create -> fetch -> delete\nconst created = await (await request.post('/api/users', { data: { name: 'Temp' } })).json();\nconst fetched = await request.get(`/api/users/${created.id}`);\nexpect(fetched.status()).toBe(200);\nawait request.delete(`/api/users/${created.id}`);\n\n// negative: missing required field\nconst bad = await request.post('/api/users', { data: {} });\nexpect(bad.status()).toBe(400);" },
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
              question: "A 201 status code usually means…",
              options: [
                "The request was malformed",
                "A resource was created successfully",
                "The server crashed",
                "Authentication failed",
              ],
              correct: 1,
              explanation: "201 Created is a 2xx success code returned after a POST creates a new resource.",
            },
            {
              question: "What is the difference between 401 and 403?",
              options: [
                "They are identical",
                "401 = not authenticated; 403 = authenticated but not permitted",
                "401 = server error; 403 = client error",
                "403 means the resource was created",
              ],
              correct: 1,
              explanation: "401 Unauthorized means you are not logged in / token invalid; 403 Forbidden means you are, but lack permission.",
            },
            {
              question: "Why use toMatchObject when validating a response?",
              options: [
                "It requires every field to match exactly",
                "It checks a subset of fields you care about",
                "It ignores the status code",
                "It converts JSON to XML",
              ],
              correct: 1,
              explanation: "toMatchObject asserts the fields you specify are present and correct, without failing on extra fields.",
            },
            {
              question: "A good negative API test would check that…",
              options: [
                "A valid request returns 200",
                "A request missing a required field returns 400",
                "The homepage loads",
                "The token is printed to the console",
              ],
              correct: 1,
              explanation: "Negative tests verify the API rejects bad input correctly, e.g. 400 Bad Request for a missing required field.",
            },
          ],
        },
        {
          id: "mock-api-data-setup",
          title: "Mock APIs & Test Data Setup (Walkthrough)",
          level: "Intermediate → Advanced",
          duration: "1-2 weeks",
          summary: "A step-by-step walkthrough: intercept and mock network calls with page.route, simulate errors and edge cases, replay recorded traffic, and build reliable test data with API seeding, fixtures, and cleanup.",
          lessons: [
            {
              title: "Step 1 — Why mock, and when not to",
              body: [
                { type: "p", text: "Mocking replaces a real backend response with one you control. It makes UI tests fast, deterministic, and able to reach states that are hard to produce for real." },
                { type: "list", items: [
                  "Mock when: the backend is slow, unstable, not built yet, or you need a rare state (empty list, 500 error, timeout)",
                  "Mock when: testing UI behavior in isolation (loading spinners, error banners, pagination)",
                  "Don't mock when: you are verifying the real integration — keep some end-to-end tests that hit the real API",
                ]},
                { type: "p", text: "Rule of thumb: mock to test the UI, use real APIs to test the system. A healthy suite has both." },
              ],
            },
            {
              title: "Step 2 — Intercept a request with page.route",
              body: [
                { type: "p", text: "page.route registers a handler for URLs matching a pattern. Register it BEFORE the page makes the call — usually before page.goto." },
                { type: "code", text: "import { test, expect } from '@playwright/test';\n\ntest('shows users from a mocked API', async ({ page }) => {\n  await page.route('**/api/users', async (route) => {\n    await route.fulfill({\n      status: 200,\n      json: [\n        { id: 1, name: 'Ana', role: 'qa' },\n        { id: 2, name: 'Ben', role: 'admin' },\n      ],\n    });\n  });\n\n  await page.goto('/users');\n  await expect(page.getByRole('listitem')).toHaveCount(2);\n  await expect(page.getByText('Ana')).toBeVisible();\n});" },
                { type: "list", items: [
                  "'**/api/users' — glob pattern; you can also pass a RegExp or a predicate function",
                  "route.fulfill — respond with your own status, headers, and body/json",
                  "The real backend is never called for that URL",
                ]},
              ],
            },
            {
              title: "Step 3 — Simulate errors and edge cases",
              body: [
                { type: "p", text: "This is where mocking pays off: states that are painful to create against a real server become one-liners." },
                { type: "code", text: "// Server error -> UI should show an error banner\nawait page.route('**/api/users', (route) =>\n  route.fulfill({ status: 500, json: { message: 'Internal error' } })\n);\n\n// Empty state\nawait page.route('**/api/users', (route) => route.fulfill({ status: 200, json: [] }));\n\n// Network failure (no response at all)\nawait page.route('**/api/users', (route) => route.abort('failed'));\n\n// Slow response -> loading spinner should appear\nawait page.route('**/api/users', async (route) => {\n  await new Promise((r) => setTimeout(r, 2000));\n  await route.fulfill({ status: 200, json: [] });\n});" },
                { type: "p", text: "Then assert the UI reacts correctly, e.g. await expect(page.getByRole('alert')).toContainText('Something went wrong')." },
              ],
            },
            {
              title: "Step 4 — Modify a real response",
              body: [
                { type: "p", text: "Sometimes you want the real data with one field changed. route.fetch() calls the real server, then you tweak the result before handing it to the page." },
                { type: "code", text: "await page.route('**/api/profile', async (route) => {\n  const response = await route.fetch();          // real call\n  const body = await response.json();\n  body.accountStatus = 'locked';                  // force an edge case\n  await route.fulfill({ response, json: body });  // keep real headers/status\n});" },
                { type: "p", text: "To let a request pass through untouched (for example, only mocking some calls), use route.continue(). You can also change headers on the way out." },
                { type: "code", text: "await page.route('**/api/**', async (route) => {\n  if (route.request().method() === 'GET') return route.continue();\n  return route.fulfill({ status: 403, json: { message: 'Read-only mode' } });\n});" },
              ],
            },
            {
              title: "Step 5 — Verify what the app sent",
              body: [
                { type: "p", text: "Mocks can also act as spies. Capture the request to assert the UI sent the right payload." },
                { type: "code", text: "test('form sends the correct payload', async ({ page }) => {\n  let sentBody;\n  await page.route('**/api/users', async (route) => {\n    sentBody = route.request().postDataJSON();\n    await route.fulfill({ status: 201, json: { id: 99, ...sentBody } });\n  });\n\n  await page.goto('/users/new');\n  await page.getByLabel('Name').fill('Ana');\n  await page.getByLabel('Role').selectOption('qa');\n  await page.getByRole('button', { name: 'Save' }).click();\n\n  await expect(page.getByText('User created')).toBeVisible();\n  expect(sentBody).toEqual({ name: 'Ana', role: 'qa' });\n});" },
                { type: "p", text: "Alternative without mocking: const req = await page.waitForRequest('**/api/users') and inspect req.postDataJSON()." },
              ],
            },
            {
              title: "Step 6 — Record and replay with HAR files",
              body: [
                { type: "p", text: "For pages that make many calls, record real traffic once into a HAR file and replay it in later runs." },
                { type: "code", text: "// First run: record (update: true writes the HAR)\nawait page.routeFromHAR('tests/hars/dashboard.har', {\n  url: '**/api/**',\n  update: true,\n});\n\n// Later runs: replay from the file (set update: false or remove it)\nawait page.routeFromHAR('tests/hars/dashboard.har', { url: '**/api/**' });" },
                { type: "p", text: "Commit the HAR, review it for sensitive data (tokens, personal info) before committing, and re-record when the API contract changes." },
              ],
            },
            {
              title: "Step 7 — Seed test data through the API",
              body: [
                { type: "p", text: "Mocks fake the backend; seeding prepares the REAL backend. Create the exact data a test needs through the API instead of clicking through the UI." },
                { type: "code", text: "test('edit an existing user', async ({ page, request }) => {\n  // Arrange: create data via API (fast, reliable)\n  const res = await request.post('/api/users', {\n    data: { name: `qa-user-${Date.now()}`, role: 'qa' },\n  });\n  expect(res.ok()).toBeTruthy();\n  const user = await res.json();\n\n  // Act: test the UI against real data\n  await page.goto(`/users/${user.id}/edit`);\n  await page.getByLabel('Role').selectOption('admin');\n  await page.getByRole('button', { name: 'Save' }).click();\n\n  // Assert\n  await expect(page.getByText('Saved')).toBeVisible();\n\n  // Cleanup\n  await request.delete(`/api/users/${user.id}`);\n});" },
                { type: "p", text: "Unique values (timestamps or random IDs) keep parallel tests from colliding on the same record." },
              ],
            },
            {
              title: "Step 8 — Package setup and cleanup in a custom fixture",
              body: [
                { type: "p", text: "Move seeding into a fixture with test.extend. Code before use() is setup; code after use() is teardown, and it runs even if the test fails." },
                { type: "code", text: "// fixtures.ts\nimport { test as base, expect } from '@playwright/test';\n\ntype User = { id: number; name: string; role: string };\n\nexport const test = base.extend<{ seededUser: User }>({\n  seededUser: async ({ request }, use) => {\n    const res = await request.post('/api/users', {\n      data: { name: `qa-user-${Date.now()}`, role: 'qa' },\n    });\n    const user: User = await res.json();\n\n    await use(user);                          // test runs here\n\n    await request.delete(`/api/users/${user.id}`); // always cleaned up\n  },\n});\nexport { expect };" },
                { type: "code", text: "// users.spec.ts\nimport { test, expect } from './fixtures';\n\ntest('profile shows seeded user', async ({ page, seededUser }) => {\n  await page.goto(`/users/${seededUser.id}`);\n  await expect(page.getByRole('heading')).toHaveText(seededUser.name);\n});" },
              ],
            },
            {
              title: "Step 9 — Log in once with a setup project",
              body: [
                { type: "p", text: "Logging in through the UI in every test is slow. Authenticate once, save the session to a file, and reuse it everywhere." },
                { type: "code", text: "// tests/auth.setup.ts\nimport { test as setup, expect } from '@playwright/test';\n\nsetup('authenticate', async ({ page }) => {\n  await page.goto('/login');\n  await page.getByLabel('Email').fill(process.env.QA_USER!);\n  await page.getByLabel('Password').fill(process.env.QA_PASSWORD!);\n  await page.getByRole('button', { name: 'Sign in' }).click();\n  await expect(page).toHaveURL(/dashboard/);\n  await page.context().storageState({ path: 'playwright/.auth/user.json' });\n});" },
                { type: "code", text: "// playwright.config.ts (excerpt)\nprojects: [\n  { name: 'setup', testMatch: /.*\\.setup\\.ts/ },\n  {\n    name: 'chromium',\n    use: { storageState: 'playwright/.auth/user.json' },\n    dependencies: ['setup'],\n  },\n]," },
                { type: "list", items: [
                  "Credentials come from environment variables — never hardcode them",
                  "Add playwright/.auth/ to .gitignore — the file holds live session cookies",
                ]},
              ],
            },
          ],
          quiz: [
            {
              question: "When must you register page.route for a call made on page load?",
              options: [
                "After the assertion",
                "Before page.goto",
                "After page.goto finishes",
                "Only inside afterEach",
              ],
              correct: 1,
              explanation: "The route must exist before the request is made. Register it before navigating, or the real request goes through.",
            },
            {
              question: "Which call responds to an intercepted request with your own data?",
              options: ["route.continue()", "route.abort()", "route.fulfill()", "route.request()"],
              correct: 2,
              explanation: "route.fulfill sends a custom status/headers/body. continue passes it through; abort simulates a network failure.",
            },
            {
              question: "How do you return the real response with one field changed?",
              options: [
                "route.abort() then retry",
                "route.fetch(), edit the JSON, then route.fulfill({ response, json })",
                "Edit the database directly",
                "It is not possible in Playwright",
              ],
              correct: 1,
              explanation: "route.fetch() performs the real request; you modify the parsed body and fulfill with it, keeping real headers and status.",
            },
            {
              question: "In a test.extend fixture, where does cleanup code go?",
              options: [
                "Before use()",
                "After await use(...)",
                "In a separate test",
                "Cleanup is not supported",
              ],
              correct: 1,
              explanation: "Code after await use() runs as teardown once the test finishes, even when the test fails.",
            },
            {
              question: "Why add playwright/.auth/ to .gitignore?",
              options: [
                "It makes tests faster",
                "The storage state file holds live session cookies/tokens",
                "Git cannot store JSON",
                "Playwright requires it",
              ],
              correct: 1,
              explanation: "storageState saves real session cookies and tokens. Committing it would leak a usable login.",
            },
            {
              question: "What is the best reason to keep some tests that hit the real API?",
              options: [
                "Mocks are not allowed in CI",
                "Mocks cannot catch real integration and contract breaks",
                "Real APIs are always faster",
                "Playwright cannot mock POST requests",
              ],
              correct: 1,
              explanation: "Mocks only prove the UI handles the data you invented. Real-API tests catch backend changes and integration bugs.",
            },
          ],
        },
      ],
    },
    {
      name: "SQL for QA",
      modules: [
        {
          id: "sql-beginner",
          title: "SQL Fundamentals",
          level: "Beginner",
          duration: "1 week",
          summary: "Read data with confidence: tables and rows, SELECT, filtering with WHERE, sorting and limiting, handling NULL, and safe writes.",
          lessons: [
            {
              title: "Why QA needs SQL",
              body: [
                { type: "p", text: "The UI and API can show a success message while the database saved the wrong thing. SQL lets you verify data at the source." },
                { type: "list", items: [
                  "Confirm a record was created, updated, or deleted correctly",
                  "Find or prepare precise test data before a run",
                  "Investigate a failed test by inspecting the real rows",
                  "Validate reports and totals against raw data",
                ]},
              ],
            },
            {
              title: "Tables, rows, and columns",
              body: [
                { type: "p", text: "A relational database stores data in tables. Each row is one record; each column is one field with a type." },
                { type: "code", text: "users\n+----+-------+------------------+--------+---------------------+\n| id | name  | email            | status | created_at          |\n+----+-------+------------------+--------+---------------------+\n|  1 | Ana   | ana@test.io      | active | 2026-03-01 09:12:00 |\n|  2 | Ben   | ben@test.io      | locked | 2026-03-04 14:40:00 |\n+----+-------+------------------+--------+---------------------+" },
                { type: "p", text: "The primary key (id) uniquely identifies each row. Other tables reference it with a foreign key, e.g. orders.user_id points to users.id." },
              ],
            },
            {
              title: "SELECT and WHERE",
              body: [
                { type: "p", text: "SELECT picks columns. FROM names the table. WHERE filters rows. List the columns you need instead of SELECT * so results stay readable." },
                { type: "code", text: "SELECT id, name, email, status\nFROM users\nWHERE status = 'active';" },
                { type: "h", text: "Common operators" },
                { type: "code", text: "WHERE age >= 18                       -- comparison: = <> < > <= >=\nWHERE status = 'active' AND role = 'qa' -- both true\nWHERE role = 'admin' OR role = 'qa'     -- either true\nWHERE role IN ('admin', 'qa')           -- any of a set\nWHERE email LIKE '%@test.io'            -- % = any characters\nWHERE created_at BETWEEN '2026-01-01' AND '2026-01-31'" },
              ],
            },
            {
              title: "Sorting, limiting, and distinct values",
              body: [
                { type: "code", text: "-- newest 10 users\nSELECT id, name, created_at\nFROM users\nORDER BY created_at DESC\nLIMIT 10;\n\n-- every status value that exists in the table\nSELECT DISTINCT status FROM users;" },
                { type: "p", text: "SELECT DISTINCT status is a quick way to spot an unexpected value (a typo like 'actve') that the app saved." },
                { type: "p", text: "Syntax note: LIMIT works in PostgreSQL, MySQL, and SQLite. SQL Server uses SELECT TOP 10, and Oracle uses FETCH FIRST 10 ROWS ONLY." },
              ],
            },
            {
              title: "NULL: the missing value",
              body: [
                { type: "p", text: "NULL means 'no value'. It is not equal to anything, not even another NULL, so = NULL never matches." },
                { type: "code", text: "WHERE verified = NULL      -- WRONG: always returns no rows\nWHERE verified IS NULL     -- correct\nWHERE verified IS NOT NULL -- correct\n\n-- show a default instead of NULL\nSELECT name, COALESCE(phone, 'none') AS phone FROM users;" },
                { type: "p", text: "Many 'missing data' bugs show up as unexpected NULLs. Check required columns with IS NULL after a create flow." },
              ],
            },
            {
              title: "INSERT, UPDATE, DELETE — safely",
              body: [
                { type: "code", text: "INSERT INTO users (name, email, status)\nVALUES ('QA Temp', 'qa.temp@test.io', 'active');\n\nUPDATE users SET status = 'locked'\nWHERE email = 'qa.temp@test.io';\n\nDELETE FROM users\nWHERE email = 'qa.temp@test.io';" },
                { type: "list", items: [
                  "Only write to a TEST database — never production",
                  "Always include a WHERE clause on UPDATE and DELETE; without it, every row changes",
                  "Run the same WHERE as a SELECT first to preview which rows will be affected",
                ]},
              ],
            },
          ],
          quiz: [
            {
              question: "Which clause filters rows in a SELECT?",
              options: ["ORDER BY", "WHERE", "DISTINCT", "LIMIT"],
              correct: 1,
              explanation: "WHERE filters rows. ORDER BY sorts, DISTINCT removes duplicates, LIMIT caps the number returned.",
            },
            {
              question: "How do you find rows where phone has no value?",
              options: ["WHERE phone = NULL", "WHERE phone IS NULL", "WHERE phone = ''", "WHERE phone == NULL"],
              correct: 1,
              explanation: "NULL is never equal to anything, so = NULL matches nothing. Use IS NULL.",
            },
            {
              question: "What does `LIKE '%@test.io'` match?",
              options: [
                "Only the exact text %@test.io",
                "Any value ending in @test.io",
                "Any value starting with @test.io",
                "Nothing — LIKE needs a number",
              ],
              correct: 1,
              explanation: "% matches any sequence of characters, so the pattern matches anything that ends with @test.io.",
            },
            {
              question: "What happens if you run `DELETE FROM users;` with no WHERE?",
              options: [
                "It deletes nothing",
                "It deletes every row in the table",
                "It deletes the first row only",
                "It returns an error by default in every database",
              ],
              correct: 1,
              explanation: "With no WHERE clause, DELETE removes every row. Always scope writes and preview with SELECT first.",
            },
          ],
        },
        {
          id: "sql-intermediate",
          title: "Intermediate SQL: Joins & Aggregates",
          level: "Intermediate",
          duration: "1-2 weeks",
          summary: "Combine tables with JOINs, summarize with GROUP BY and HAVING, branch with CASE, and run the data-integrity checks QA uses to find real defects.",
          lessons: [
            {
              title: "Aggregates and GROUP BY",
              body: [
                { type: "p", text: "Aggregate functions summarize many rows into one value: COUNT, SUM, AVG, MIN, MAX." },
                { type: "code", text: "SELECT COUNT(*) FROM orders WHERE status = 'paid';\n\nSELECT SUM(total) AS revenue, AVG(total) AS avg_order\nFROM orders\nWHERE status = 'paid';" },
                { type: "p", text: "GROUP BY splits rows into buckets and computes the aggregate per bucket. HAVING filters the buckets (WHERE filters rows before grouping)." },
                { type: "code", text: "SELECT status, COUNT(*) AS total\nFROM orders\nGROUP BY status\nHAVING COUNT(*) > 10\nORDER BY total DESC;" },
              ],
            },
            {
              title: "INNER JOIN and LEFT JOIN",
              body: [
                { type: "p", text: "Data is split across tables. A JOIN links them on a shared key — each order belongs to a user through orders.user_id." },
                { type: "code", text: "SELECT u.name, o.id AS order_id, o.total\nFROM users u\nINNER JOIN orders o ON o.user_id = u.id\nWHERE o.status = 'paid';" },
                { type: "list", items: [
                  "INNER JOIN — only rows that match in both tables",
                  "LEFT JOIN — every row from the left table; NULLs where there is no match",
                ]},
                { type: "p", text: "A LEFT JOIN with IS NULL finds gaps — here, users who never placed an order:" },
                { type: "code", text: "SELECT u.id, u.name\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nWHERE o.id IS NULL;" },
              ],
            },
            {
              title: "Joining more than two tables",
              body: [
                { type: "code", text: "SELECT u.name, o.id AS order_id, p.name AS product, oi.quantity\nFROM orders o\nJOIN users u        ON u.id = o.user_id\nJOIN order_items oi ON oi.order_id = o.id\nJOIN products p     ON p.id = oi.product_id\nWHERE o.id = 1001;" },
                { type: "p", text: "Short aliases (u, o, oi, p) keep long joins readable. Watch for row multiplication: joining a one-to-many table repeats the parent row once per child, which inflates COUNT and SUM if you are not careful." },
              ],
            },
            {
              title: "CASE expressions",
              body: [
                { type: "p", text: "CASE adds if/else logic inside a query — useful for labeling or bucketing results." },
                { type: "code", text: "SELECT id, total,\n  CASE\n    WHEN total >= 1000 THEN 'high'\n    WHEN total >= 100  THEN 'medium'\n    ELSE 'low'\n  END AS tier\nFROM orders;\n\n-- count several conditions in one pass\nSELECT\n  SUM(CASE WHEN status = 'paid'    THEN 1 ELSE 0 END) AS paid,\n  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending\nFROM orders;" },
              ],
            },
            {
              title: "Data-integrity checks that find real bugs",
              body: [
                { type: "p", text: "These queries come up again and again in QA. Each one should return zero rows on healthy data." },
                { type: "code", text: "-- 1. Duplicates that should be unique\nSELECT email, COUNT(*) AS n\nFROM users\nGROUP BY email\nHAVING COUNT(*) > 1;\n\n-- 2. Orphans: child rows pointing at a missing parent\nSELECT oi.id\nFROM order_items oi\nLEFT JOIN orders o ON o.id = oi.order_id\nWHERE o.id IS NULL;\n\n-- 3. Totals that don't add up\nSELECT o.id, o.total, SUM(oi.quantity * oi.unit_price) AS computed\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.id\nGROUP BY o.id, o.total\nHAVING o.total <> SUM(oi.quantity * oi.unit_price);\n\n-- 4. Required fields left empty\nSELECT id FROM users WHERE email IS NULL OR email = '';" },
              ],
            },
          ],
          quiz: [
            {
              question: "What is the difference between WHERE and HAVING?",
              options: [
                "They are identical",
                "WHERE filters rows before grouping; HAVING filters groups after aggregation",
                "HAVING filters rows; WHERE filters groups",
                "HAVING only works with JOIN",
              ],
              correct: 1,
              explanation: "WHERE runs before GROUP BY on individual rows. HAVING runs after, on the aggregated groups.",
            },
            {
              question: "To list all users including those with no orders, use…",
              options: ["INNER JOIN", "LEFT JOIN from users", "WHERE only", "GROUP BY"],
              correct: 1,
              explanation: "A LEFT JOIN keeps every row from the left table (users), filling NULLs where there is no matching order.",
            },
            {
              question: "Which query finds duplicate emails?",
              options: [
                "SELECT DISTINCT email FROM users",
                "SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1",
                "SELECT * FROM users ORDER BY email",
                "SELECT email FROM users WHERE email IS NULL",
              ],
              correct: 1,
              explanation: "Group by email and keep only groups with more than one row — those are the duplicates.",
            },
            {
              question: "An 'orphan' row is…",
              options: [
                "A row with no columns",
                "A child row whose foreign key points to a parent that does not exist",
                "The first row of a table",
                "A row with a NULL primary key",
              ],
              correct: 1,
              explanation: "Orphans reference a missing parent, e.g. order_items for a deleted order. LEFT JOIN + IS NULL finds them.",
            },
            {
              question: "Why can a SUM be wrong after joining a one-to-many table?",
              options: [
                "SUM ignores joins",
                "The parent row repeats once per child, inflating the total",
                "JOIN removes all numbers",
                "SUM only works on one table",
              ],
              correct: 1,
              explanation: "Each child row duplicates the parent row's values, so summing a parent column counts it multiple times.",
            },
          ],
        },
        {
          id: "sql-advanced",
          title: "Advanced SQL for Test Automation",
          level: "Advanced",
          duration: "2 weeks",
          summary: "Subqueries, CTEs, window functions, transactions, and query plans — then wire SQL into Playwright tests to verify and prepare data automatically.",
          lessons: [
            {
              title: "Subqueries and EXISTS",
              body: [
                { type: "p", text: "A subquery is a query inside another query. Use it to compare against a computed value or a set." },
                { type: "code", text: "-- orders above the average order value\nSELECT id, total\nFROM orders\nWHERE total > (SELECT AVG(total) FROM orders);\n\n-- users who have at least one refunded order\nSELECT u.id, u.name\nFROM users u\nWHERE EXISTS (\n  SELECT 1 FROM orders o\n  WHERE o.user_id = u.id AND o.status = 'refunded'\n);" },
                { type: "p", text: "EXISTS stops at the first match and handles NULLs safely. Prefer NOT EXISTS over NOT IN when the subquery can return NULL — NOT IN with a NULL returns no rows at all." },
              ],
            },
            {
              title: "CTEs: readable multi-step queries",
              body: [
                { type: "p", text: "A Common Table Expression (WITH ...) names an intermediate result so complex checks read top to bottom." },
                { type: "code", text: "WITH paid_orders AS (\n  SELECT user_id, SUM(total) AS spent\n  FROM orders\n  WHERE status = 'paid'\n  GROUP BY user_id\n),\nvip AS (\n  SELECT user_id FROM paid_orders WHERE spent >= 5000\n)\nSELECT u.id, u.name, u.tier\nFROM users u\nJOIN vip v ON v.user_id = u.id\nWHERE u.tier <> 'VIP';   -- defect: should be VIP but isn't" },
                { type: "p", text: "This pattern turns a business rule ('spend 5000 → VIP') into a query that returns violations. Zero rows means the rule holds." },
              ],
            },
            {
              title: "Window functions",
              body: [
                { type: "p", text: "Window functions compute across related rows without collapsing them like GROUP BY does." },
                { type: "code", text: "-- latest login per user\nSELECT * FROM (\n  SELECT user_id, logged_in_at,\n         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY logged_in_at DESC) AS rn\n  FROM login_events\n) t\nWHERE rn = 1;\n\n-- detect a status that went backwards (e.g. shipped -> pending)\nSELECT order_id, status, changed_at,\n       LAG(status) OVER (PARTITION BY order_id ORDER BY changed_at) AS prev_status\nFROM order_status_history;" },
                { type: "list", items: [
                  "ROW_NUMBER / RANK — position within a group",
                  "LAG / LEAD — previous / next row's value",
                  "SUM(...) OVER (...) — running totals",
                ]},
              ],
            },
            {
              title: "Transactions and isolated test data",
              body: [
                { type: "p", text: "A transaction groups statements so they all succeed or all roll back. In tests, it lets you change data and undo it completely." },
                { type: "code", text: "BEGIN;\n\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nUPDATE accounts SET balance = balance + 100 WHERE id = 2;\n\nSELECT id, balance FROM accounts WHERE id IN (1, 2); -- inspect\n\nROLLBACK;  -- undo everything (use COMMIT to keep it)" },
                { type: "p", text: "Note: a rollback only undoes work done on that same connection. If the app under test writes through its own connection, clean up with targeted DELETEs on your test-tagged rows instead." },
              ],
            },
            {
              title: "Reading a query plan",
              body: [
                { type: "p", text: "Slow test-data queries slow the whole suite, and they often hint at a production performance problem. EXPLAIN shows how the database runs a query." },
                { type: "code", text: "EXPLAIN ANALYZE\nSELECT * FROM orders WHERE user_id = 42;" },
                { type: "list", items: [
                  "Seq Scan on a large table — reads every row; often means a missing index",
                  "Index Scan — uses an index; usually what you want for selective filters",
                  "Compare estimated vs actual rows — large gaps mean stale statistics",
                ]},
                { type: "p", text: "EXPLAIN ANALYZE is PostgreSQL syntax. MySQL 8 supports EXPLAIN ANALYZE too; SQL Server uses execution plans in its tooling." },
              ],
            },
            {
              title: "Running SQL from Playwright tests",
              body: [
                { type: "p", text: "Combine UI or API actions with database assertions in one test. This example uses the pg client for PostgreSQL (install with npm i -D pg); other databases have equivalent clients." },
                { type: "code", text: "// db-fixture.ts\nimport { test as base } from '@playwright/test';\nimport { Pool } from 'pg';\n\nexport const test = base.extend<{}, { db: Pool }>({\n  db: [async ({}, use) => {\n    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });\n    await use(pool);\n    await pool.end();\n  }, { scope: 'worker' }],\n});\nexport { expect } from '@playwright/test';" },
                { type: "code", text: "// signup.spec.ts\nimport { test, expect } from './db-fixture';\n\ntest('signup stores exactly one active user', async ({ page, db }) => {\n  const email = `qa+${Date.now()}@test.io`;\n\n  await page.goto('/signup');\n  await page.getByLabel('Email').fill(email);\n  await page.getByLabel('Password').fill('Str0ng!Pass');\n  await page.getByRole('button', { name: 'Create account' }).click();\n  await expect(page.getByText('Welcome')).toBeVisible();\n\n  // parameterized query — never build SQL with string concatenation\n  const { rows } = await db.query(\n    'SELECT status FROM users WHERE email = $1',\n    [email]\n  );\n  expect(rows).toHaveLength(1);\n  expect(rows[0].status).toBe('active');\n\n  await db.query('DELETE FROM users WHERE email = $1', [email]);\n});" },
                { type: "list", items: [
                  "Connection string comes from an environment variable pointing at a TEST database",
                  "Parameterized queries ($1, $2) prevent SQL injection and quoting bugs",
                  "Worker-scoped fixture: one pool per worker, closed when the worker finishes",
                ]},
              ],
            },
          ],
          quiz: [
            {
              question: "Why prefer NOT EXISTS over NOT IN with a subquery?",
              options: [
                "NOT IN is not valid SQL",
                "NOT IN returns no rows if the subquery contains a NULL",
                "NOT EXISTS is always slower",
                "They behave identically in every case",
              ],
              correct: 1,
              explanation: "If the subquery yields a NULL, NOT IN evaluates to unknown for every row and returns nothing. NOT EXISTS is NULL-safe.",
            },
            {
              question: "What does a CTE (WITH ...) mainly give you?",
              options: [
                "A permanent new table",
                "A named intermediate result that makes multi-step queries readable",
                "Automatic indexing",
                "A backup of the database",
              ],
              correct: 1,
              explanation: "A CTE names a sub-result for the duration of the query so complex logic reads step by step.",
            },
            {
              question: "Which window function gets the previous row's value within a partition?",
              options: ["ROW_NUMBER", "LEAD", "LAG", "COUNT"],
              correct: 2,
              explanation: "LAG returns the previous row's value in the window order; LEAD returns the next one.",
            },
            {
              question: "What does ROLLBACK do inside a transaction?",
              options: [
                "Saves all changes",
                "Undoes every change made since BEGIN on that connection",
                "Deletes the table",
                "Restarts the database",
              ],
              correct: 1,
              explanation: "ROLLBACK discards all uncommitted changes from that transaction. COMMIT would keep them.",
            },
            {
              question: "In a Playwright DB check, how should you pass the email into the query?",
              options: [
                "Concatenate it: \"... WHERE email = '\" + email + \"'\"",
                "As a parameter: db.query('... WHERE email = $1', [email])",
                "Hardcode a production email",
                "Skip the WHERE clause",
              ],
              correct: 1,
              explanation: "Parameterized queries prevent SQL injection and quoting errors. Never build SQL from string concatenation.",
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
