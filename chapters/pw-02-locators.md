A **locator** describes how to find an element on the page. Good locators are the biggest single factor in whether a test suite stays reliable as the application changes. This chapter covers Playwright's built-in locators, the order the Playwright docs recommend them in, and how to narrow down to exactly the element you mean.

**In this chapter you will learn:**

- the built-in locators: `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, `getByTestId`, and more
- why the Playwright docs recommend user-facing locators over CSS and XPath
- that locators are *lazy* and *strict*, and what a "strict mode violation" means
- how to filter and chain locators to target one item in a list
- how to read every matching element's text

All examples run against the practice project (`practice/tests/locators.spec.ts`), with Playwright 1.65.0.

## 14.1 The built-in locators

The Playwright docs list these as *"the recommended built-in locators"*:

| Locator | Finds elements by | Example |
|---|---|---|
| `page.getByRole(role, { name })` | their accessibility role and accessible name | `getByRole("button", { name: "Sign in" })` |
| `page.getByText(text)` | their text content | `getByText("Signed in as qa@test.io")` |
| `page.getByLabel(text)` | the text of an associated `<label>` | `getByLabel("Email")` |
| `page.getByPlaceholder(text)` | an input's placeholder | `getByPlaceholder("Search products")` |
| `page.getByAltText(text)` | an image's alt text | `getByAltText("Company logo")` |
| `page.getByTitle(text)` | the `title` attribute | `getByTitle("Close")` |
| `page.getByTestId(id)` | the `data-testid` attribute | `getByTestId("cart-count")` |

Here they are on the practice dashboard:

```ts title="practice/tests/locators.spec.ts"
test("built-in locators", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Signed in as qa@test.io")).toBeVisible();
  await expect(page.getByPlaceholder("Search products")).toBeEmpty();
  await expect(page.getByTestId("cart-count")).toHaveText("0");
  await expect(page.getByRole("listitem")).toHaveCount(4);
});
```

(The file's `beforeEach` signs in first. Hooks are covered in Chapter 16.)

### getByRole: the first choice

The docs say: *"We recommend prioritizing role locators to locate elements, as it is the closest way to how users and assistive technology perceive the page."*

Every element has a **role**: a `<button>` is a `button`, an `<h1>`–`<h6>` is a `heading`, an `<a href>` is a `link`, an `<input type="checkbox">` is a `checkbox`, an `<li>` is a `listitem`, and so on. The **accessible name** is usually its visible text, or its label for form fields.

```ts
page.getByRole("button", { name: "Sign in" });
page.getByRole("heading", { name: "Dashboard" });
page.getByRole("heading", { level: 2 });            // every <h2>
page.getByRole("checkbox", { name: "Remember me" });
page.getByRole("link", { name: /forgot password/i }); // a regex also works
```

By default, `name` matches **case-insensitively and as a substring**. Add `exact: true` to require the exact text: `getByRole("button", { name: "Sign in", exact: true })`.

A bonus: if `getByRole` can't find a button by its name, a real user using a screen reader probably can't either. Your test has found an accessibility problem.

### getByLabel for form fields

Form inputs are best found by their label, the same way a user reads the form:

```ts
await page.getByLabel("Email").fill("qa@test.io");
await page.getByLabel("Password").fill("correct-password");
```

This works when the `<label>` is linked to the input (with `for="email"` and `id="email"`, or by wrapping the input), or with `aria-label`.

### getByText for non-interactive content

The docs recommend text locators *"to find non interactive elements like `div`, `span`, `p`"*, and role locators for interactive ones such as buttons, links, and inputs.

### getByTestId when nothing user-facing fits

`data-testid` attributes are an explicit contract between developers and testers: they don't change when the wording or styling changes. Use them when an element has no good role or text, like the cart count badge. The attribute name can be changed in the config (`use: { testIdAttribute: "data-qa" }`).

### What about CSS and XPath?

You can still use `page.locator("css or xpath")`. But the Playwright docs say: *"CSS and XPath are not recommended as the DOM can often change leading to non resilient tests."* A class like `.btn-primary-v2` can change in any redesign, while "the Sign in button" usually doesn't. Use `page.locator(...)` as a last resort, and prefer simple, stable selectors when you do.

## 14.2 Locators are lazy and strict

**Lazy:** creating a locator doesn't touch the page. It's a *description* of how to find the element. Playwright looks for the element each time you **use** the locator (to click, fill, or assert). That's why you can create locators in a page object's constructor (Chapter 9), before the page has even loaded.

**Strict:** an action such as `click()` must match **exactly one** element. If it matches several, Playwright refuses to guess. The practice dashboard has an "Add to cart" button on every product, so this fails:

```ts
await page.getByRole("button", { name: "Add to cart" }).click();
```

```text
locator.click: Error: strict mode violation: getByRole('button', { name: 'Add to cart' }) resolved to 3 elements:
    1) <button type="button">Add to cart</button> aka getByRole('listitem').filter({ hasText: 'Laptop Stand$34.99 Add to cart' }).getByRole('button')
