Real backends are slow, change, and rarely fail on demand. To test how a page handles **empty lists, server errors, network failures, and slow responses**, you need to control what the network returns. To test with **known data**, you need to create it reliably and clean it up afterwards. This chapter covers both, step by step.

**In this chapter you will learn:**

- when to mock, and when not to
- intercepting requests with `page.route`, and answering them with `route.fulfill`
- simulating errors, network failures, and a slow response
- changing a real response before the page sees it
- waiting for, and checking, a request the page sends
- recording and replaying traffic with HAR files
- creating test data through the API in a fixture, with automatic cleanup

The dashboard in the practice project loads its products with `fetch("api/products.json")`. All tests are in `practice/tests/mocking.spec.ts` and `practice/tests/test-data.spec.ts`, run with Playwright 1.65.0.

## 18.1 Mock or not?

| Mock when you want to… | Don't mock when you want to… |
|---|---|
| test UI states that are hard to trigger: empty, error, loading | prove the frontend and backend work **together** |
| make a test independent of an unstable or shared backend | test the API itself (Chapter 17) |
| test edge cases, such as very long names or 1,000 items | catch a backend change that breaks the UI |

A balanced suite has a few end-to-end tests against the real backend, and more focused tests that mock the network for specific UI behaviour. A mocked test only proves the UI works **with the data you gave it**, so keep your mock data close to what the real API returns.

## 18.2 Intercepting a request: page.route

`page.route(urlPattern, handler)` intercepts every matching request. The handler decides what happens. **Register the route before the page makes the request**, so usually before `page.goto`:

```ts title="practice/tests/mocking.spec.ts"
const PRODUCTS = "**/practice/api/products.json";

test("show mocked products", async ({ page }) => {
  await page.route(PRODUCTS, async (route) => {
    await route.fulfill({ json: [{ id: 1, name: "Mocked Mug", price: 5, inStock: true }] });
  });
  await page.goto("/practice/dashboard.html");

  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Mocked Mug" })).toBeVisible();
});
```

- The URL pattern is a *glob*: `**` matches any characters, including `/`. You can also pass a regular expression, or a function that receives a `URL`.
- `route.fulfill({ json })` answers the request with that data as JSON (status 200 unless you set `status`). The real server is never contacted.

### Empty state

```ts title="practice/tests/mocking.spec.ts"
test("empty state", async ({ page }) => {
  await page.route(PRODUCTS, (route) => route.fulfill({ json: [] }));
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("status")).toHaveText("No products found");
});
```

## 18.3 Simulating failures

A **server error**: `fulfill` with an error status:

```ts title="practice/tests/mocking.spec.ts"
test("server error shows a friendly message", async ({ page }) => {
  await page.route(PRODUCTS, (route) => route.fulfill({ status: 500, body: "Internal error" }));
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("status")).toHaveText("Could not load products. Please try again.");
});
```

A **network failure** (no response at all, as when the user goes offline): `abort`:

```ts title="practice/tests/mocking.spec.ts"
test("network failure shows the same message", async ({ page }) => {
  await page.route(PRODUCTS, (route) => route.abort());
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("status")).toHaveText("Could not load products. Please try again.");
});
```

These are worth testing for every important request. Real apps often show a blank screen or a spinner that never stops in exactly these cases.

### A slow response, without waiting for time

To see a loading state, hold the request until the test has checked it. A promise acts as a gate (Chapter 10), so there's no fixed wait:

```ts title="practice/tests/mocking.spec.ts"
test("loading state", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });

  await page.route(PRODUCTS, async (route) => {
    await gate;              // hold the response until the test says so
    await route.continue();  // then let the real request through
  });

  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("status")).toHaveText("Loading products…");
  release();
  await expect(page.getByRole("listitem")).toHaveCount(4);
});
```

`route.continue()` sends the request on to the real server unchanged. `let release!: () => void;` uses `!` to tell TypeScript the variable will be assigned before use (it's set inside the promise's constructor, which runs immediately).

## 18.4 Changing a real response

`route.fetch()` performs the real request and gives you the response. You can change it, then `fulfill` with your version:

