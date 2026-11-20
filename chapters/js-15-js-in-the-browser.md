Chapter 1 explained that your test runs in Node.js while the page runs in the browser. Most of the time, Playwright's locators and assertions are all you need to work with the page. But sometimes you need to reach **into** the page: read a value from `localStorage`, check something a locator can't see, or understand what the page's own JavaScript is doing. This chapter covers the browser side of JavaScript that testers meet: the DOM, `page.evaluate`, browser storage, and `fetch`.

**In this chapter you will learn:**

- what the DOM is, and the handful of DOM APIs worth knowing
- running code inside the page with `page.evaluate` and `locator.evaluate`
- the closure trap: why test variables don't exist in the page
- what can and can't come back from the page
- reading `localStorage`, `sessionStorage`, and cookies
- how `fetch` works, and the fact that a 404 isn't an error to it
- when **not** to use any of this

> **About the examples:** the DOM exists only in a real page, and this book's playground runs code in a background worker without one. The `page.evaluate` examples are therefore read-only. They're all in the practice project (`practice/tests/browser-js.spec.ts`), and the outputs shown are from running them with Playwright 1.65.1. The `fetch` examples and the exercise **do** run in the playground, against the practice site's product data.

## 15.1 The DOM

When a browser loads a page, it turns the HTML into a tree of objects called the **DOM** (Document Object Model). The page's JavaScript reads and changes that tree, and the browser redraws the page to match. The DOM is reached through the global `document` object.

The DOM APIs you'll most often see:

| Code | Does |
|---|---|
| `document.querySelector(css)` | the **first** element matching a CSS selector, or `null` |
| `document.querySelectorAll(css)` | **all** matching elements (a `NodeList`, which you can turn into an array with `Array.from`) |
| `el.textContent` | all the text inside, **including hidden text** |
| `el.innerText` | the text **as displayed**, so hidden parts are left out |
| `el.getAttribute("href")` | an attribute's value |
| `input.value` / `checkbox.checked` | a form field's current value / state |
| `el.classList.contains("active")` | whether the element has a CSS class |
| `getComputedStyle(el).display` | the final CSS value after all styles are applied |

You've seen CSS selectors in Chapter 18 (`.price`, `#email`). Playwright's locators improve on `querySelector`: they wait, retry, and find elements the way users do.

## 15.2 page.evaluate: running code in the page

`page.evaluate(fn)` sends a function to the browser, runs it **inside the page**, and gives you back the result. Because it involves the browser, it returns a promise (Chapter 10).

```ts title="practice/tests/browser-js.spec.ts"
test("reading the DOM with page.evaluate", async ({ page }) => {
  const title = await page.evaluate(() => document.title);
  const names = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".products h2"), (h) => h.textContent),
  );
  console.log(title);
  console.log(names);
});
```

```output
Practice Shop – Dashboard
[ 'Laptop Stand', 'Mechanical Keyboard', 'USB-C Cable', 'Webcam' ]
```

`document` is available **inside** the function because the function runs in the page. In the test file itself, outside `evaluate`, there's no `document`.

### The closure trap

The function is sent to the browser as **text** and run there, so it can't see variables from your test. The Playwright docs: *"you cannot use variables from your test in the page and vice versa. Instead, you should pass them explicitly as an argument."*

```ts
const min = 30;
await page.evaluate(() => min);   // runs in the page, where min doesn't exist
```

```text
page.evaluate: ReferenceError: min is not defined
```

Pass values as the **second argument** to `evaluate`. The function receives them as its parameter:

```ts title="practice/tests/browser-js.spec.ts"
test("passing a value into the page", async ({ page }) => {
  const limit = 30;
  const expensive = await page.evaluate(
    (max) => Array.from(document.querySelectorAll(".price"), (p) => p.textContent ?? "")
      .filter((text) => Number(text.slice(1)) > max),
    limit,
  );
  console.log(expensive);
});
```

```output
[ '$34.99', '$89.00', '$49.99' ]
```

Only **one** argument can be passed. To send several values, pass an object or an array and destructure it: `page.evaluate(({ min, max }) => …, { min: 10, max: 50 })`.

### What can come back

