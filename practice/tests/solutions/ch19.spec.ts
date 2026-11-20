import { test, expect, type Page } from "@playwright/test";

async function signIn(page: Page) {
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
