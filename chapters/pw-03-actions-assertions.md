Once you can find elements, you need to **do things** to them (click, type, choose) and **check the result**. This chapter covers Playwright's actions, the *auto-waiting* that makes them reliable, and *web-first assertions*, which retry until the page is in the state you expect. Together, these two features are why Playwright tests rarely need manual waits.

**In this chapter you will learn:**

- the common actions: `click`, `fill`, `press`, `check`, `selectOption`, and more
- what Playwright checks before every action (*actionability*)
- web-first assertions, and why they must be awaited
- the difference between retrying and non-retrying assertions
- timeouts, soft assertions, and negating with `.not`
- how browser dialogs (`confirm`, `alert`) are handled
- why `waitForTimeout` is a trap

All examples run against the practice project (`practice/tests/actions.spec.ts`), with Playwright 1.65.0.

## 15.1 Actions

| Action | Does |
|---|---|
| `click()` | click the element (`dblclick()` double-clicks) |
| `fill(text)` | replace the input's value with `text` |
| `clear()` | empty the input |
| `pressSequentially(text)` | type one key at a time |
| `press("Enter")` | press a key, or a combination like `"Control+A"` |
| `check()` / `uncheck()` | tick or untick a checkbox or radio button |
| `selectOption(value)` | choose an option in a `<select>` |
| `hover()` | move the mouse over the element |
| `setInputFiles(path)` | choose a file in an `<input type="file">` |

Here's one practice test that uses most of them:

```ts title="practice/tests/actions.spec.ts"
test("check, select, type, press, and dialogs", async ({ page }) => {
  await page.goto("/practice/login.html");
  await page.getByLabel("Remember me").check();
  await expect(page.getByLabel("Remember me")).toBeChecked();

  await page.getByLabel("Email").pressSequentially("qa@test.io");
  await page.getByLabel("Password").fill("correct-password");
  await page.getByLabel("Password").press("Enter");     // submits the form
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByLabel("In stock only").check();
  await expect(page.getByRole("listitem")).toHaveCount(3);

  await page.getByRole("searchbox").fill("cable");
  await expect(page.getByRole("status")).toHaveText("1 product");
  await page.getByRole("searchbox").clear();
  // ...the dialog part is in section 15.5
});
```

**`fill` or `pressSequentially`?** Use `fill`. The Playwright API docs say: *"In most cases, you should use `locator.fill()` instead. You only need to press keys one by one if there is special keyboard handling on the page"*, such as an autocomplete that reacts to each key.

## 15.2 Auto-waiting: actionability checks

Before an action, Playwright waits until the element is ready for it. The docs call these **actionability checks**:

| Check | Meaning | Required for |
|---|---|---|
| **Visible** | has a non-empty size, and isn't `visibility: hidden` | click, fill, check, hover, … |
| **Stable** | has kept the same position for two animation frames (not animating) | click, check, hover, … |
| **Receives events** | isn't covered by another element, such as an overlay | click, check, hover, … |
| **Enabled** | isn't `disabled` | click, fill, check, … |
| **Editable** | is enabled and not read-only | fill, clear |

The practice login waits 300 ms before it navigates, to simulate a server. The tests never mention that delay. `click()` waits for the button to be ready, and the next assertion waits for the result. This is what makes manual `sleep`s unnecessary.

If an element never becomes actionable, the action eventually fails with an error explaining which check didn't pass. By default actions have **no timeout of their own**, so the limit is the **test timeout** (30 seconds by default). You can set `use: { actionTimeout: 10_000 }` in the config to give actions a shorter limit.

## 15.3 Web-first assertions

`await expect(locator).toBe…()` assertions **retry**: they keep re-checking the page until the condition is true, or until the assertion timeout runs out (**5 seconds** by default).

```ts title="practice/tests/actions.spec.ts"
test("invalid login shows an error", async ({ page }) => {
  await page.goto("/practice/login.html");
  await page.getByLabel("Email").fill("qa@test.io");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert")).toHaveText("Invalid email or password");
  await expect(page).toHaveURL(/login/);
});
```

The error message appears 300 ms after the click, and `toHaveText` simply waits for it.

The ones you'll use most:

| Assertion | Passes when the element… |
|---|---|
| `toBeVisible()` / `toBeHidden()` | is shown / isn't shown |
| `toHaveText(text)` | has exactly this text (a string, a regex, or an array for a list) |
| `toContainText(text)` | contains this text |
| `toHaveValue(value)` | is an input with this value |
| `toBeChecked()` | is a checked checkbox or radio |
| `toBeEnabled()` / `toBeDisabled()` | can / can't be used |
| `toBeEmpty()` | has no text, or is an empty input |
| `toHaveCount(n)` | the locator matches exactly `n` elements |
| `toHaveAttribute(name, value)` | has this attribute value |