The return value travels from the browser back to Node.js, so it must be **serialisable** data: strings, numbers, booleans, `null`, arrays, and plain objects. The API docs add that `NaN`, `Infinity`, `-Infinity`, and `-0` also survive the trip, and that a non-serialisable result comes back as `undefined`. A DOM element is not data: it belongs to the page. (When we returned `document.querySelector("h1")` with Playwright 1.65.1, the test received a placeholder string, `"ref: <Node>"`, not the element.) Return the information you need instead, such as its text or an attribute. If the function returns a promise (an `async` function), `evaluate` waits for it.

### locator.evaluate: start from an element

`locator.evaluate(fn)` finds the element first (with Playwright's usual waiting), then passes it to your function:

```ts title="practice/tests/browser-js.spec.ts"
test("locator.evaluate gets the element", async ({ page }) => {
  const info = await page.getByTestId("cart-count").evaluate((el) => ({
    tag: el.tagName,
    text: el.textContent,
    display: getComputedStyle(el).display,
  }));
  console.log(info);
});
```

```output
{ tag: 'SPAN', text: '0', display: 'inline' }
```

## 15.3 textContent vs innerText, and what your assertions see

The difference matters more than it looks:

```ts title="practice/tests/browser-js.spec.ts"
test("textContent vs innerText", async ({ page }) => {
  await page.setContent(`<p id="msg">Saved <span style="display:none">(debug: id=7)</span>successfully</p>`);
  const texts = await page.locator("#msg").evaluate((el) => [el.textContent, (el as HTMLElement).innerText]);
  console.log(texts);

  // toHaveText reads textContent by default, so hidden text is included:
  await expect(page.locator("#msg")).toHaveText("Saved (debug: id=7)successfully");
  // useInnerText makes it match what a user sees:
  await expect(page.locator("#msg")).toHaveText("Saved successfully", { useInnerText: true });
});
```

```output
[ 'Saved (debug: id=7)successfully', 'Saved successfully' ]
```

When we first wrote this test, `toHaveText("Saved successfully")` **failed**, with `Received: "Saved (debug: id=7)successfully"`. Playwright's `toHaveText` and `toContainText` read `textContent` unless you pass `useInnerText: true`. If an assertion fails with text the user can't see, hidden elements are the likely reason.

`(el as HTMLElement)` is a type assertion (Chapter 11): `evaluate` types `el` as a general element, and `innerText` exists only on HTML elements.

## 15.4 Browser storage and cookies

Web apps keep data in the browser between pages. Tests sometimes need to read it, for example to check that signing in stored a session, or that a "remember me" setting was saved.

| Storage | Lasts | Read it in a test with |
|---|---|---|
| `localStorage` | until removed, per site | `page.evaluate(() => localStorage.getItem("key"))` |
| `sessionStorage` | until the tab closes | `page.evaluate(() => sessionStorage.getItem("key"))` |
| cookies | until they expire; also sent to the server | `context.cookies()` (no `evaluate` needed) |

```ts title="practice/tests/browser-js.spec.ts"
test.use({ storageState: "playwright/.auth/user.json" });

test("storage and cookies", async ({ page, context }) => {
  const user = await page.evaluate(() => localStorage.getItem("practice-user"));
  console.log(user);
  console.log(await context.cookies());
});
```

```output
qa@test.io
[]
```

The practice site keeps the signed-in user in `localStorage` and sets no cookies. That's why Chapter 20's saved sign-in file contained `localStorage` but an empty `cookies` list. Storage values are always **strings**, like environment variables (Chapter 14). Apps that store objects use `JSON.stringify`, so read them back with `JSON.parse`.

To **set** values before the page's own scripts run, use `page.addInitScript(...)`, which runs a function in the page before each page load.

## 15.5 fetch: how pages talk to servers

`fetch(url)` is how a page's JavaScript requests data. It's also built into Node.js (available without a flag since version 18, and no longer experimental since 21). It returns a promise for a **Response**. These examples run in the playground, fetching the practice dashboard's product data:

```js run
const response = await fetch("practice/api/products.json");
console.log(response.ok, response.status);

const products = await response.json();
console.log(products.length, products[0].name);
```

```output
true 200
4 Laptop Stand
```

Reading the body is a **second** `await`: `response.json()` (or `.text()`) also returns a promise, because the body may still be downloading.

### A 404 isn't an error

`fetch` only rejects when there's **no response at all**: the network is down, the server can't be reached, or the browser blocks the request. An HTTP error status still counts as a response:

```js run
const missing = await fetch("practice/api/nope.json");
console.log(missing.ok, missing.status);   // no exception!

try {
  await fetch("http://localhost:1/unreachable");
} catch (err) {
  console.log(`${err.name}: ${err.message}`);
}
```

```output
false 404
TypeError: Failed to fetch
```

So always check `response.ok` (true for 200–299) before using the body. Forgetting to do that is a common bug in the code you'll be testing: an app that shows a blank page instead of an error message after a 500. That's exactly what the mocking tests in Chapter 22 look for. The network-error message differs between browsers, and Node.js says `fetch failed`, so check `err.name`, not the message.

### Sending data

```js
await fetch("/api/users", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Ana", email: "ana@test.io" }),
});
```

With `fetch`, you stringify the body and set the content type yourself. Playwright's `request` fixture (Chapter 21) does both for you, sends requests from Node.js without CORS restrictions, and is the right tool for API tests. Knowing `fetch` helps you read the application's code and understand what Playwright's network tools (Chapter 22) are intercepting.

## 15.6 When not to reach into the page

`page.evaluate` is powerful, but it skips everything that makes Playwright tests reliable:

| Instead of | Prefer | Because |
|---|---|---|
| `evaluate(() => document.querySelector("button").click())` | `page.getByRole("button", { name }).click()` | a real click checks the element is visible, enabled, and not covered (Chapter 19) |
| `evaluate(() => input.value = "x")` | `locator.fill("x")` | `fill` fires the input events the app listens for. Setting `.value` directly often doesn't. |
| reading text with `evaluate`, then `expect(...).toBe(...)` | `await expect(locator).toHaveText(...)` | the assertion retries; a one-time read can race the page (Chapter 19) |

Good uses of `evaluate`: reading storage, checking values that aren't visible on the page (a computed style, an app's global state), and setting up browser state that has no UI.

