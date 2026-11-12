Real questions involve more than one table: *which customer placed this order? how much did each customer spend? are there order lines pointing at products that don't exist?* This chapter covers aggregates, grouping, joins, and `CASE`, and finishes with data-integrity checks that find real bugs.

> **Optional appendix.** Every **▶ Run** uses a fresh copy of the sample shop database from Appendix A (SQLite 3.54.1 via sql.js).

**In this chapter you will learn:**

- aggregates: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`
- `GROUP BY`, and filtering groups with `HAVING`
- `INNER JOIN` and `LEFT JOIN`, and joining several tables
- `CASE` expressions
- integrity checks: orphans, duplicates, totals

## B.1 Aggregates

An **aggregate** function combines many rows into one value:

```sql run
SELECT COUNT(*) AS products, MIN(price) AS cheapest, MAX(price) AS dearest, ROUND(AVG(price), 2) AS average
FROM products;
```

```output
┌──────────┬──────────┬─────────┬─────────┐
│ products │ cheapest │ dearest │ average │
├──────────┼──────────┼─────────┼─────────┤
│ 5        │ 9.5      │ 89      │ 41.7    │
└──────────┴──────────┴─────────┴─────────┘
(1 row)
```

`ROUND(x, 2)` rounds to two decimal places. As in JavaScript (Chapter 2), sums and averages of decimals can carry tiny rounding errors, so round before comparing them in a test.

## B.2 GROUP BY and HAVING

`GROUP BY` splits the rows into groups and calculates the aggregate **per group**:

```sql run
SELECT status, COUNT(*) AS orders
FROM orders
GROUP BY status
ORDER BY orders DESC, status;
```

```output
┌───────────┬────────┐
│ status    │ orders │
├───────────┼────────┤
│ paid      │ 3      │
│ cancelled │ 1      │
│ pending   │ 1      │
│ shipped   │ 1      │
└───────────┴────────┘
(4 rows)
```

Every column in the `SELECT` must either be in the `GROUP BY` or inside an aggregate. (SQLite is lenient about this, but PostgreSQL and SQL Server reject such queries, so don't rely on it.)

`WHERE` filters **rows before** grouping, and `HAVING` filters **groups after** grouping:

```sql run
SELECT customer_id, COUNT(*) AS orders
FROM orders
WHERE status <> 'cancelled'
GROUP BY customer_id
HAVING COUNT(*) > 1;
```

```output
┌─────────────┬────────┐
│ customer_id │ orders │
├─────────────┼────────┤
│ 1           │ 2      │
└─────────────┴────────┘
(1 row)
```

## B.3 INNER JOIN

A **join** combines rows from two tables using a condition, usually "this foreign key equals that primary key". `INNER JOIN` keeps only rows that have a match on **both** sides:

```sql run
SELECT o.id AS order_id, c.name AS customer, o.status
FROM orders AS o
INNER JOIN customers AS c ON c.id = o.customer_id
ORDER BY o.id;
```

```output
┌──────────┬────────────┬───────────┐
│ order_id │ customer   │ status    │
├──────────┼────────────┼───────────┤
│ 101      │ Ana Lopez  │ paid      │
│ 102      │ Ana Lopez  │ shipped   │
│ 103      │ Ben Ito    │ paid      │
│ 104      │ Chen Wu    │ cancelled │
│ 105      │ Eli Santos │ pending   │
└──────────┴────────────┴───────────┘
(5 rows)
```

`orders AS o` gives the table a short **alias**, and `o.id` means "the `id` column of `orders`". Notice that **order 106 is missing**. It has no `customer_id` (`NULL`), so it has no match, and `INNER JOIN` drops it.

## B.4 LEFT JOIN

`LEFT JOIN` keeps **every** row from the left table, and fills the right-hand columns with `NULL` where there's no match:

```sql run
SELECT o.id AS order_id, c.name AS customer, o.status
FROM orders AS o
LEFT JOIN customers AS c ON c.id = o.customer_id
ORDER BY o.id;
```

```output
┌──────────┬────────────┬───────────┐
│ order_id │ customer   │ status    │
├──────────┼────────────┼───────────┤
│ 101      │ Ana Lopez  │ paid      │
│ 102      │ Ana Lopez  │ shipped   │
│ 103      │ Ben Ito    │ paid      │
│ 104      │ Chen Wu    │ cancelled │
│ 105      │ Eli Santos │ pending   │
│ 106      │ NULL       │ paid      │
└──────────┴────────────┴───────────┘
(6 rows)
```

Order 106 is back, with `NULL` as the customer. That makes `LEFT JOIN` ideal for finding **missing** relationships. Customers who have never ordered:

```sql run
SELECT c.name
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

```output
┌───────────┐
│ name      │
├───────────┤
│ Dee Patel │
└───────────┘
(1 row)
```

