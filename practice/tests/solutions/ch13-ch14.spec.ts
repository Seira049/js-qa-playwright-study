import { test, expect } from "@playwright/test";

// Chapter 13, Try it #3
test("remember me starts unchecked", async ({ page }) => {
  await page.goto("/practice/login.html");
  await expect(page.getByLabel("Remember me")).not.toBeChecked();
});

// Chapter 14, Try it #1 and #2
test("dashboard locators", async ({ page }) => {
  await page.goto("/practice/dashboard.html");
  await expect(page.getByLabel("Sort by")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Sort by" })).toBeVisible();
  const cable = page.getByRole("listitem").filter({ hasText: "USB-C Cable" });
  await expect(cable.getByText("$9.50")).toBeVisible();
});

// Chapter 14: name matching is case-insensitive substring unless exact
test("role name matching", async ({ page }) => {
  await page.goto("/practice/login.html");
  await expect(page.getByRole("button", { name: "sign" })).toBeVisible();
  await expect(page.getByRole("button", { name: "sign", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
});
