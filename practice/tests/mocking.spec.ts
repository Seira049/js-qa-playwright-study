import { test, expect } from "@playwright/test";

const PRODUCTS = "**/practice/api/products.json";

test("show mocked products", async ({ page }) => {
  await page.route(PRODUCTS, async (route) => {
    await route.fulfill({ json: [{ id: 1, name: "Mocked Mug", price: 5, inStock: true }] });
  });
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Mocked Mug" })).toBeVisible();
});

test("empty state", async ({ page }) => {
  await page.route(PRODUCTS, (route) => route.fulfill({ json: [] }));
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("status")).toHaveText("No products found");
});

test("server error shows a friendly message", async ({ page }) => {
  await page.route(PRODUCTS, (route) => route.fulfill({ status: 500, body: "Internal error" }));
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("status")).toHaveText("Could not load products. Please try again.");
});

test("network failure shows the same message", async ({ page }) => {
  await page.route(PRODUCTS, (route) => route.abort());
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("status")).toHaveText("Could not load products. Please try again.");
});

test("loading state", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route(PRODUCTS, async (route) => {
    await gate;                  // hold the response until the test says so
    await route.continue();
  });
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("status")).toHaveText("Loading products…");
  release();
  await expect(page.getByRole("listitem")).toHaveCount(4);
});

test("modify the real response", async ({ page }) => {
  await page.route(PRODUCTS, async (route) => {
    const response = await route.fetch();          // the real server response
    const products = await response.json();
    for (const p of products) p.inStock = false;   // change it
    await route.fulfill({ response, json: products });
  });
  await page.goto("/practice/dashboard.html");
  await expect(page.getByRole("button", { name: "Out of stock" })).toHaveCount(4);
});

test("wait for the request the page sends", async ({ page }) => {
  const responsePromise = page.waitForResponse(PRODUCTS);
  await page.goto("/practice/dashboard.html");
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(response.request().method()).toBe("GET");
  const body = await response.json();
  expect(body).toHaveLength(4);
});
