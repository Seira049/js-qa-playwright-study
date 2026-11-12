import { test, expect } from "../fixtures/test";

test.describe("login", () => {
  test("valid user reaches the dashboard", { tag: "@smoke" }, async ({ loginPage, page }) => {
    await loginPage.signIn("qa@test.io", "correct-password");
    await expect(page).toHaveURL(/dashboard/);
  });

  test("wrong password shows an error", async ({ loginPage }) => {
    await loginPage.signIn("qa@test.io", "wrong");
    await expect(loginPage.error).toHaveText("Invalid email or password");
  });
});

test.describe("dashboard (signed in)", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("shows the signed-in user", { tag: "@smoke" }, async ({ dashboardPage, page }) => {
    await expect(dashboardPage.heading).toBeVisible();
    await expect(page.getByText("Signed in as qa@test.io")).toBeVisible();
  });

  test("adding a product updates the cart", async ({ dashboardPage }) => {
    await test.step("add two products", async () => {
      await dashboardPage.addToCart("Webcam");
      await dashboardPage.addToCart("USB-C Cable");
    });
    await expect(dashboardPage.cartCount).toHaveText("2");
  });
});

test.describe("isolation", () => {
  test("a fresh context is not signed in", async ({ dashboardPage, page }) => {
    await expect(page.getByText("Not signed in")).toBeVisible();
  });
});
