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
