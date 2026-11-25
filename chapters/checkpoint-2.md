This project pulls Chapters 9 to 16 together. You'll write a small, typed module that loads orders from an API, **checks** that the data really has the shape it should, and answers a few questions about it. This is everyday work in API tests: never trust a response until you've checked it.

You'll use classes and custom errors, `async`/`await`, types and unions, type guards, `Record`, dates, and `Map` or `Set`. The book checks your module automatically with **ten checks**, and TypeScript must report no problems.

## The brief

The API returns JSON text like this:

```json
[
  { "id": 1, "customer": "ana@test.io", "total": 34.99, "status": "paid", "createdAt": "2026-03-01T09:30:00Z" },
  { "id": 2, "customer": "ben@test.io", "total": 9.5, "status": "pending", "createdAt": "2026-03-02T10:00:00Z" },
  { "id": 3, "customer": "ana@test.io", "total": 49.99, "status": "paid", "createdAt": "2026-03-05T16:45:00Z" }
]
```

Write and **export**:

| Name | What it is |
|---|---|
| `type Status` | `"paid" \| "pending" \| "cancelled"` |
| `interface Order` | `id: number`, `customer: string`, `total: number`, `status: Status`, `createdAt: string` |
| `class ValidationError` | extends `Error`. Has a `readonly index: number`, `name` `"ValidationError"`, and the message `Order at index <n> is invalid` |
| `isOrder(value: unknown): value is Order` | a type guard. Every field must have the right type, `status` must be one of the three values, and `createdAt` must parse to a real date |
| `parseOrders(json: string): Order[]` | parses the text. If the top level isn't an array, throw `ValidationError` with index `-1`. Otherwise throw `ValidationError` for the **first** item that isn't an order |
| `loadOrders(fetchText: () => Promise<string>): Promise<Order[]>` | `await`s the text, then parses it |
| `revenueByStatus(orders: Order[]): Record<Status, number>` | total per status, rounded to 2 decimals. Every status is present, with `0` if there are none |
| `latestOrder(orders: Order[]): Order \| undefined` | the order with the latest `createdAt` |
| `customersWithMultipleOrders(orders: Order[]): string[]` | customers who placed more than one order, sorted alphabetically |

> **Tips:** write `isOrder` first, and test it on its own. `JSON.parse` returns `any`, so assign it to an `unknown` variable before checking it (Chapter 11). Compare dates with `getTime()` (Chapter 13). Use a `Map` to count orders per customer.

## Build it

```exercise ts title="Typed order loader" xp=100
// Checkpoint 2: export Status, Order, ValidationError, isOrder, parseOrders,
// loadOrders, revenueByStatus, latestOrder, customersWithMultipleOrders.

export type Status = string; // TODO: a union of the three statuses

export interface Order {
  id: number;
}

export function isOrder(value: unknown): boolean {
  return false;
}

export function parseOrders(json: string): Order[] {
  return JSON.parse(json);
}
```

```checks
const __json = JSON.stringify([
  { id: 1, customer: "ana@test.io", total: 34.99, status: "paid", createdAt: "2026-03-01T09:30:00Z" },
  { id: 2, customer: "ben@test.io", total: 9.5, status: "pending", createdAt: "2026-03-02T10:00:00Z" },
  { id: 3, customer: "ana@test.io", total: 49.99, status: "paid", createdAt: "2026-03-05T16:45:00Z" },
  { id: 4, customer: "chen@test.io", total: 0.1, status: "cancelled", createdAt: "2026-03-04T08:00:00Z" },
  { id: 5, customer: "ben@test.io", total: 0.2, status: "cancelled", createdAt: "2026-03-03T08:00:00Z" },
]);
const __good = { id: 1, customer: "a@t.io", total: 1, status: "paid", createdAt: "2026-03-01T00:00:00Z" };
const __errAt = (fn: () => unknown) => { try { fn(); return null; } catch (e) { return e; } };
let __orders: any[] = [];
try { __orders = await loadOrders(async () => __json); } catch { __orders = []; }
__book.test("isOrder accepts a valid order", () => isOrder(__good) === true);
__book.test("isOrder rejects wrong types and unknown statuses", () => !isOrder({ ...__good, id: "1" }) && !isOrder({ ...__good, status: "refunded" }) && !isOrder({ ...__good, total: undefined }) && !isOrder(null) && !isOrder("order"));
__book.test("isOrder rejects an impossible date", () => !isOrder({ ...__good, createdAt: "soon" }));
__book.test("parseOrders throws ValidationError for the first bad item, with its index", () => { const e: any = __errAt(() => parseOrders(JSON.stringify([__good, { ...__good, status: "x" }, { id: "bad" }]))); return e instanceof ValidationError && e instanceof Error && e.index === 1 && e.name === "ValidationError" && e.message === "Order at index 1 is invalid"; });
__book.test("parseOrders throws with index -1 when the JSON isn't an array", () => { const e: any = __errAt(() => parseOrders('{"orders": []}')); return e instanceof ValidationError && e.index === -1; });
__book.test("loadOrders awaits and parses the text", () => __orders.length === 5 && __orders[0].customer === "ana@test.io");
__book.test("revenueByStatus totals every status, rounded", () => JSON.stringify(revenueByStatus(__orders)) === JSON.stringify({ paid: 84.98, pending: 9.5, cancelled: 0.3 }));
__book.test("revenueByStatus has every status even when empty", () => { const r: any = revenueByStatus([]); return r.paid === 0 && r.pending === 0 && r.cancelled === 0; });
__book.test("latestOrder finds the newest order", () => latestOrder(__orders)?.id === 3 && latestOrder([]) === undefined);
__book.test("customersWithMultipleOrders is sorted", () => JSON.stringify(customersWithMultipleOrders(__orders)) === '["ana@test.io","ben@test.io"]');
```