## Exercise

This exercise runs in the playground and fetches the real practice data.

```exercise ts title="Load and check product data"
type Product = { id: number; name: string; price: number; inStock: boolean };

// loadProducts(url): fetch the URL and return the parsed products.
// If the response isn't OK, THROW an Error whose message includes the status,
// e.g. "Request failed: 404".
async function loadProducts(url: string): Promise<Product[]> {
  const response = await fetch(url);
  return response.json();
}

// affordableInStock(products, maxPrice): names of products that are in stock
// AND cost at most maxPrice, sorted alphabetically.
function affordableInStock(products: Product[], maxPrice: number): string[] {
  return [];
}

const products = await loadProducts("practice/api/products.json");
console.log(affordableInStock(products, 50));
```

```checks
const __all = await loadProducts("practice/api/products.json");
__book.test("loads all 4 products", () => Array.isArray(__all) && __all.length === 4);
__book.test('affordableInStock(…, 50) is ["Laptop Stand", "USB-C Cable", "Webcam"]', () => JSON.stringify(affordableInStock(__all, 50)) === '["Laptop Stand","USB-C Cable","Webcam"]');
__book.test("affordableInStock(…, 20) is just the cable", () => JSON.stringify(affordableInStock(__all, 20)) === '["USB-C Cable"]');
__book.test("out-of-stock products are excluded even if cheap enough", () => !affordableInStock(__all, 1000).includes("Mechanical Keyboard"));
let __msg = "";
try { await loadProducts("practice/api/nope.json"); } catch (e) { __msg = e instanceof Error ? e.message : String(e); }
__book.test('a 404 throws an Error mentioning "404"', () => __msg.includes("404"));
```

```solution
type Product = { id: number; name: string; price: number; inStock: boolean };

async function loadProducts(url: string): Promise<Product[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function affordableInStock(products: Product[], maxPrice: number): string[] {
  return products
    .filter((p) => p.inStock && p.price <= maxPrice)
    .map((p) => p.name)
    .toSorted((a, b) => a.localeCompare(b));
}

const products = await loadProducts("practice/api/products.json");
console.log(affordableInStock(products, 50));
```

## Try it

> Run these in the `practice` folder (Chapter 17), then compare with the solutions.

1. On the dashboard, use `page.evaluate` to return the number of **disabled** buttons on the page. (Hint: `document.querySelectorAll("button:disabled")`.)
2. Sign in, then use `page.evaluate` to **remove** the `practice-user` item from `localStorage`, reload the page, and assert that it now says "Not signed in".

<details>
<summary>Show solutions</summary>