And on the page: `await expect(page).toHaveURL(…)` and `await expect(page).toHaveTitle(…)`.

**Text comparison detail:** when you pass a **string** to `toHaveText` or `toContainText`, Playwright normalises whitespace and line breaks first. When you pass a **regular expression**, the text is matched exactly as it is (Chapter 4).

### Always await them

A web-first assertion returns a promise. Without `await`, the test doesn't wait for it. Chapter 10 showed that Playwright 1.65.0 fails such a test with `Error: Test ended.`, which points at the wrong cause. Use the `@typescript-eslint/no-floating-promises` lint rule to catch it.

### Negating with .not

```ts
await expect(page.getByLabel("Remember me")).not.toBeChecked();
await expect(page.getByRole("alert")).not.toBeVisible();
```

`.not` retries too: it waits until the condition is **false**.

## 15.4 Retrying vs non-retrying assertions

`expect(value)` on an ordinary value (not a locator or page) checks **once**, immediately:

```ts title="practice/tests/actions.spec.ts"
test("soft assertions and non-retrying", async ({ page }) => {
  await page.goto("/practice/login.html");

  const title = await page.title();                 // read once...
  expect(title).toBe("Practice Shop – Sign in");    // ...check once (no await needed)

  await expect.soft(page.getByRole("heading")).toHaveText("Sign in");
  expect(await page.getByLabel("Email").inputValue()).toBe("");
});
```

These are the generic matchers: `toBe`, `toEqual`, `toContain`, `toBeGreaterThan`, `toBeTruthy`, `toBeCloseTo`, and so on (Chapter 3). The Playwright docs warn that they *"do not auto-retry"*, and that because pages update asynchronously, *"using non-retrying assertions can lead to a flaky test."*

The rule of thumb: **if you're checking the page, use `await expect(locator)` or `await expect(page)`.** Reading a value first and then checking it races against the page. Use `expect(value)` for data you already have, such as an API response body, or values you've calculated.

For a value that changes over time but isn't a locator, Playwright offers `expect.poll(() => …)` and `expect(async () => { … }).toPass()`, which retry a function.

### Soft assertions

Normally a failed assertion **stops** the test. `expect.soft(…)` records the failure and lets the test continue, so one run can report several problems (for example, every wrong field on a profile page). The test is still marked as failed at the end.

## 15.5 Dialogs

`alert`, `confirm`, and `prompt` dialogs block the page. The Playwright docs say: *"By default, dialogs are auto-dismissed by Playwright."* For a `confirm`, dismissing means clicking **Cancel**.

To answer a dialog, register a handler **before** the action that opens it:

```ts title="practice/tests/actions.spec.ts (continued)"
await page.getByRole("listitem").filter({ hasText: "Webcam" }).getByRole("button").click();
await expect(page.getByTestId("cart-count")).toHaveText("1");

// No handler: the confirm is dismissed, so the cart is NOT cleared
await page.getByRole("button", { name: "Clear cart" }).click();
await expect(page.getByTestId("cart-count")).toHaveText("1");

// Accept the next dialog
page.once("dialog", (dialog) => dialog.accept());
await page.getByRole("button", { name: "Clear cart" }).click();
await expect(page.getByTestId("cart-count")).toHaveText("0");
```

`page.once` handles only the **next** dialog. `page.on("dialog", …)` handles every dialog until you remove it. The handler gets a `dialog` object with `message()`, `type()`, `accept()`, and `dismiss()`.

## 15.6 Don't wait for time

`page.waitForTimeout(ms)` pauses for a fixed time. The API docs say it *"should only be used for debugging. Tests using the timer in production are going to be flaky."* A fixed wait is either too short on a slow day (the test fails) or too long every other day (the suite is slow). Wait for something meaningful instead:

| Instead of | Wait for |
|---|---|
| `await page.waitForTimeout(2000)` before checking a message | `await expect(message).toBeVisible()` |
| waiting after a click for the next page | `await expect(page).toHaveURL(/dashboard/)` |
| waiting for data to load | `await expect(rows).toHaveCount(4)`, or `page.waitForResponse(…)` (Chapter 18) |

## Try it

> Write these in a new file in `practice/tests/`, then compare with the solutions.

1. On the login page, submit the form with **only** an email. Assert that the error says `Email and password are required`.
2. Sign in, choose **Price: high to low**, and assert that the first product heading is `Mechanical Keyboard`.
3. Sign in, click **Clear cart**, and assert the dialog's message is `Remove all items from the cart?`. (Hint: read `dialog.message()` in the handler and store it in a variable.)

<details>
<summary>Show solutions</summary>

