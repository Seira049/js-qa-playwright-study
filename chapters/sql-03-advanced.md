This last appendix covers the SQL that makes complex checks readable, plus how to run SQL from a Playwright test **safely**. It assumes Appendices A and B.

> **Optional appendix.** Every **▶ Run** uses a fresh copy of the sample shop database (SQLite 3.54.1 via sql.js).

**In this chapter you will learn:**

- subqueries, and `EXISTS` / `NOT EXISTS`
- CTEs (`WITH`): building a query in readable steps
- window functions: ranking and running totals
- reading a query plan
- running SQL from a Playwright test, with parameters, and why string-building queries is dangerous

## C.1 Subqueries

A **subquery** is a query inside another query. It can produce a single value:

```sql run
SELECT name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products)
ORDER BY price DESC;
```

```output
┌─────────────────────┬───────┐
│ name                │ price │
├─────────────────────┼───────┤
│ Mechanical Keyboard │ 89    │
│ Webcam              │ 49.99 │
└─────────────────────┴───────┘
(2 rows)
```

Or a list, used with `IN`:

```sql run
SELECT name FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE status = 'paid')
ORDER BY name;
```

```output
┌───────────┐
│ name      │
├───────────┤
│ Ana Lopez │
│ Ben Ito   │
└───────────┘
(2 rows)
```

### EXISTS and NOT EXISTS

`EXISTS (subquery)` is true when the subquery returns at least one row. It reads naturally for "has any" and "has none" checks:

```sql run
SELECT p.name
FROM products AS p
WHERE NOT EXISTS (
  SELECT 1 FROM order_items AS oi WHERE oi.product_id = p.id
);
```

```output
┌──────┐
│ name │
├──────┤
└──────┘
(0 rows)
```

