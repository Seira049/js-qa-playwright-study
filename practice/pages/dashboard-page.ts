import { type Page, type Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly products: Locator;
  readonly cartCount: Locator;
  readonly sortBy: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Dashboard" });
    this.products = page.getByRole("listitem");
    this.cartCount = page.getByTestId("cart-count");
    this.sortBy = page.getByLabel("Sort by");
  }

  async goto() {
    await this.page.goto("/practice/dashboard.html");
  }

  product(name: string): Locator {
    return this.products.filter({ hasText: name });
  }

  async addToCart(name: string) {
    await this.product(name).getByRole("button", { name: "Add to cart" }).click();
  }
}
