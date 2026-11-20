import { test, expect } from "@playwright/test";

const PRODUCTS = "**/practice/api/products.json";

test("very long product name", async ({ page }) => {
  const longName = "Very long name ".repeat(14).trim().slice(0, 200);
  await page.route(PRODUCTS, (route) =>
    route.fulfill({ json: [{ id: 1, name: longName, price: 1, inStock: true }] }));
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(longName);
});

test("404 shows the error message", async ({ page }) => {
  await page.route(PRODUCTS, (route) => route.fulfill({ status: 404, json: { error: "Not found" } }));
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("status")).toHaveText("Could not load products. Please try again.");
});

test("recovers after a failed first load", async ({ page }) => {
  let calls = 0;
  await page.route(PRODUCTS, async (route) => {
    calls++;
    if (calls === 1) await route.fulfill({ status: 503 });
    else await route.continue();
  });
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("status")).toHaveText("Could not load products. Please try again.");
  await page.reload();
  await expect(page.getByRole("listitem")).toHaveCount(4);
});
