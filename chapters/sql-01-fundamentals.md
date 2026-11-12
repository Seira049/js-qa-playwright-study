This appendix is **optional**. It's for testers who need to check what an application actually saved: did the order get the right status, was the user really deleted, is there duplicate data? You'll learn to read data with SQL, and to change it safely in a test environment.

> **The examples run in your browser.** Press **▶ Run** on any query. It runs against a small sample shop database using SQLite (through sql.js, version 3.54.1 of SQLite). Every run starts from a **fresh copy** of the data, so you can't break anything. You can also open the playground and choose **SQL**.

**In this chapter you will learn:**

- how a database is organised into tables, rows, and columns
- `SELECT`, `WHERE`, `ORDER BY`, `LIMIT`, and `DISTINCT`
- how `NULL` works, and the trap with `= NULL`
- `INSERT`, `UPDATE`, and `DELETE`, and how to use them safely

## A.1 Why testers use SQL

The UI and the API show you what the application *chooses* to show. The database shows what it actually **stored**. Typical QA uses:

- checking that an action saved the right data (status, amounts, timestamps)
- finding test data with specific properties ("a customer with no orders")
- setting up or cleaning up data in a **test** environment
- investigating a bug: is the data wrong, or is the display wrong?

## A.2 Tables, rows, and columns

A relational database stores data in **tables**. Each **row** is one record, and each **column** is one property. The sample database has four tables:

| Table | One row is… | Columns |
|---|---|---|
| `customers` | a customer | `id`, `name`, `email`, `country`, `created_at` |
| `products` | a product | `id`, `name`, `category`, `price`, `in_stock` (1 = yes, 0 = no) |
| `orders` | an order | `id`, `customer_id`, `status`, `ordered_at` |
| `order_items` | one product line in an order | `order_id`, `product_id`, `quantity`, `unit_price` |

`id` is each table's **primary key**: a value that identifies exactly one row. `orders.customer_id` is a **foreign key**: it holds a `customers.id`, which links an order to its customer. Chapter B joins tables through these links.

## A.3 SELECT: reading data

```sql run
SELECT * FROM customers;
```

```output
┌────┬────────────┬──────────────┬─────────┬────────────┐
│ id │ name       │ email        │ country │ created_at │
├────┼────────────┼──────────────┼─────────┼────────────┤
│ 1  │ Ana Lopez  │ ana@test.io  │ PH      │ 2026-01-05 │
│ 2  │ Ben Ito    │ ben@test.io  │ JP      │ 2026-02-11 │
│ 3  │ Chen Wu    │ chen@test.io │ SG      │ 2026-02-20 │
│ 4  │ Dee Patel  │ dee@test.io  │ NULL    │ 2026-03-02 │
│ 5  │ Eli Santos │ eli@test.io  │ PH      │ 2026-03-15 │
└────┴────────────┴──────────────┴─────────┴────────────┘
(5 rows)
```

`SELECT *` means "all columns". In tests and scripts, list the columns you need instead. It's clearer, and it doesn't break when someone adds a column:

```sql run
SELECT name, email FROM customers;
```

```output
┌────────────┬──────────────┐
│ name       │ email        │
├────────────┼──────────────┤
│ Ana Lopez  │ ana@test.io  │
│ Ben Ito    │ ben@test.io  │
│ Chen Wu    │ chen@test.io │
│ Dee Patel  │ dee@test.io  │
│ Eli Santos │ eli@test.io  │
└────────────┴──────────────┘
(5 rows)
```

SQL keywords aren't case-sensitive (`select` works too), but writing them in capitals is the common convention. A statement ends with `;`.

Notice that the prices below show as `9.5` and `89`, not `9.50` and `89.00`. They're stored as numbers, and a number has no trailing zeros. Formatting with two decimals is the application's job. Keep that in mind when you compare database values with the text on a page (Chapter 2).

### Renaming columns with AS