> **Choosing a join:** use `INNER JOIN` when you only want rows that match. Use `LEFT JOIN` when rows without a match matter, or when you're looking for them. Mixing them up is the most common reason a query returns "too few" rows.

## B.5 Joining several tables

Joins chain. This query lists each order line with the customer and the product, and calculates the line total:

```sql run
SELECT o.id AS order_id, c.name AS customer, p.name AS product, oi.quantity, oi.quantity * oi.unit_price AS line_total
FROM order_items AS oi
JOIN orders AS o ON o.id = oi.order_id
JOIN customers AS c ON c.id = o.customer_id
JOIN products AS p ON p.id = oi.product_id
ORDER BY o.id, p.name;
```

```output
┌──────────┬────────────┬─────────────────────┬──────────┬────────────┐
│ order_id │ customer   │ product             │ quantity │ line_total │
├──────────┼────────────┼─────────────────────┼──────────┼────────────┤
│ 101      │ Ana Lopez  │ Laptop Stand        │ 1        │ 34.99      │
│ 101      │ Ana Lopez  │ USB-C Cable         │ 2        │ 19         │
│ 102      │ Ana Lopez  │ Webcam              │ 1        │ 49.99      │
│ 103      │ Ben Ito    │ Mechanical Keyboard │ 1        │ 89         │
│ 103      │ Ben Ito    │ USB-C Cable         │ 3        │ 28.5       │
│ 104      │ Chen Wu    │ Desk Lamp           │ 1        │ 25         │
│ 105      │ Eli Santos │ USB-C Cable         │ 1        │ 9.5        │
└──────────┴────────────┴─────────────────────┴──────────┴────────────┘
(7 rows)
```

(Plain `JOIN` means `INNER JOIN`.) Combine joins with `GROUP BY` to answer business questions, such as total spend per customer, excluding cancelled orders:

```sql run
SELECT c.name, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS total_spent
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY c.id, c.name
ORDER BY total_spent DESC;
```

```output
┌────────────┬─────────────┐
│ name       │ total_spent │
├────────────┼─────────────┤
│ Ben Ito    │ 117.5       │
│ Ana Lopez  │ 103.98      │
│ Eli Santos │ 9.5         │
└────────────┴─────────────┘
(3 rows)
```

## B.6 CASE expressions

`CASE` is SQL's `if`/`else` (Chapter 7). It returns a value depending on conditions, checked in order:

```sql run
SELECT name, price,
  CASE
    WHEN price < 20 THEN 'budget'
    WHEN price < 50 THEN 'standard'
    ELSE 'premium'
  END AS price_band
FROM products
ORDER BY price;
```

```output
┌─────────────────────┬───────┬────────────┐
│ name                │ price │ price_band │
├─────────────────────┼───────┼────────────┤
│ USB-C Cable         │ 9.5   │ budget     │
│ Desk Lamp           │ 25    │ standard   │
│ Laptop Stand        │ 34.99 │ standard   │
│ Webcam              │ 49.99 │ standard   │
│ Mechanical Keyboard │ 89    │ premium    │
└─────────────────────┴───────┴────────────┘
(5 rows)
```

## B.7 Integrity checks that find real bugs

These queries should return **no rows** in healthy data. In a test environment, an unexpected row is a bug report.

**Orders without a customer** (the sample data has one on purpose):

```sql run
SELECT id, status FROM orders WHERE customer_id IS NULL;
```

```output
┌─────┬────────┐
│ id  │ status │
├─────┼────────┤
│ 106 │ paid   │
└─────┴────────┘
(1 row)
```

**Order lines pointing at products that don't exist** (an *orphan*). A `LEFT JOIN` with `IS NULL` finds them:

```sql run
SELECT oi.order_id, oi.product_id
FROM order_items AS oi
LEFT JOIN products AS p ON p.id = oi.product_id
WHERE p.id IS NULL;
```

```output
┌──────────┬────────────┐
│ order_id │ product_id │
├──────────┼────────────┤
└──────────┴────────────┘
(0 rows)
```

**Duplicate emails**, even though the column should be unique:

```sql run
SELECT email, COUNT(*) AS copies
FROM customers
GROUP BY email
HAVING COUNT(*) > 1;
```

```output
┌───────┬────────┐
│ email │ copies │
├───────┼────────┤
└───────┴────────┘
(0 rows)
```

**Line prices that don't match the current price list.** This might be correct (prices change), or it might be a bug, so it's a question to ask:

```sql run
SELECT oi.order_id, p.name, oi.unit_price, p.price AS current_price
FROM order_items AS oi
JOIN products AS p ON p.id = oi.product_id
WHERE oi.unit_price <> p.price;
```

