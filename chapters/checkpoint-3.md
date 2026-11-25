This project pulls Part 2 to Part 4 together. You'll write a **smoke suite**: a small set of tests that checks the most important things in the practice shop still work. Teams run a smoke suite after every change, so it has to be fast, reliable, and good at spotting real problems.

Here's the twist. The practice project can serve **five broken copies** of the shop, each with one realistic bug. Your suite must **pass** on the working shop and **fail** on every broken copy. The checker tells you which bugs your suite missed, but not how to catch them: that's your job as the tester.

> **This project runs on your computer**, in the `practice/` folder from Chapter 17, because it uses real browsers. The book can't check it for you, so there's no XP button: the checker below is your proof. Mark the project complete when you get 6/6.

## The brief

Write tests in `practice/tests/checkpoint/smoke.spec.ts` that cover:

1. **Signing in** with `qa@test.io` / `correct-password` reaches the dashboard and shows who is signed in.
2. **A wrong password** shows the error message.
3. **Searching** the dashboard shows only the matching products.
4. **Adding products** to the cart updates the cart count.
5. **Sorting by price** (low to high) puts the products in the right order.

Rules, from Part 2:

- Use user-facing locators (Chapter 18), and web-first assertions that retry (Chapter 19). No `waitForTimeout`.
- Keep each test independent (Chapter 20). The page objects in `practice/pages/` are there to use.
- Give each test a name that says what it proves.

## Check your suite

From the `practice` folder:

```bash
npm run checkpoint
```

It runs your suite six times: once against the working shop and once against each broken copy, each on its own port. A finished suite prints:

```text
Checking tests/checkpoint

🏪 working shop           ✅ passes
🐞 valid-login-rejected   ✅ caught
🐞 no-error-message       ✅ caught
🐞 cart-stuck             ✅ caught
🐞 search-ignored         ✅ caught
🐞 price-sort-reversed    ✅ caught

6/6 🏁 Checkpoint complete!
```

A suite that only tests signing in gets 3/6, with `❌ missed: your suite passed on this broken shop` next to the three bugs it can't see. The starter file contains only a `test.fixme`, so it reports `❌ no tests found` until you write real tests.

You can also open one broken copy yourself to see the bug: run `BUG=cart-stuck npm run serve` (on Windows PowerShell: `$env:BUG = "cart-stuck"; npm run serve`), then visit http://localhost:3000/practice/login.html.

## Hints

<details>
<summary>Show hints (try first!)</summary>

- Read each bug's name, then ask: *which test would notice that?*
- For the cart, add **two** products and check for `2`. A counter stuck at `1` would fool a test that adds only one.
- For search, check the **whole list** of headings with `toHaveText([...])` (Chapter 18), not just that the match is visible. A broken search still shows the match, along with everything else.
- For sorting, check the full order too.
- For the error message, check its **text**, not just that the alert element exists.

</details>

## One possible solution

<details>
<summary>Show the solution</summary>

This is `practice/tests/solutions/checkpoint-3.spec.ts`. It gets 6/6 with Playwright 1.65.1. Check it with `npm run checkpoint -- tests/solutions/checkpoint-3.spec.ts`.

```ts title="practice/tests/solutions/checkpoint-3.spec.ts"
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { DashboardPage } from "../../pages/dashboard-page";

test.describe("login", () => {
  test.beforeEach(async ({ page }) => {
    await new LoginPage(page).goto();
  });

  test("a valid user reaches the dashboard", async ({ page }) => {
    await new LoginPage(page).signIn("qa@test.io", "correct-password");
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText("Signed in as qa@test.io")).toBeVisible();
  });

  test("a wrong password shows an error", async ({ page }) => {
    const login = new LoginPage(page);
    await login.signIn("qa@test.io", "wrong");
    await expect(login.error).toHaveText("Invalid email or password");
  });
});

test.describe("dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await new DashboardPage(page).goto();
    await expect(page.getByRole("listitem")).toHaveCount(4);
  });

  test("search shows only matching products", async ({ page }) => {
    await page.getByRole("searchbox").fill("cable");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["USB-C Cable"]);
  });

  test("adding two products counts two", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.addToCart("Webcam");
    await dashboard.addToCart("USB-C Cable");
    await expect(dashboard.cartCount).toHaveText("2");
  });

  test("price sort puts the cheapest first", async ({ page }) => {
    await page.getByLabel("Sort by").selectOption("price-asc");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "USB-C Cable", "Laptop Stand", "Webcam", "Mechanical Keyboard",
    ]);
  });
});
```

</details>

## What you practised

- choosing what a smoke suite must cover, and what would prove each feature works
- locators, actions, and assertions that retry (Chapters 18 and 19)
- `describe`, `beforeEach`, and page objects (Chapter 20)
- thinking like a tester: a check that passes on broken software isn't checking anything
