import { test as base, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { DashboardPage } from "../../pages/dashboard-page";

class DashboardWithCount extends DashboardPage {
  async cartCountValue(): Promise<number> {
    return Number(await this.cartCount.textContent());
  }
}

const test = base.extend<{ signedInDashboard: DashboardWithCount }>({
  signedInDashboard: async ({ page }, use) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn("qa@test.io", "correct-password");
    await use(new DashboardWithCount(page));
  },
});

test("cart count as a number", { tag: "@negative" }, async ({ signedInDashboard }) => {
  await signedInDashboard.addToCart("Webcam");
  await expect(signedInDashboard.cartCount).toHaveText("1");
  expect(await signedInDashboard.cartCountValue()).toBe(1);
});
