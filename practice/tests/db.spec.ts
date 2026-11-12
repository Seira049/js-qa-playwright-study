import { test, expect } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

// A local SQLite copy of the book's sample shop database, built fresh for each test.
function openShopDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../../chapters/sql/shop.sql", import.meta.url), "utf8"));
  return db;
}

test("an order's total matches its line items", async () => {
  const db = openShopDb();
  const row = db
    .prepare(
      `SELECT ROUND(SUM(quantity * unit_price), 2) AS total
       FROM order_items WHERE order_id = ?`,
    )
    .get(101) as { total: number };
  expect(row.total).toBe(53.99);
  db.close();
});

test("parameters keep user input out of the SQL text", async () => {
  const db = openShopDb();
  const evilInput = "x' OR '1'='1";
  const rows = db.prepare("SELECT id FROM customers WHERE email = ?").all(evilInput);
  expect(rows).toHaveLength(0);
  db.close();
});