```

The error lists the matches and suggests a locator for each one. (Three, not four: the out-of-stock product's button says "Out of stock".)

You *can* pick one with `.first()`, `.last()`, or `.nth(index)`, but the docs call these **"not recommended"**, because *"when your page changes, Playwright may click on an element you did not intend."* Make the locator more specific instead.

## 14.3 Filtering and chaining

### filter: narrow a list

`filter({ hasText })` keeps only the elements that contain some text. `filter({ has })` keeps only those that contain another locator:

```ts title="practice/tests/locators.spec.ts"
test("filter and chain", async ({ page }) => {
  const webcam = page.getByRole("listitem").filter({ hasText: "Webcam" });
  await webcam.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  const keyboard = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Mechanical Keyboard" }) });
  await expect(keyboard.getByRole("button")).toBeDisabled();
  await expect(keyboard.getByRole("button")).toHaveText("Out of stock");
});
```

There are also `hasNotText` and `hasNot` for the opposite.

### Chaining: search inside an element

Calling a locator method **on another locator** searches only inside it: `webcam.getByRole("button", …)` finds the button **in the Webcam row**. This "find the row, then the thing in the row" pattern is how you handle tables, lists, and cards.

## 14.4 Reading many elements

To check the text of every matching element at once, use `allTextContents()` (or `allInnerTexts()`), which returns an array of strings:

```ts title="practice/tests/locators.spec.ts"
test("allTextContents and sorting", async ({ page }) => {
  await page.getByLabel("Sort by").selectOption("price-asc");

  const prices = await page.locator(".price").allTextContents();
  console.log(prices); // [ '$9.50', '$34.99', '$49.99', '$89.00' ]

  const numbers = prices.map((p) => Number(p.replace("$", "")));
  expect(numbers).toEqual(numbers.toSorted((a, b) => a - b));

  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "USB-C Cable", "Laptop Stand", "Webcam", "Mechanical Keyboard",
  ]);
});
```

This test uses half of Part 1: `map` and arrow functions (Chapters 5–6), `replace` and `Number` (Chapters 2 and 4), and the numeric sort compare function (Chapter 5). It also shows the difference between two kinds of assertion:

- `expect(numbers).toEqual(...)` checks a value you've already read. It checks **once**.
- `await expect(locator).toHaveText([...])` checks the page and **retries** until it matches (Chapter 15). When you can, prefer this kind.

`.price` is a CSS class locator. It's fine here because there's no user-facing alternative for a price, but it's the kind of locator to keep to a minimum.

## Try it

> Run these in the `practice` folder. Compare with the solutions afterwards.

1. On the dashboard, write a locator for the **Sort by** dropdown without using CSS.
2. Write a locator for the **price** inside the "USB-C Cable" item, and assert it says `$9.50`.
3. Use codegen (`npx playwright codegen http://localhost:3000/practice/dashboard.html`) and hover over elements to see which locators it suggests.

<details>
<summary>Show solutions</summary>

```ts
// 1. Its <label for="sort"> links it to the label text
page.getByLabel("Sort by");
// or by role: a <select> has the role "combobox"
page.getByRole("combobox", { name: "Sort by" });

// 2. Find the item, then search inside it
const cable = page.getByRole("listitem").filter({ hasText: "USB-C Cable" });
await expect(cable.getByText("$9.50")).toBeVisible();
```

</details>

## Quiz

```quiz
[
  {
    "q": "According to the Playwright docs, which locator should you usually try first for buttons, links, and inputs?",
    "options": ["`page.locator(\"css\")`", "XPath", "`getByRole`", "`getByTestId`"],
    "answer": 2,
    "why": "The docs recommend prioritising role locators, because they match how users and assistive technology see the page."
  },
  {
    "q": "A page has five \"Delete\" buttons, one per row. What happens with `page.getByRole(\"button\", { name: \"Delete\" }).click()`?",
    "options": [
      "It clicks the first one",
      "It clicks all five",
      "It throws a strict mode violation, because the locator matches more than one element",
      "It does nothing"
    ],
    "answer": 2,
    "why": "Actions require exactly one match. Narrow the locator, e.g. find the row first and then the button inside it."
  },
  {
    "q": "What does `page.getByRole(\"listitem\").filter({ hasText: \"Webcam\" })` match?",
    "options": [
      "Every list item",
      "Only list items whose text contains \"Webcam\"",
      "Only the text \"Webcam\"",
      "Nothing until it's awaited"
    ],
    "answer": 1,
    "why": "`filter({ hasText })` keeps only the matching elements. You can then chain another locator to search inside them."
  },
  {
    "q": "When does Playwright look for the element described by a locator?",
    "options": [
      "When the locator is created",
      "Each time the locator is used for an action or assertion",
      "Only once, then it caches the element",
      "When the page loads"
    ],
    "answer": 1,
    "why": "Locators are lazy. They're resolved every time you use them, so they still work after the page re-renders."
  },
  {
    "q": "Why do the Playwright docs advise against `.first()` and `.nth()`?",
    "options": [
      "They're slow",
      "If the page changes, they may silently target a different element than intended",
      "They don't work with `getByRole`",
      "They're deprecated"
    ],
    "answer": 1,
    "why": "Position-based picks break quietly when the order changes. A locator that uniquely describes the element is safer."
  }
]
```

## Sources

Every test shown was run with Playwright Test 1.65.0 against the practice project. The strict-mode error is the real output.

- Playwright, *Locators* (recommended locators, quotes on role and text locators and on CSS/XPath, filtering, strictness, `first`/`nth`): [playwright.dev/docs/locators](https://playwright.dev/docs/locators)
- Playwright, *Other locators* (CSS and XPath): [playwright.dev/docs/other-locators](https://playwright.dev/docs/other-locators)
- Playwright, *Locator* API (`filter`, `allTextContents`): [playwright.dev/docs/api/class-locator](https://playwright.dev/docs/api/class-locator)
- Playwright, *Best Practices* (prefer user-facing attributes): [playwright.dev/docs/best-practices](https://playwright.dev/docs/best-practices)
- MDN, *WAI-ARIA roles*: [developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles)
