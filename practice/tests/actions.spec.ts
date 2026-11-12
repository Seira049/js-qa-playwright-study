import { test, expect } from "@playwright/test";

test("invalid login shows an error", async ({ page }) => {
  await page.goto("/practice/login.html");
  await page.getByLabel("Email").fill("qa@test.io");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password");
  await expect(page).toHaveURL(/login/);
});

test("empty form", async ({ page }) => {
  await page.goto("/practice/login.html");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Email and password are required");
});

test("check, select, type, press, and dialogs", async ({ page }) => {
  await page.goto("/practice/login.html");
  await page.getByLabel("Remember me").check();
  await expect(page.getByLabel("Remember me")).toBeChecked();
  await page.getByLabel("Email").pressSequentially("qa@test.io");
  await page.getByLabel("Password").fill("correct-password");
  await page.getByLabel("Password").press("Enter");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByLabel("In stock only").check();
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await page.getByRole("searchbox").fill("cable");
  await expect(page.getByRole("status")).toHaveText("1 product");
  await page.getByRole("searchbox").clear();
  await page.getByRole("listitem").filter({ hasText: "Webcam" }).getByRole("button").click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  // Dialogs are dismissed by default -> cart stays 1
  await page.getByRole("button", { name: "Clear cart" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear cart" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("0");
  await expect(page.getByLabel("Sort by")).toHaveValue("name");
  await expect(page.locator(".products li").first()).toContainText("Laptop");
});

test("soft assertions and non-retrying", async ({ page }) => {
  await page.goto("/practice/login.html");
  const title = await page.title();
  expect(title).toBe("Practice Shop – Sign in");
  await expect.soft(page.getByRole("heading")).toHaveText("Sign in");
  expect(await page.getByLabel("Email").inputValue()).toBe("");
});