```ts
import { test, expect } from "@playwright/test";

test("count disabled buttons", async ({ page }) => {
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("listitem")).toHaveCount(4);
  const disabled = await page.evaluate(() => document.querySelectorAll("button:disabled").length);
  expect(disabled).toBe(1); // the out-of-stock keyboard
});

test("clearing storage signs the user out", async ({ page }) => {
  await page.goto("/practice/login.html");
  await page.getByLabel("Email").fill("qa@test.io");
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Signed in as qa@test.io")).toBeVisible();

  await page.evaluate(() => localStorage.removeItem("practice-user"));
  await page.reload();
  await expect(page.getByText("Not signed in")).toBeVisible();
});
```

</details>

## Quiz

```quiz
[
  {
    "q": "Why does `const id = 5; await page.evaluate(() => id);` fail?",
    "options": [
      "`evaluate` can't return numbers",
      "The function runs in the page, where the test's `id` variable doesn't exist; pass it as the second argument",
      "`id` is a reserved word",
      "It needs `async`"
    ],
    "answer": 1,
    "why": "The function is sent to the browser and run there. Use `page.evaluate((x) => x, id)`."
  },
  {
    "q": "What does `fetch` do when the server answers with status 404?",
    "options": [
      "Throws a TypeError",
      "Resolves with a response whose `ok` is `false` and `status` is 404",
      "Retries automatically",
      "Returns `undefined`"
    ],
    "answer": 1,
    "why": "fetch only rejects when there's no response at all. Check `response.ok`."
  },
  {
    "q": "An element contains a hidden `<span>`. What does `toHaveText` compare against by default?",
    "options": [
      "Only the visible text",
      "`textContent`, which includes the hidden text",
      "The HTML source",
      "The `title` attribute"
    ],
    "answer": 1,
    "why": "Pass `{ useInnerText: true }` to compare the text as displayed."
  },
  {
    "q": "Which is the most reliable way to click a button in a Playwright test?",
    "options": [
      "`page.evaluate(() => document.querySelector(\"button\").click())`",
      "`page.getByRole(\"button\", { name: \"Save\" }).click()`",
      "Setting `button.onclick` in `evaluate`",
      "Dispatching a custom event"
    ],
    "answer": 1,
    "why": "A Playwright click waits for the button to be visible, enabled, and not covered. A DOM click inside `evaluate` skips all of that."
  },
  {
    "q": "How do you read the page's cookies in a test?",
    "options": [
      "`page.evaluate(() => document.cookies)`",
      "`await context.cookies()`",
      "`localStorage.getItem(\"cookies\")`",
      "`process.env.COOKIES`"
    ],
    "answer": 1,
    "why": "The browser context gives you the cookies directly, including ones the page's JavaScript can't read (HttpOnly cookies)."
  }
]
```

## Sources

The `page.evaluate` examples and the "Try it" solutions are in the practice project and were run with Playwright Test 1.65.1 (Chromium 159). The `fetch` examples and the exercise were run in the playground.

- Playwright, *Evaluating JavaScript* (separate environments, passing arguments, serialisable values): [playwright.dev/docs/evaluating](https://playwright.dev/docs/evaluating)
- Playwright, *Locator.evaluate*, and *LocatorAssertions* (`useInnerText`): [playwright.dev/docs/api/class-locator#locator-evaluate](https://playwright.dev/docs/api/class-locator#locator-evaluate), [playwright.dev/docs/api/class-locatorassertions](https://playwright.dev/docs/api/class-locatorassertions)
- Playwright, *BrowserContext.cookies* and *Page.addInitScript*: [playwright.dev/docs/api/class-browsercontext#browser-context-cookies](https://playwright.dev/docs/api/class-browsercontext#browser-context-cookies), [playwright.dev/docs/api/class-page#page-add-init-script](https://playwright.dev/docs/api/class-page#page-add-init-script)
- MDN, *Introduction to the DOM*, *Document.querySelector*, *Node.textContent* (differences from `innerText`): [developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction), [developer.mozilla.org/en-US/docs/Web/API/Node/textContent](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)
- MDN, *Web Storage API*: [developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- MDN, *Using the Fetch API* and *fetch()* (rejects only on network errors; check `ok`): [developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- Node.js docs, *fetch* (no flag needed since v18.0.0, stable since v21.0.0): [nodejs.org/api/globals.html#fetch](https://nodejs.org/api/globals.html#fetch)