Every product has been ordered at least once, so this returns no rows. (`SELECT 1` is a convention: `EXISTS` only cares whether a row exists, not what's in it.)

> **A NULL trap with NOT IN:** `WHERE id NOT IN (SELECT customer_id FROM orders)` returns **no rows at all** here, because order 106 has a `NULL` `customer_id`, and comparing with `NULL` is "unknown" (Appendix A). `NOT EXISTS` doesn't have this problem. Try it:

```sql run
SELECT COUNT(*) AS not_in_result FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);

SELECT COUNT(*) AS not_exists_result FROM customers AS c
WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id);
```

```output
┌───────────────┐
│ not_in_result │
├───────────────┤
│ 0             │
└───────────────┘
(1 row)

┌───────────────────┐
│ not_exists_result │
├───────────────────┤
│ 1                 │
└───────────────────┘
(1 row)
```

## C.2 CTEs: readable steps

A **CTE** (*common table expression*) names a subquery with `WITH`, so a complex query reads top to bottom like a series of steps:

```sql run
WITH order_totals AS (
  SELECT order_id, SUM(quantity * unit_price) AS total
  FROM order_items
  GROUP BY order_id
),
paid_orders AS (
  SELECT o.id, o.customer_id, t.total
  FROM orders AS o
  JOIN order_totals AS t ON t.order_id = o.id
  WHERE o.status IN ('paid', 'shipped')
)
SELECT customer_id, COUNT(*) AS orders, ROUND(SUM(total), 2) AS spent
FROM paid_orders
GROUP BY customer_id
ORDER BY spent DESC;
```

```output
┌─────────────┬────────┬────────┐
│ customer_id │ orders │ spent  │
├─────────────┼────────┼────────┤
│ 2           │ 1      │ 117.5  │
│ 1           │ 2      │ 103.98 │
│ NULL        │ 1      │ 34.99  │
└─────────────┴────────┴────────┘
(3 rows)
```

Each step can be tested on its own: run just the `order_totals` query and check it before building on it. Note the `NULL` customer: order 106 was paid but has no customer, which is the integrity problem from Appendix B showing up again.

## C.3 Window functions

A **window function** calculates across a set of related rows **without** collapsing them into one row the way `GROUP BY` does. `OVER (...)` defines the window.

### Ranking

```sql run
SELECT name, category, price,
  ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rank_in_category
FROM products
ORDER BY category, rank_in_category;
```

```output
┌─────────────────────┬─────────────┬───────┬──────────────────┐
│ name                │ category    │ price │ rank_in_category │
├─────────────────────┼─────────────┼───────┼──────────────────┤
│ Laptop Stand        │ accessories │ 34.99 │ 1                │
│ USB-C Cable         │ accessories │ 9.5   │ 2                │
│ Desk Lamp           │ office      │ 25    │ 1                │
│ Mechanical Keyboard │ peripherals │ 89    │ 1                │
│ Webcam              │ peripherals │ 49.99 │ 2                │
└─────────────────────┴─────────────┴───────┴──────────────────┘
(5 rows)
```

`PARTITION BY category` restarts the numbering for each category. A classic use is "the latest order per customer": number each customer's orders by date, then keep row 1:

```sql run
WITH ranked AS (
  SELECT customer_id, id, ordered_at,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY ordered_at DESC) AS rn
  FROM orders
  WHERE customer_id IS NOT NULL
)
SELECT customer_id, id AS latest_order, ordered_at FROM ranked WHERE rn = 1 ORDER BY customer_id;
```

```output
┌─────────────┬──────────────┬────────────┐
│ customer_id │ latest_order │ ordered_at │
├─────────────┼──────────────┼────────────┤
│ 1           │ 102          │ 2026-03-08 │
│ 2           │ 103          │ 2026-03-09 │
│ 3           │ 104          │ 2026-03-10 │
│ 5           │ 105          │ 2026-03-16 │
└─────────────┴──────────────┴────────────┘
(4 rows)
```

### Running totals

An aggregate with `OVER (ORDER BY ...)` becomes a running total. Here, `COUNT(*)` counts the orders up to and including each date:

```sql run
SELECT id, ordered_at,
  COUNT(*) OVER (ORDER BY ordered_at) AS orders_so_far
FROM orders
ORDER BY ordered_at;
```

```output
┌─────┬────────────┬───────────────┐
│ id  │ ordered_at │ orders_so_far │
├─────┼────────────┼───────────────┤
│ 101 │ 2026-03-01 │ 1             │
│ 102 │ 2026-03-08 │ 2             │
│ 103 │ 2026-03-09 │ 3             │
│ 104 │ 2026-03-10 │ 4             │
│ 105 │ 2026-03-16 │ 5             │
│ 106 │ 2026-03-17 │ 6             │
└─────┴────────────┴───────────────┘
(6 rows)
```

## C.4 Reading a query plan

A slow query in a test environment is often a missing **index**. Each database can show how it plans to run a query. In SQLite, that's `EXPLAIN QUERY PLAN`:

```sql run
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE customer_id = 1;
```

```output
┌────┬────────┬─────────┬─────────────┐
│ id │ parent │ notused │ detail      │
├────┼────────┼─────────┼─────────────┤
│ 2  │ 0      │ 216     │ SCAN orders │
└────┴────────┴─────────┴─────────────┘
(1 row)
```

`SCAN orders` means SQLite reads **every row**. After adding an index on the column it filters by, the plan changes to a `SEARCH`:

```sql run
CREATE INDEX idx_orders_customer ON orders(customer_id);
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE customer_id = 1;
```

```output
┌────┬────────┬─────────┬───────────────────────────────────────────────────────────────┐
│ id │ parent │ notused │ detail                                                        │
├────┼────────┼─────────┼───────────────────────────────────────────────────────────────┤
│ 3  │ 0      │ 61      │ SEARCH orders USING INDEX idx_orders_customer (customer_id=?) │
└────┴────────┴─────────┴───────────────────────────────────────────────────────────────┘
(1 row)
```

On a table this small it makes no difference, but on millions of rows it does. Other databases use different commands and output: `EXPLAIN` / `EXPLAIN ANALYZE` in PostgreSQL and MySQL, and execution plans in SQL Server. The idea is the same: look for full scans of large tables.

## C.5 SQL in Playwright tests

Sometimes a test needs to check the database directly. For example, after placing an order through the UI, check that the order row exists with the right total.

### Use parameters, never string-building

Never build SQL by joining strings with values in them:

```ts
// ❌ DANGEROUS: SQL injection
const sql = `SELECT id FROM customers WHERE email = '${email}'`;
```

If `email` is `x' OR '1'='1`, the query becomes `... WHERE email = 'x' OR '1'='1'`, which matches **every** row. In a real app, this is the *SQL injection* vulnerability. In a test, it causes confusing failures, and it can damage data. Instead, use **parameters** (placeholders such as `?` or `$1`): the driver sends the value separately from the SQL text, so it's always treated as data.

### A runnable example with node:sqlite

Node.js includes a SQLite module, `node:sqlite` (added in v22.5.0, and marked "release candidate" in the current Node.js docs). The practice project uses it to check the sample database from a Playwright test:

```ts title="practice/tests/db.spec.ts"
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
    .prepare(`SELECT ROUND(SUM(quantity * unit_price), 2) AS total
              FROM order_items WHERE order_id = ?`)
    .get(101) as { total: number };
  expect(row.total).toBe(53.99);
  db.close();
});

test("parameters keep user input out of the SQL text", async () => {
  const db = openShopDb();
  const evilInput = "x' OR '1'='1";
  const rows = db.prepare("SELECT id FROM customers WHERE email = ?").all(evilInput);
  expect(rows).toHaveLength(0); // treated as a plain (non-matching) email
  db.close();
});
```

Both tests pass with Playwright 1.65.0 on Node.js v24.18.0.

### Real databases

For PostgreSQL, MySQL, or SQL Server, install the driver your team uses (for example `pg` for PostgreSQL or `mysql2` for MySQL). The pattern is the same:

- open a connection in a **fixture**, and close it in the teardown after `use()` (Chapter 16)
- read the connection details from **environment variables**, never from code (`process.env.DB_URL`)
- **always pass values as parameters**
- connect with a database user that has only the permissions the tests need, and only to a **test** database

### Keeping database tests independent

- Create the rows a test needs, with unique values, and delete them afterwards (the same rules as Chapter 17).
- Or run each test's changes inside a transaction and `ROLLBACK` at the end, if your application and driver allow it.
- Don't assume exact row counts in shared environments. Check for the specific rows your test created.

## Exercise

```exercise sql title="Top product per category"
-- For each category, return the single most expensive product.
-- Columns: category, name, price. Sort by category.
-- (Hint: ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ... DESC) in a CTE.)
SELECT category, name, price FROM products;
```

```checks
┌─────────────┬─────────────────────┬───────┐
│ category    │ name                │ price │
├─────────────┼─────────────────────┼───────┤
│ accessories │ Laptop Stand        │ 34.99 │
│ office      │ Desk Lamp           │ 25    │
│ peripherals │ Mechanical Keyboard │ 89    │
└─────────────┴─────────────────────┴───────┘
(3 rows)
```

```solution
WITH ranked AS (
  SELECT category, name, price,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn
  FROM products
)
SELECT category, name, price FROM ranked WHERE rn = 1 ORDER BY category;
```

## Quiz

```quiz
[
  {
    "q": "Why can `WHERE id NOT IN (SELECT customer_id FROM orders)` return no rows, even when some customers have no orders?",
    "options": [
      "NOT IN is not valid SQL",
      "If the subquery returns a NULL, every NOT IN comparison becomes unknown, so no row qualifies",
      "Subqueries can't be used with IN",
      "It only works with numbers"
    ],
    "answer": 1,
    "why": "Use `NOT EXISTS`, or filter out NULLs in the subquery."
  },
  {
    "q": "What does a CTE (`WITH name AS (...)`) give you?",
    "options": [
      "A permanent table",
      "A named, reusable step inside one query, which makes complex queries readable",
      "Faster inserts",
      "A transaction"
    ],
    "answer": 1,
    "why": "CTEs exist only for the query they're part of. They let you build the query in clear steps."
  },
  {
    "q": "How is a window function different from `GROUP BY`?",
    "options": [
      "It's the same",
      "It calculates across related rows but keeps every row in the result",
      "It only works on dates",
      "It deletes duplicate rows"
    ],
    "answer": 1,
    "why": "`ROW_NUMBER() OVER (...)` numbers rows without collapsing them."
  },
  {
    "q": "What's wrong with `` `SELECT * FROM users WHERE email = '${email}'` `` in a test helper?",
    "options": [
      "Nothing",
      "It's open to SQL injection; pass the value as a parameter instead",
      "Template literals can't contain SQL",
      "It's slower"
    ],
    "answer": 1,
    "why": "A value containing quotes changes the meaning of the query. Parameters keep data separate from SQL."
  },
  {
    "q": "In SQLite's `EXPLAIN QUERY PLAN`, what does `SCAN orders` suggest on a large table?",
    "options": [
      "The query uses an index",
      "The whole table is read; an index on the filtered column may help",
      "The table is empty",
      "The query failed"
    ],
    "answer": 1,
    "why": "A `SEARCH ... USING INDEX` line means an index is used."
  }
]
```

## Sources

Every query and result was run with SQLite 3.54.1 (through sql.js 1.16.0). The Playwright database tests were run with Playwright Test 1.65.0 on Node.js v24.18.0.

- SQLite, *WITH clause* (CTEs): [sqlite.org/lang_with.html](https://www.sqlite.org/lang_with.html)
- SQLite, *Window functions*: [sqlite.org/windowfunctions.html](https://www.sqlite.org/windowfunctions.html)
- SQLite, *EXPLAIN QUERY PLAN*: [sqlite.org/eqp.html](https://www.sqlite.org/eqp.html)
- SQLite, *SQL expressions* (`EXISTS`, `IN`, NULL handling): [sqlite.org/lang_expr.html](https://www.sqlite.org/lang_expr.html)
- Node.js docs, *SQLite* (`node:sqlite`, `DatabaseSync`, prepared statements, stability): [nodejs.org/api/sqlite.html](https://nodejs.org/api/sqlite.html)
- OWASP, *SQL Injection Prevention Cheat Sheet* (use parameterized queries): [cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
