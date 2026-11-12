-- Sample "shop" database for the SQL appendix.
-- Every ▶ Run starts from a fresh copy of this data, so changes never carry over.

CREATE TABLE customers (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  country     TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE products (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  category  TEXT NOT NULL,
  price     REAL NOT NULL,
  in_stock  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE orders (
  id           INTEGER PRIMARY KEY,
  customer_id  INTEGER REFERENCES customers(id),
  status       TEXT NOT NULL,
  ordered_at   TEXT NOT NULL
);

CREATE TABLE order_items (
  order_id    INTEGER NOT NULL REFERENCES orders(id),
  product_id  INTEGER NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL,
  unit_price  REAL NOT NULL
);

INSERT INTO customers (id, name, email, country, created_at) VALUES
  (1, 'Ana Lopez',  'ana@test.io',  'PH', '2026-01-05'),
  (2, 'Ben Ito',    'ben@test.io',  'JP', '2026-02-11'),
  (3, 'Chen Wu',    'chen@test.io', 'SG', '2026-02-20'),
  (4, 'Dee Patel',  'dee@test.io',  NULL, '2026-03-02'),
  (5, 'Eli Santos', 'eli@test.io',  'PH', '2026-03-15');

INSERT INTO products (id, name, category, price, in_stock) VALUES
  (1, 'Laptop Stand',        'accessories', 34.99, 1),
  (2, 'USB-C Cable',         'accessories',  9.50, 1),
  (3, 'Mechanical Keyboard', 'peripherals', 89.00, 0),
  (4, 'Webcam',              'peripherals', 49.99, 1),
  (5, 'Desk Lamp',           'office',      25.00, 1);

INSERT INTO orders (id, customer_id, status, ordered_at) VALUES
  (101, 1, 'paid',      '2026-03-01'),
  (102, 1, 'shipped',   '2026-03-08'),
  (103, 2, 'paid',      '2026-03-09'),
  (104, 3, 'cancelled', '2026-03-10'),
  (105, 5, 'pending',   '2026-03-16'),
  (106, NULL, 'paid',   '2026-03-17');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
  (101, 1, 1, 34.99),
  (101, 2, 2,  9.50),
  (102, 4, 1, 49.99),
  (103, 3, 1, 89.00),
  (103, 2, 3,  9.50),
  (104, 5, 1, 25.00),
  (105, 2, 1,  9.50),
  (106, 1, 1, 34.99);
