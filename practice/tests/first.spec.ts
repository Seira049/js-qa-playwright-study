import { test, expect } from "@playwright/test";

test("login page has a heading", async ({ page }) => {
  await page.goto("/practice/login.html");
  await expect(page).toHaveTitle(/Sign in/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