```sql run
SELECT name AS product, price AS price_usd FROM products;
```

```output
┌─────────────────────┬───────────┐
│ product             │ price_usd │
├─────────────────────┼───────────┤
│ Laptop Stand        │ 34.99     │
│ USB-C Cable         │ 9.5       │
│ Mechanical Keyboard │ 89        │
│ Webcam              │ 49.99     │
│ Desk Lamp           │ 25        │
└─────────────────────┴───────────┘
(5 rows)
```

## A.4 WHERE: filtering rows

`WHERE` keeps only the rows where a condition is true:

```sql run
SELECT id, name, price FROM products WHERE price < 30;
```

```output
┌────┬─────────────┬───────┐
│ id │ name        │ price │
├────┼─────────────┼───────┤
│ 2  │ USB-C Cable │ 9.5   │
│ 5  │ Desk Lamp   │ 25    │
└────┴─────────────┴───────┘
(2 rows)
```

| Operator | Meaning |
|---|---|
| `=`, `<>` (or `!=`) | equal, not equal |
| `<`, `<=`, `>`, `>=` | comparisons |
| `AND`, `OR`, `NOT` | combine conditions |
| `IN (a, b, c)` | equals any value in the list |
| `BETWEEN a AND b` | in the range, **including** both ends |
| `LIKE 'pattern'` | text pattern: `%` is any text, `_` is one character |

```sql run
SELECT id, status FROM orders WHERE status IN ('paid', 'shipped') AND ordered_at >= '2026-03-08';
```

```output
┌─────┬─────────┐
│ id  │ status  │
├─────┼─────────┤
│ 102 │ shipped │
│ 103 │ paid    │
│ 106 │ paid    │
└─────┴─────────┘
(3 rows)
```

Text values go in **single quotes**: `'paid'`. Dates here are stored as text in `YYYY-MM-DD` form, which sorts and compares correctly as text.

```sql run
SELECT name, email FROM customers WHERE email LIKE 'b%';
```

```output
┌─────────┬─────────────┐
│ name    │ email       │
├─────────┼─────────────┤
│ Ben Ito │ ben@test.io │
└─────────┴─────────────┘
(1 row)
```

> **Databases differ:** in SQLite, `LIKE` ignores the case of ASCII letters by default. In PostgreSQL, `LIKE` is case-sensitive, and `ILIKE` ignores case. In MySQL, it depends on the column's collation. Check how your project's database behaves.

## A.5 Sorting, limiting, and unique values

```sql run
SELECT name, price FROM products ORDER BY price DESC LIMIT 3;
```

```output
┌─────────────────────┬───────┐
│ name                │ price │
├─────────────────────┼───────┤
│ Mechanical Keyboard │ 89    │
│ Webcam              │ 49.99 │
│ Laptop Stand        │ 34.99 │
└─────────────────────┴───────┘
(3 rows)
```

`ORDER BY column` sorts ascending (smallest first) by default, and `DESC` reverses it. **Without `ORDER BY`, the database doesn't promise any order**, so a test that relies on "the first row" must sort explicitly. `LIMIT n` returns at most `n` rows. (SQL Server uses `SELECT TOP n` instead.)

`DISTINCT` removes duplicate rows from the result:

```sql run
SELECT DISTINCT category FROM products ORDER BY category;
```

```output
┌─────────────┐
│ category    │
├─────────────┤
│ accessories │
│ office      │
│ peripherals │
└─────────────┘
(3 rows)
```

## A.6 NULL: the missing value

`NULL` means "no value" or "unknown". Customer 4 has no `country`, and order 106 has no `customer_id`.

**The trap:** comparing with `= NULL` never matches anything, because the result of comparing with an unknown value is itself unknown:

```sql run
SELECT name FROM customers WHERE country = NULL;
```

```output
┌──────┐
│ name │
├──────┤
└──────┘
(0 rows)
```