```ts title="practice/tests/mocking.spec.ts"
test("modify the real response", async ({ page }) => {
  await page.route(PRODUCTS, async (route) => {
    const response = await route.fetch();          // the real server response
    const products = await response.json();
    for (const p of products) p.inStock = false;   // change it
    await route.fulfill({ response, json: products });
  });
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("button", { name: "Out of stock" })).toHaveCount(4);
});
```

Passing `response` keeps the real status and headers, and `json` replaces the body. This keeps the test close to real data while still forcing the case you want.

## 18.5 Checking what the page sent

Sometimes the thing to test is the **request**: did clicking "Save" send the right data? `page.waitForResponse` (and `page.waitForRequest`) returns a promise for the next matching response. **Start waiting before** the action that triggers it, then `await` it after:

```ts title="practice/tests/mocking.spec.ts"
test("wait for the request the page sends", async ({ page }) => {
  const responsePromise = page.waitForResponse(PRODUCTS);   // start listening first
  await page.goto("/practice/dashboard.html");               // this triggers the request
  const response = await responsePromise;

  expect(response.status()).toBe(200);
  expect(response.request().method()).toBe("GET");
  expect(await response.json()).toHaveLength(4);
});
```

If you call `waitForResponse` **after** the action, the response may already have arrived, and the wait would hang until it times out. For a form, `response.request().postDataJSON()` gives you the body the page sent.

## 18.6 Recording and replaying with HAR

A **HAR** file (HTTP Archive) is a recording of network traffic. `page.routeFromHAR` can **record** real responses into a file, and later **replay** them, so tests get realistic data without the real backend.

Record (the `update: true` option writes the file):

```ts
await page.routeFromHAR("hars/products.har", { url: "**/api/products.json", update: true });
await page.goto("/practice/dashboard.html");
```

Replay (without `update`, matching requests are answered from the file):

```ts
await page.routeFromHAR("hars/products.har", { url: "**/api/products.json" });
await page.goto("/practice/dashboard.html");
```

When we recorded the practice dashboard, Playwright wrote `products.har` plus a separate `.json` file for the response body. Commit HAR files only when they contain no secrets or personal data. Recordings of real systems often contain both, so check before you share them.

## 18.7 Test data through the API

For tests against a real backend, the most reliable data is data the test **creates itself**, through the API, which is much faster than the UI. Put it in a fixture (Chapter 16), so the cleanup always runs:

```ts title="practice/fixtures/data.ts"
import { test as base, expect, type APIRequestContext } from "@playwright/test";

type User = { id: number; name: string; email: string; role: string };

async function authHeaders(request: APIRequestContext) {
  const login = await request.post("/api/login", {
    data: { email: "qa@test.io", password: "correct-password" },
  });
  expect(login.ok()).toBeTruthy();
  const { token } = await login.json();
  return { Authorization: `Bearer ${token}` };
}

export const test = base.extend<{ tempUser: User }>({
  tempUser: async ({ request }, use) => {
    // Setup: create a unique user through the API
    const headers = await authHeaders(request);
    const response = await request.post("/api/users", {
      headers,
      data: { name: "Temp User", email: `temp-${crypto.randomUUID()}@test.io` },
    });
    expect(response.status()).toBe(201);
    const user: User = await response.json();

    await use(user);

    // Teardown: runs after the test, even if it failed
    await request.delete(`/api/users/${user.id}`, { headers });
  },
});

export { expect };
```

```ts title="practice/tests/test-data.spec.ts"
import { test, expect } from "../fixtures/data";

test("a temporary user exists while the test runs", async ({ tempUser, request }) => {
  const response = await request.get(`/api/users/${tempUser.id}`);
  await expect(response).toBeOK();
  expect(await response.json()).toEqual(tempUser);
});
```

We checked the cleanup: after this test ran against the practice server, `GET /api/users` listed only the two original users.

Why this pattern works well:

- **Unique data**: `crypto.randomUUID()` (built into Node.js) gives every run its own email, so parallel tests never collide.
- **Guaranteed cleanup**: teardown after `use()` runs even when the test fails, so failed runs don't leave junk behind.
- **On demand**: only tests that ask for `tempUser` create one.

If your team can't create data through an API, the alternatives are seeding a database directly (Appendix C shows SQL in tests), or using fixed accounts that tests only *read* and never change.

## Try it