```hint
- `isOrder`: check `typeof value === "object" && value !== null` first, then read fields from `value as Record<string, unknown>` (Chapter 11). Keep the statuses in an `as const` array and use `includes` (Chapter 16).
- `ValidationError`: call `super(...)` first, then set `this.name` and `this.index` (Chapter 16).
- `parseOrders`: `const data: unknown = JSON.parse(json)`, `Array.isArray(data)`, then a loop with `entries()` so you know each index (Chapter 7).
- `revenueByStatus`: start from `{ paid: 0, pending: 0, cancelled: 0 }`, add each total, then round with `Math.round(x * 100) / 100` (Chapter 2).
```

```solution
export const STATUSES = ["paid", "pending", "cancelled"] as const;
export type Status = (typeof STATUSES)[number];

export interface Order {
  id: number;
  customer: string;
  total: number;
  status: Status;
  createdAt: string;
}

export class ValidationError extends Error {
  readonly index: number;
  constructor(index: number) {
    super(`Order at index ${index} is invalid`);
    this.name = "ValidationError";
    this.index = index;
  }
}

export function isOrder(value: unknown): value is Order {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "number" &&
    typeof v.customer === "string" &&
    typeof v.total === "number" &&
    typeof v.status === "string" &&
    (STATUSES as readonly string[]).includes(v.status) &&
    typeof v.createdAt === "string" &&
    !Number.isNaN(new Date(v.createdAt).getTime())
  );
}

export function parseOrders(json: string): Order[] {
  const data: unknown = JSON.parse(json);
  if (!Array.isArray(data)) throw new ValidationError(-1);
  for (const [index, item] of data.entries()) {
    if (!isOrder(item)) throw new ValidationError(index);
  }
  return data as Order[];
}

export async function loadOrders(fetchText: () => Promise<string>): Promise<Order[]> {
  return parseOrders(await fetchText());
}

export function revenueByStatus(orders: Order[]): Record<Status, number> {
  const totals: Record<Status, number> = { paid: 0, pending: 0, cancelled: 0 };
  for (const o of orders) totals[o.status] += o.total;
  for (const s of STATUSES) totals[s] = Math.round(totals[s] * 100) / 100;
  return totals;
}

export function latestOrder(orders: Order[]): Order | undefined {
  let latest: Order | undefined;
  for (const o of orders) {
    if (!latest || new Date(o.createdAt).getTime() > new Date(latest.createdAt).getTime()) latest = o;
  }
  return latest;
}

export function customersWithMultipleOrders(orders: Order[]): string[] {
  const counts = new Map<string, number>();
  for (const o of orders) counts.set(o.customer, (counts.get(o.customer) ?? 0) + 1);
  return [...counts].filter(([, n]) => n > 1).map(([customer]) => customer).toSorted();
}
```

The cancelled total in the checks is `0.1 + 0.2`, which is `0.30000000000000004` before rounding (Chapter 2). That's why `revenueByStatus` rounds at the end.

## What you practised

- a custom error class with extra data (Chapters 9 and 16)
- `async`/`await` with a function passed in as a parameter (Chapters 6 and 10)
- union types, `as const`, type guards, and `unknown` (Chapters 11 and 16)
- `Record` with a union key (Chapter 12)
- comparing dates and counting with a `Map` (Chapter 13)