Use `IS NULL` and `IS NOT NULL`:

```sql run
SELECT name, country FROM customers WHERE country IS NULL;
```

```output
┌───────────┬─────────┐
│ name      │ country │
├───────────┼─────────┤
│ Dee Patel │ NULL    │
└───────────┴─────────┘
(1 row)
```

`NULL` also changes counts. `COUNT(*)` counts rows, but `COUNT(column)` skips rows where that column is `NULL`:

```sql run
SELECT COUNT(*) AS all_customers, COUNT(country) AS with_country FROM customers;
```

```output
┌───────────────┬──────────────┐
│ all_customers │ with_country │
├───────────────┼──────────────┤
│ 5             │ 4            │
└───────────────┴──────────────┘
(1 row)
```

`COALESCE(a, b)` returns the first value that isn't `NULL`, which is useful for showing a default:

```sql run
SELECT name, COALESCE(country, 'unknown') AS country FROM customers ORDER BY id;
```

```output
┌────────────┬─────────┐
│ name       │ country │
├────────────┼─────────┤
│ Ana Lopez  │ PH      │
│ Ben Ito    │ JP      │
│ Chen Wu    │ SG      │
│ Dee Patel  │ unknown │
│ Eli Santos │ PH      │
└────────────┴─────────┘
(5 rows)
```

## A.7 Changing data safely

> **Only change data in a test environment you're allowed to change**, and never in production. Your team's rules come first.

### INSERT

```sql run
INSERT INTO customers (id, name, email, country, created_at)
VALUES (6, 'Fay Moreno', 'fay@test.io', 'MX', '2026-03-20');

SELECT id, name, country FROM customers WHERE id = 6;
```

```output
1 row changed

┌────┬────────────┬─────────┐
│ id │ name       │ country │
├────┼────────────┼─────────┤
│ 6  │ Fay Moreno │ MX      │
└────┴────────────┴─────────┘
(1 row)
```

Name the columns you're inserting into. If the table changes, a positional `INSERT` without column names can silently put values in the wrong columns.

### UPDATE and DELETE: always use WHERE

An `UPDATE` or `DELETE` **without `WHERE` changes every row** in the table. A safe routine:

1. Write the `WHERE` as a `SELECT` first, and check it returns exactly the rows you mean.
2. Then turn it into the `UPDATE` or `DELETE` with the **same** `WHERE`.
3. Check the number of rows changed.

```sql run
SELECT id, status FROM orders WHERE id = 105;

UPDATE orders SET status = 'cancelled' WHERE id = 105;

SELECT id, status FROM orders WHERE id = 105;
```

```output
┌─────┬─────────┐
│ id  │ status  │
├─────┼─────────┤
│ 105 │ pending │
└─────┴─────────┘
(1 row)

1 row changed

┌─────┬───────────┐
│ id  │ status    │
├─────┼───────────┤
│ 105 │ cancelled │
└─────┴───────────┘
(1 row)
```

```sql run
DELETE FROM order_items WHERE order_id = 104;
SELECT COUNT(*) AS items_left_for_104 FROM order_items WHERE order_id = 104;
```

```output
1 row changed

┌────────────────────┐
│ items_left_for_104 │
├────────────────────┤
│ 0                  │
└────────────────────┘
(1 row)
```

### Undo with a transaction

A **transaction** groups changes so they're kept or undone together. `BEGIN` starts one, `COMMIT` keeps the changes, and `ROLLBACK` undoes them:

```sql run
BEGIN;
DELETE FROM products;
SELECT COUNT(*) AS during FROM products;
ROLLBACK;
SELECT COUNT(*) AS after_rollback FROM products;
```

```output
5 rows changed

┌────────┐
│ during │
├────────┤
│ 0      │
└────────┘
(1 row)

┌────────────────┐
│ after_rollback │
├────────────────┤
│ 5              │
└────────────────┘
(1 row)
```

