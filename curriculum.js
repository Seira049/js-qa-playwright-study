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
      ],
    },
    {
      name: "SQL for QA",
      modules: [
        {
          id: "sql-for-qa",
          title: "SQL for Data Verification",
          level: "Beginner → Intermediate",
          duration: "1-2 weeks",
          summary: "Verify what your tests actually did by querying the database: SELECT, WHERE, JOIN, aggregates, and the data checks QA engineers run most.",
          lessons: [
            {
              title: "Why QA needs SQL",
              body: [
                { type: "p", text: "The UI and API can lie — they might show a success message while the database saved the wrong thing. SQL lets you verify data at the source." },
                { type: "list", items: [
                  "Confirm a record was created/updated/deleted correctly",
                  "Set up precise test data before a run",
                  "Investigate why a test failed by inspecting real rows",
                  "Validate reports and aggregates against raw data",
                ]},
              ],
            },
            {
              title: "SELECT, WHERE, ORDER BY",
              body: [
                { type: "p", text: "SELECT reads rows. WHERE filters them. ORDER BY sorts. This is 80% of what QA uses." },
                { type: "code", text: "SELECT id, name, email, status\nFROM users\nWHERE status = 'active'\nORDER BY created_at DESC;" },
                { type: "h", text: "Useful filters" },
                { type: "code", text: "WHERE email LIKE '%@test.io'      -- pattern match\nWHERE created_at >= '2026-01-01'  -- date range\nWHERE role IN ('admin', 'qa')     -- any of a set\nWHERE verified IS NULL;           -- missing value" },
              ],
            },
            {
              title: "Counting and aggregates",
              body: [
                { type: "p", text: "Aggregates verify totals — great for checking that a bulk action affected the right number of rows." },
                { type: "code", text: "SELECT COUNT(*) FROM orders WHERE status = 'paid';\n\nSELECT role, COUNT(*) AS total\nFROM users\nGROUP BY role\nHAVING COUNT(*) > 5;" },
                { type: "p", text: "COUNT, SUM, AVG, MIN, MAX are the common ones. GROUP BY buckets rows; HAVING filters those buckets." },
              ],
            },
            {
              title: "JOINs: combining tables",
              body: [
                { type: "p", text: "Data is split across tables. A JOIN links them on a shared key — e.g. each order belongs to a user." },
                { type: "code", text: "SELECT u.name, o.id AS order_id, o.total\nFROM users u\nJOIN orders o ON o.user_id = u.id\nWHERE o.status = 'paid';" },
                { type: "list", items: [
                  "INNER JOIN — only rows with a match in both tables",
                  "LEFT JOIN — all rows from the left table, matched or not (NULLs where no match)",
                ]},
                { type: "p", text: "A LEFT JOIN helps find gaps, e.g. users with no orders:" },
                { type: "code", text: "SELECT u.id, u.name\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nWHERE o.id IS NULL;" },
              ],
            },
            {
              title: "Verifying test results with SQL",
              body: [
                { type: "p", text: "After a test action, query the DB to confirm the real effect — then clean up." },
                { type: "code", text: "-- after registering a user through the UI/API:\nSELECT COUNT(*) FROM users WHERE email = 'newuser@test.io';\n-- expect exactly 1\n\n-- after a 'soft delete':\nSELECT status FROM users WHERE id = 42;\n-- expect 'deleted', not a missing row\n\n-- clean up seeded data:\nDELETE FROM users WHERE email LIKE '%@test.io';" },
                { type: "p", text: "Caution: run write queries (DELETE/UPDATE) only against test databases, always with a WHERE clause, and prefer a transaction you can roll back." },
              ],
            },
          ],
          quiz: [
            {
              question: "Why does a QA engineer query the database directly?",
              options: [
                "To replace all UI tests",
                "To verify data at the source, since the UI/API can show success while storing wrong data",
                "To make tests slower",
                "SQL is required by Playwright",
              ],
              correct: 1,
              explanation: "The UI can display success while the DB saved something wrong. SQL confirms the actual stored state.",
            },
            {
              question: "Which clause filters rows in a SELECT?",
              options: ["ORDER BY", "WHERE", "GROUP BY", "JOIN"],
              correct: 1,
              explanation: "WHERE filters which rows are returned. ORDER BY sorts, GROUP BY buckets, JOIN combines tables.",
            },
            {
              question: "What does COUNT(*) return?",
              options: [
                "The sum of a numeric column",
                "The number of rows matching the query",
                "The first row",
                "The column names",
              ],
              correct: 1,
              explanation: "COUNT(*) returns how many rows match — useful to assert a bulk action touched the expected number of rows.",
            },
            {
              question: "To list all users even if they have no orders, you would use…",
              options: ["INNER JOIN", "LEFT JOIN", "WHERE only", "GROUP BY"],
              correct: 1,
              explanation: "A LEFT JOIN keeps every row from the left (users) table, filling NULLs where there is no matching order.",
            },
            {
              question: "What is the safest practice when running a DELETE during a test?",
              options: [
                "Run it on production to be realistic",
                "Always include a WHERE clause and use a test database",
                "Delete the whole table first",
                "Skip the WHERE clause for speed",
              ],
              correct: 1,
              explanation: "Always scope writes with WHERE, run against a test DB, and prefer a transaction you can roll back.",
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