1. Mock the products with a product whose name is 200 characters long, and assert that it appears.
2. Mock a `404` response for the products, and check which message the dashboard shows.
3. Make the products request fail only the **first** time and succeed the second, then reload the page and assert the products appear. (Hint: a counter in the handler, and `route.continue()`.)

<details>
<summary>Show solutions</summary>

```ts
import { test, expect } from "@playwright/test";

const PRODUCTS = "**/practice/api/products.json";

test("very long product name", async ({ page }) => {
  const longName = "Very long name ".repeat(14).trim().slice(0, 200);
  await page.route(PRODUCTS, (route) =>
    route.fulfill({ json: [{ id: 1, name: longName, price: 1, inStock: true }] }));
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(longName);
});

test("404 shows the error message", async ({ page }) => {
  await page.route(PRODUCTS, (route) => route.fulfill({ status: 404, json: { error: "Not found" } }));
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("status")).toHaveText("Could not load products. Please try again.");
});

test("recovers after a failed first load", async ({ page }) => {
  let calls = 0;
  await page.route(PRODUCTS, async (route) => {
    calls++;
    if (calls === 1) await route.fulfill({ status: 503 });
    else await route.continue();
  });
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("status")).toHaveText("Could not load products. Please try again.");
  await page.reload();
  await expect(page.getByRole("listitem")).toHaveCount(4);
});
```

</details>

## Quiz

```quiz
[
  {
    "q": "When should you call `page.route(...)`?",
    "options": [
      "After the page has loaded",
      "Before the page makes the request, usually before `page.goto`",
      "Only inside `beforeAll`",
      "It doesn't matter"
    ],
    "answer": 1,
    "why": "A route only affects requests made after it's registered."
  },
  {
    "q": "What's the difference between `route.fulfill({ status: 500 })` and `route.abort()`?",
    "options": [
      "None",
      "`fulfill` returns an HTTP error response; `abort` makes the request fail with no response, like a network failure",
      "`abort` returns status 0",
      "`fulfill` only works for GET"
    ],
    "answer": 1,
    "why": "They test different failures: a server that answers with an error, and a request that never gets an answer."
  },
  {
    "q": "Why start `page.waitForResponse(...)` before clicking the button that triggers the request?",
    "options": [
      "It's faster",
      "If the response arrives before you start waiting, the wait misses it and times out",
      "It's required by TypeScript",
      "It cancels the request"
    ],
    "answer": 1,
    "why": "Create the promise first, perform the action, then `await` the promise."
  },
  {
    "q": "What does `route.fetch()` let you do?",
    "options": [
      "Block the request",
      "Get the real response, so you can change it before fulfilling",
      "Retry the request",
      "Save a HAR file"
    ],
    "answer": 1,
    "why": "Fetch the real response, modify it, then `route.fulfill({ response, json })`."
  },
  {
    "q": "Why create test data in a fixture rather than in the test body?",
    "options": [
      "Fixtures are faster",
      "The teardown after `use()` runs even when the test fails, so data is always cleaned up",
      "Tests can't call the API",
      "It's the only way to use `request`"
    ],
    "answer": 1,
    "why": "Cleanup in the test body is skipped when an assertion fails earlier. Fixture teardown always runs."
  }
]
```

## Sources

Every test shown, including the solutions, was run with Playwright Test 1.65.0 against the practice project. The HAR recording and replay were also run, and the fixture's cleanup was confirmed by checking the server's data afterwards.

- Playwright, *Mock APIs* (`page.route`, `fulfill`, modifying responses, HAR): [playwright.dev/docs/mock](https://playwright.dev/docs/mock)
- Playwright, *Network* (`abort`, `continue`, glob patterns, `waitForResponse`): [playwright.dev/docs/network](https://playwright.dev/docs/network)
- Playwright, *Route* API: [playwright.dev/docs/api/class-route](https://playwright.dev/docs/api/class-route)
- Playwright, *Page.routeFromHAR*: [playwright.dev/docs/api/class-page#page-route-from-har](https://playwright.dev/docs/api/class-page#page-route-from-har)
- Playwright, *Fixtures* (teardown after `use`): [playwright.dev/docs/test-fixtures](https://playwright.dev/docs/test-fixtures)
- MDN, *crypto.randomUUID*: [developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