If you're unsure about a change, run it inside a transaction, check the result, and `ROLLBACK` if it's wrong. (Some database tools commit every statement automatically unless you start a transaction, so know your tool.)

## Exercise

```exercise sql title="Find cheap products in stock"
-- List the name and price of products that are IN STOCK and cost LESS THAN 40,
-- sorted from cheapest to most expensive.
SELECT name, price FROM products;
```

```checks
┌──────────────┬───────┐
│ name         │ price │
├──────────────┼───────┤
│ USB-C Cable  │ 9.5   │
│ Desk Lamp    │ 25    │
│ Laptop Stand │ 34.99 │
└──────────────┴───────┘
(3 rows)
```

```solution
SELECT name, price
FROM products
WHERE in_stock = 1 AND price < 40
ORDER BY price;
```

## Quiz

```quiz
[
  {
    "q": "Which query finds customers with no country?",
    "options": [
      "`SELECT * FROM customers WHERE country = NULL;`",
      "`SELECT * FROM customers WHERE country IS NULL;`",
      "`SELECT * FROM customers WHERE country = '';`",
      "`SELECT * FROM customers WHERE NOT country;`"
    ],
    "answer": 1,
    "why": "Comparing with `= NULL` never matches. Use `IS NULL`."
  },
  {
    "q": "What happens with `UPDATE orders SET status = 'paid';`?",
    "options": [
      "Nothing, because there's no WHERE",
      "Only the first order is updated",
      "Every row in `orders` is updated",
      "It's a syntax error"
    ],
    "answer": 2,
    "why": "Without `WHERE`, `UPDATE` and `DELETE` affect every row. Check your `WHERE` with a `SELECT` first."
  },
  {
    "q": "A table has 5 rows, and 1 of them has `NULL` in `country`. What do `COUNT(*)` and `COUNT(country)` return?",
    "options": ["5 and 5", "5 and 4", "4 and 4", "4 and 5"],
    "answer": 1,
    "why": "`COUNT(*)` counts rows. `COUNT(column)` skips `NULL` values."
  },
  {
    "q": "A test reads \"the first row\" of `SELECT * FROM orders;`. Why is that risky?",
    "options": [
      "SELECT can't return the first row",
      "Without ORDER BY, the database doesn't guarantee any row order",
      "It's slow",
      "Rows are always returned newest first"
    ],
    "answer": 1,
    "why": "Add `ORDER BY` whenever the order matters."
  },
  {
    "q": "What does `ROLLBACK` do?",
    "options": [
      "Saves the changes",
      "Undoes the changes made since `BEGIN`",
      "Deletes the table",
      "Restarts the database"
    ],
    "answer": 1,
    "why": "A transaction's changes are kept with `COMMIT` or undone with `ROLLBACK`."
  }
]
```

## Sources

Every query and result was run with SQLite 3.54.1 (through sql.js 1.16.0), the same engine the ▶ Run buttons use.

- SQLite, *SELECT*: [sqlite.org/lang_select.html](https://www.sqlite.org/lang_select.html)
- SQLite, *SQL expressions* (`LIKE`, `IS NULL`, `BETWEEN`, `IN`): [sqlite.org/lang_expr.html](https://www.sqlite.org/lang_expr.html)
- SQLite, *Aggregate functions* (`COUNT(*)` vs `COUNT(x)`): [sqlite.org/lang_aggfunc.html](https://www.sqlite.org/lang_aggfunc.html)
- SQLite, *Transactions*: [sqlite.org/lang_transaction.html](https://www.sqlite.org/lang_transaction.html)
- PostgreSQL, *Pattern matching* (`LIKE` and `ILIKE`): [postgresql.org/docs/current/functions-matching.html](https://www.postgresql.org/docs/current/functions-matching.html)
- sql.js: [github.com/sql-js/sql.js](https://github.com/sql-js/sql.js)