```ts
import { test, expect } from "@playwright/test";

async function signIn(page) {
  await page.goto("/practice/login.html");
  await page.getByLabel("Email").fill("qa@test.io");
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test("email only shows the required error", async ({ page }) => {
  await page.goto("/practice/login.html");
  await page.getByLabel("Email").fill("qa@test.io");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Email and password are required");
});

test("sort by price, high to low", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Sort by").selectOption("price-desc");
  await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText("Mechanical Keyboard");
});

test("clear cart asks for confirmation", async ({ page }) => {
  await signIn(page);
  let message = "";
  page.once("dialog", async (dialog) => {
    message = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Clear cart" }).click();
  expect(message).toBe("Remove all items from the cart?");
});
```

In TypeScript, give the helper's parameter a type: `import { type Page } from "@playwright/test";` then `async function signIn(page: Page)`. Using `.first()` in solution 2 is fine here, because the order is exactly what's being tested.

</details>

## Quiz

```quiz
[
  {
    "q": "A button becomes enabled half a second after the page loads. What does `await button.click()` do?",
    "options": [
      "Fails immediately because the button is disabled",
      "Waits until the button is enabled (and visible, stable, not covered), then clicks",
      "Clicks the disabled button",
      "Waits exactly 5 seconds"
    ],
    "answer": 1,
    "why": "Actions auto-wait for the actionability checks before acting."
  },
  {
    "q": "What's the difference between `await expect(locator).toHaveText(\"Done\")` and `expect(await locator.textContent()).toBe(\"Done\")`?",
    "options": [
      "None",
      "The first retries until the text matches or times out; the second reads once and checks once, so it can race with the page",
      "The second is more reliable",
      "The first doesn't need await"
    ],
    "answer": 1,
    "why": "Web-first assertions retry. Reading a value and checking it once is a common cause of flaky tests."
  },
  {
    "q": "What is the default timeout for a web-first assertion?",
    "options": ["No timeout", "1 second", "5 seconds", "30 seconds"],
    "answer": 2,
    "why": "Assertions default to 5 seconds. The whole test defaults to 30 seconds."
  },
  {
    "q": "A test clicks a button that opens a `confirm()` dialog, and has no dialog handler. What happens?",
    "options": [
      "The test hangs",
      "Playwright accepts the dialog",
      "Playwright dismisses the dialog automatically",
      "The test fails"
    ],
    "answer": 2,
    "why": "Dialogs are auto-dismissed by default. Register `page.once(\"dialog\", …)` before the click to accept it."
  },
  {
    "q": "What does `expect.soft(...)` do when it fails?",
    "options": [
      "Ignores the failure",
      "Records the failure but lets the test continue; the test is still marked failed",
      "Retries forever",
      "Skips the test"
    ],
    "answer": 1,
    "why": "Soft assertions let one run report several failures."
  },
  {
    "q": "Why avoid `await page.waitForTimeout(3000)` in tests?",
    "options": [
      "It doesn't exist",
      "Fixed waits are too short on slow runs and too long on fast ones; the docs say it's for debugging only",
      "It only works in Chromium",
      "It's slower than `sleep`"
    ],
    "answer": 1,
    "why": "Wait for a real signal instead, such as an element appearing, a URL change, or a network response."
  }
]
```

## Sources

Every test shown, including the solutions, was run with Playwright Test 1.65.0 against the practice project.

- Playwright, *Actions*: [playwright.dev/docs/input](https://playwright.dev/docs/input)
- Playwright, *Auto-waiting* (actionability checks): [playwright.dev/docs/actionability](https://playwright.dev/docs/actionability)
- Playwright, *Assertions* (5-second default, auto-retrying vs non-retrying, soft assertions, `expect.poll`, `toPass`): [playwright.dev/docs/test-assertions](https://playwright.dev/docs/test-assertions)
- Playwright, *LocatorAssertions* (whitespace normalisation for strings): [playwright.dev/docs/api/class-locatorassertions](https://playwright.dev/docs/api/class-locatorassertions)
- Playwright, *Dialogs* (auto-dismissed by default): [playwright.dev/docs/dialogs](https://playwright.dev/docs/dialogs)
- Playwright, *Timeouts* (action and navigation timeouts have no limit by default): [playwright.dev/docs/test-timeouts](https://playwright.dev/docs/test-timeouts)
- Playwright API, *Locator.pressSequentially* and *Page.waitForTimeout* (notes quoted above): [playwright.dev/docs/api/class-locator#locator-press-sequentially](https://playwright.dev/docs/api/class-locator#locator-press-sequentially), [playwright.dev/docs/api/class-page#page-wait-for-timeout](https://playwright.dev/docs/api/class-page#page-wait-for-timeout)
