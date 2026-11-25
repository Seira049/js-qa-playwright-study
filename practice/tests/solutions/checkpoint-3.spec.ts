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
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["USB-C Cable", "Laptop Stand", "Webcam", "Mechanical Keyboard"]);
  });
});
