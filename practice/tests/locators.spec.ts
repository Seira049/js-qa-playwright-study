import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/practice/login.html");
  await page.getByLabel("Email").fill("qa@test.io");
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
});

test("built-in locators", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Signed in as qa@test.io")).toBeVisible();
  await expect(page.getByPlaceholder("Search products")).toBeEmpty();
  await expect(page.getByTestId("cart-count")).toHaveText("0");
  await expect(page.getByRole("listitem")).toHaveCount(4);
});

test("filter and chain", async ({ page }) => {
  const webcam = page.getByRole("listitem").filter({ hasText: "Webcam" });
  await webcam.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  const keyboard = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Mechanical Keyboard" }) });
  await expect(keyboard.getByRole("button")).toBeDisabled();
  await expect(keyboard.getByRole("button")).toHaveText("Out of stock");
});

test("strictness violation", async ({ page }) => {
  let message = "";
  try {
    await page.getByRole("button", { name: "Add to cart" }).click({ timeout: 2000 });
  } catch (e) {
    message = (e as Error).message;
  }
  expect(message).toContain("strict mode violation");
  console.log(message.split("\n").slice(0, 2).join("\n"));
});

test("allTextContents and sorting", async ({ page }) => {
  await page.getByLabel("Sort by").selectOption("price-asc");
  const prices = await page.locator(".price").allTextContents();
  console.log(prices);
  const numbers = prices.map((p) => Number(p.replace("$", "")));
  expect(numbers).toEqual(numbers.toSorted((a, b) => a - b));
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["USB-C Cable", "Laptop Stand", "Webcam", "Mechanical Keyboard"]);
});