```output
┌──────────┬──────┬────────────┬───────────────┐
│ order_id │ name │ unit_price │ current_price │
├──────────┼──────┼────────────┼───────────────┤
└──────────┴──────┴────────────┴───────────────┘
(0 rows)
```

## Exercise

```exercise sql title="Revenue per product"
-- For every product, show its name and how many units were sold in orders
-- that are NOT cancelled. Products that were never sold must appear with 0.
-- Sort by units sold (highest first), then by name.
-- Name the columns: name, units_sold
SELECT name FROM products;
```

```checks
┌─────────────────────┬────────────┐
│ name                │ units_sold │
├─────────────────────┼────────────┤
│ USB-C Cable         │ 6          │
│ Laptop Stand        │ 2          │
│ Mechanical Keyboard │ 1          │
│ Webcam              │ 1          │
│ Desk Lamp           │ 0          │
└─────────────────────┴────────────┘
(5 rows)
```

```solution
SELECT p.name,
  COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN oi.quantity END), 0) AS units_sold
FROM products AS p
LEFT JOIN order_items AS oi ON oi.product_id = p.id
LEFT JOIN orders AS o ON o.id = oi.order_id
GROUP BY p.id, p.name
ORDER BY units_sold DESC, p.name;
```

`LEFT JOIN` keeps every product, even one that was never ordered. The `CASE` inside `SUM` counts a line's quantity only when its order isn't cancelled. Otherwise it gives `NULL`, which `SUM` ignores. `COALESCE` then turns a `NULL` total (nothing counted) into `0`. Filtering cancelled orders in `WHERE` instead would drop products like the Desk Lamp, whose only order was cancelled, and they'd vanish from the result instead of showing `0`. There are other correct ways to write this, and the check compares the result, not the query.

## Quiz

```quiz
[
  {
    "q": "What's the difference between `WHERE` and `HAVING`?",
    "options": [
      "None",
      "`WHERE` filters rows before grouping; `HAVING` filters groups after grouping",
      "`HAVING` is only for joins",
      "`WHERE` only works with numbers"
    ],
    "answer": 1,
    "why": "Use `HAVING` for conditions on aggregates, like `HAVING COUNT(*) > 1`."
  },
  {
    "q": "An order has `customer_id = NULL`. Does it appear in `orders INNER JOIN customers ON customers.id = orders.customer_id`?",
    "options": ["Yes, with NULL customer columns", "No, INNER JOIN drops rows without a match", "Only if you add DISTINCT", "It causes an error"],
    "answer": 1,
    "why": "Use `LEFT JOIN` to keep rows without a match."
  },
  {
    "q": "Which pattern finds customers who have never placed an order?",
    "options": [
      "`customers INNER JOIN orders ... WHERE orders.id IS NULL`",
      "`customers LEFT JOIN orders ON orders.customer_id = customers.id WHERE orders.id IS NULL`",
      "`SELECT * FROM orders WHERE customer_id = NULL`",
      "`GROUP BY customers.id HAVING COUNT(*) = 1`"
    ],
    "answer": 1,
    "why": "`LEFT JOIN` keeps every customer, and `IS NULL` on the right side keeps those with no matching order."
  },
  {
    "q": "Which query finds duplicate emails?",
    "options": [
      "`SELECT DISTINCT email FROM customers`",
      "`SELECT email, COUNT(*) FROM customers GROUP BY email HAVING COUNT(*) > 1`",
      "`SELECT email FROM customers WHERE COUNT(*) > 1`",
      "`SELECT email FROM customers ORDER BY email`"
    ],
    "answer": 1,
    "why": "Group by the value and keep groups with more than one row. Aggregates can't be used in `WHERE`."
  },
  {
    "q": "In SQL, how do you choose a value based on conditions?",
    "options": ["`IF ... THEN`", "`CASE WHEN ... THEN ... ELSE ... END`", "`SWITCH`", "`? :`"],
    "answer": 1,
    "why": "`CASE` checks its `WHEN` conditions in order and returns the first match."
  }
]
```

## Sources

Every query and result was run with SQLite 3.54.1 (through sql.js 1.16.0), the same engine the ▶ Run buttons use.

- SQLite, *SELECT* (joins, `GROUP BY`, `HAVING`): [sqlite.org/lang_select.html](https://www.sqlite.org/lang_select.html)
- SQLite, *Aggregate functions*: [sqlite.org/lang_aggfunc.html](https://www.sqlite.org/lang_aggfunc.html)
- SQLite, *SQL expressions* (`CASE`): [sqlite.org/lang_expr.html](https://www.sqlite.org/lang_expr.html)
- SQLite, *Quirks* (bare columns in aggregate queries): [sqlite.org/quirks.html](https://www.sqlite.org/quirks.html)
- PostgreSQL, *GROUP BY and HAVING*: [postgresql.org/docs/current/queries-table-expressions.html#QUERIES-GROUP](https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-GROUP)
