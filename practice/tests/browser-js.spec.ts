import { test, expect } from "@playwright/test";

test.use({ storageState: "playwright/.auth/user.json" });

test.beforeEach(async ({ page }) => {
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("listitem")).toHaveCount(4);
});

test("reading the DOM with page.evaluate", async ({ page }) => {
  const title = await page.evaluate(() => document.title);
  const names = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".products h2"), (h) => h.textContent),
  );
  console.log(title);
  console.log(names);
});

test("passing a value into the page", async ({ page }) => {
  const limit = 30;
  const expensive = await page.evaluate(
    (max) => Array.from(document.querySelectorAll(".price"), (p) => p.textContent ?? "")
      .filter((text) => Number(text.slice(1)) > max),
    limit,
  );
  console.log(expensive);
});

test("locator.evaluate gets the element", async ({ page }) => {
  const info = await page.getByTestId("cart-count").evaluate((el) => ({
    tag: el.tagName,
    text: el.textContent,
    display: getComputedStyle(el).display,
  }));
  console.log(info);
});

test("storage and cookies", async ({ page, context }) => {
  const user = await page.evaluate(() => localStorage.getItem("practice-user"));
  console.log(user);
  console.log(await context.cookies());
});

test("textContent vs innerText", async ({ page }) => {
  await page.setContent(`<p id="msg">Saved <span style="display:none">(debug: id=7)</span>successfully</p>`);
  const texts = await page.locator("#msg").evaluate((el) => [el.textContent, (el as HTMLElement).innerText]);
  console.log(texts);
  // toHaveText reads textContent by default, so hidden text is included:
  await expect(page.locator("#msg")).toHaveText("Saved (debug: id=7)successfully");
  // useInnerText makes it match what a user sees:
  await expect(page.locator("#msg")).toHaveText("Saved successfully", { useInnerText: true });
});
