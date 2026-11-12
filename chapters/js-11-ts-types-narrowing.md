You've used TypeScript a little in every chapter. This chapter covers the parts you'll use most when writing tests: **naming** the shapes of your data, describing values that can be **one of several things**, and **narrowing** them safely. It also covers the most important habit for API testing: treating response data as *unknown* until you've checked it.

**In this chapter you will learn:**

- `type` aliases and `interface`, and how they differ
- union types and literal types, such as `"passed" | "failed"`
- narrowing with `typeof`, `in`, `instanceof`, and equality checks
- discriminated unions, and making a `switch` handle every case
- type guards (`value is User`) for checking API responses
- `unknown` vs `any`, and why `as` doesn't check anything
- `as const` and the non-null assertion `!`

## 11.1 Naming types: type and interface

Writing `{ id: number; name: string }` everywhere gets repetitive (Chapter 5). Give the shape a name once:

```ts run
type User = {
  id: number;
  name: string;
  email?: string;               // optional
};

interface Product {
  readonly sku: string;
  price: number;
}

const user: User = { id: 1, name: "Ana" };
const product: Product = { sku: "A1", price: 9.99 };
console.log(user, product);
```

```output
{ id: 1, name: 'Ana' } { sku: 'A1', price: 9.99 }
```

The TypeScript Handbook says type aliases and interfaces *"are very similar, and in many cases you can choose between them freely."* The main differences:

| | `interface` | `type` |
|---|---|---|
| Describes object shapes | yes | yes |
| Can name **any** type (unions, strings, functions) | no | yes, e.g. `type Id = string \| number` |
| Extending | `interface Admin extends User { … }` | `type Admin = User & { … }` |
| Can be declared again to add fields | yes | no |

A common convention: `interface` for object shapes (page objects, API bodies), and `type` for unions and everything else. Follow your project's style.

### Extending a type

```ts run
interface User {
  id: number;
  name: string;
}
interface Admin extends User {          // everything in User, plus more
  permissions: string[];
}
type Customer = User & { loyaltyPoints: number }; // the same idea with `type`

const admin: Admin = { id: 1, name: "Ana", permissions: ["users:write"] };
const missing: Admin = { id: 2, name: "Ben" };
console.log(admin.permissions);
```

TypeScript reports for `missing`: `Property 'permissions' is missing in type '{ id: number; name: string; }' but required in type 'Admin'.`

## 11.2 Union and literal types

A **union** (`A | B`) is a value that can be **either** type. A **literal type** is one exact value, like `"passed"`. Together they describe a fixed set of allowed values:

```ts run
type Status = "passed" | "failed" | "skipped";

interface TestResult {
  title: string;
  status: Status;
  durationMs: number;
}

const ok: TestResult = { title: "login", status: "passed", durationMs: 120 };
const typo: TestResult = { title: "logout", status: "pased", durationMs: 80 };
console.log(ok.status, typo.status);
```

TypeScript catches the typo: `Type '"pased"' is not assignable to type 'Status'. Did you mean '"passed"'?` With a plain `string`, it would have gone unnoticed, and a filter for `"passed"` results would silently skip it.

### You can only use what every member has

With a union, TypeScript only lets you use what's valid for **every** member:

```ts run
type Id = string | number;

function show(id: Id) {
  return id.toUpperCase();   // fine for strings, but not for numbers
}
```

TypeScript reports `Property 'toUpperCase' does not exist on type 'Id'.` To use string methods, you first have to **narrow** the type.

## 11.3 Narrowing

*Narrowing* means checking a value so TypeScript knows which member of a union you have in that part of the code. TypeScript understands normal JavaScript checks:

```ts run
function describe(value: string | number | null): string {
  if (value === null) {
    return "nothing";                    // here: null
  }
  if (typeof value === "string") {
    return value.toUpperCase();          // here: string
  }
  return value.toFixed(1);               // here: only number is left
}
console.log(describe(null), describe("ok"), describe(2.345));
```

```output
nothing OK 2.3
```

| Check | Narrows by |
|---|---|
| `typeof x === "string"` | primitive type (`"string"`, `"number"`, `"boolean"`, …) |
| `x === null`, `x !== undefined` | exact value |
| `if (x)` | removes `null`, `undefined`, and other falsy values |
| `"permissions" in x` | whether an object has a property |
| `x instanceof Error` | class (Chapter 7's `catch` example) |
| `Array.isArray(x)` | array or not |

```ts run
interface Admin { name: string; permissions: string[] }
interface Guest { name: string }

function permissionCount(account: Admin | Guest): number {
  if ("permissions" in account) {
    return account.permissions.length;   // here: Admin
  }
  return 0;                              // here: Guest
}
console.log(permissionCount({ name: "Ana", permissions: ["read", "write"] }));
console.log(permissionCount({ name: "Ben" }));
```

```output
2
0
```

## 11.4 Discriminated unions

API responses often have a field that says which kind of response it is. If each member of a union has the **same field with a different literal value**, TypeScript can narrow on it. This is called a *discriminated union*:

```ts run
type ApiResult =
  | { ok: true; data: { id: number } }
  | { ok: false; error: string; status: number };

function summarise(result: ApiResult): string {
  if (result.ok) {
    return `created #${result.data.id}`;          // TypeScript knows data exists
  }
  return `failed (${result.status}): ${result.error}`; // and here, error exists
}

console.log(summarise({ ok: true, data: { id: 42 } }));
console.log(summarise({ ok: false, error: "Email taken", status: 409 }));
```

```output
created #42
failed (409): Email taken
```

### Make a switch handle every case

The special type `never` means "this can't happen". Assigning to `never` in the `default` branch makes TypeScript check that every case was handled. If someone adds a new member to the union later, the code stops compiling until it's handled:

```ts run
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.size ** 2;
    default: {
      const unhandled: never = shape;  // "triangle" reaches here: error!
      throw new Error(`Unhandled shape: ${JSON.stringify(unhandled)}`);
    }
  }
}
console.log(area({ kind: "square", size: 3 }));
```

TypeScript reports `Type '{ kind: "triangle"; base: number; height: number; }' is not assignable to type 'never'.`, pointing you to the missing case.

## 11.5 unknown, any, and as

### API data is not typed until you check it

`JSON.parse` returns `any`. So does Playwright's `response.json()`: its return type is a promise of `Serializable`, which Playwright defines as `any`. TypeScript can't know what a server will actually send.

**`any` switches off type checking.** Everything is allowed, so mistakes slip through:

```ts run
const body: any = JSON.parse('{"id": 1}');
console.log(body.user.name);   // no TypeScript error... but it crashes when it runs
```

That throws `TypeError: Cannot read properties of undefined (reading 'name')`, and TypeScript didn't warn you.

**`unknown` is the safe opposite.** You can store anything in it, but you can't *use* it until you narrow it:

```ts run
const body: unknown = JSON.parse('{"id": 1}');
console.log(body.id);          // 'body' is of type 'unknown'.
```

### as is a promise to TypeScript, not a check

A **type assertion** with `as` tells TypeScript "trust me, it's this type". It does **nothing** when the code runs:

```ts run
interface User { id: number; name: string }

const body = JSON.parse('{"id": "not-a-number"}') as User;
console.log(typeof body.id);   // TypeScript thinks number...
console.log(body.name);        // ...and that name exists
```

```output
string
undefined
```

TypeScript reports no errors, but both "facts" are false. In a test, that means `as` can hide exactly the API bug you're trying to find. **Check the data instead** (next section), or use Playwright's assertions on it.

## 11.6 Type guards: checking unknown data

A **type guard** is a function that checks a value and tells TypeScript the result. Its return type is written `value is Type`:

```ts run
interface User {
  id: number;
  name: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).id === "number" &&
    typeof (value as Record<string, unknown>).name === "string"
  );
}

const good: unknown = JSON.parse('{"id": 1, "name": "Ana"}');
const bad: unknown = JSON.parse('{"id": "1"}');

if (isUser(good)) {
  console.log(good.name.toUpperCase());   // narrowed to User
}
console.log(isUser(good), isUser(bad));
```

```output
ANA
true false
```

`Record<string, unknown>` means "an object with string keys whose values are unknown". It lets the guard read properties before it knows they exist. Chapter 12 covers `Record` and other utility types.

For large API schemas, teams often use a validation library instead of hand-written guards. Playwright's own assertions also help: `expect(body).toEqual(expect.objectContaining({ id: expect.any(Number) }))` checks the shape when the test runs.

## 11.7 as const and the non-null assertion

### as const

`as const` makes TypeScript treat values as exact and read-only. It's useful for fixed lists of allowed values:

```ts run
const ROLES = ["admin", "qa", "viewer"] as const;
type Role = (typeof ROLES)[number];   // "admin" | "qa" | "viewer"

const role: Role = "qa";
ROLES.push("guest");                  // read-only array
console.log(role, ROLES);
```

TypeScript reports `Property 'push' does not exist on type 'readonly ["admin", "qa", "viewer"]'.` `(typeof ROLES)[number]` means "the type of any item in `ROLES`", so the union stays in sync with the list.

### The non-null assertion !

Writing `!` after a value tells TypeScript it isn't `null` or `undefined`. Like `as`, it **doesn't check anything** when the code runs. The Handbook says to use it only *"when you know that the value can't be null or undefined"*:

```ts run
const users = [{ id: 1, name: "Ana" }];
const ben = users.find((u) => u.name === "Ben")!;  // "trust me, it's there"
console.log(ben.name);                              // it isn't: TypeError
```

That throws `TypeError: Cannot read properties of undefined (reading 'name')`. In tests, prefer an explicit check that fails with a clear message.

## Exercises

```exercise ts title="Model and summarise test results"
// 1. Define a type Status that allows only "passed", "failed", or "skipped".
// 2. Define an interface TestResult with: title (string), status (Status),
//    durationMs (number), and an OPTIONAL error (string).
// 3. Write summarise(results) that returns { passed, failed, skipped, totalMs }.
//    Annotate the parameter as TestResult[].
// 4. Annotate the `results` array below as TestResult[] too. (Without it,
//    TypeScript infers status as a plain string, which isn't a Status.)

function summarise(results) {
  return { passed: 0, failed: 0, skipped: 0, totalMs: 0 };
}

const results = [
  { title: "login", status: "passed", durationMs: 120 },
  { title: "checkout", status: "failed", durationMs: 2300, error: "Timeout" },
  { title: "search", status: "passed", durationMs: 450 },
  { title: "export", status: "skipped", durationMs: 0 },
];
console.log(summarise(results));
```

```checks
__book.test("summarise counts statuses", () => { const s = summarise(results); return s.passed === 2 && s.failed === 1 && s.skipped === 1; });
__book.test("summarise adds up totalMs (2870)", () => summarise(results).totalMs === 2870);
__book.test("Status is a union of the three literal values", () => /type\s+Status\s*=\s*"[a-z]+"\s*\|\s*"[a-z]+"\s*\|\s*"[a-z]+"/.test(__book.source));
__book.test("TestResult is an interface with an optional error", () => /interface\s+TestResult\b/.test(__book.source) && /error\s*\?\s*:\s*string/.test(__book.source));
__book.test("summarise's parameter is typed as TestResult[]", () => /summarise\s*\(\s*\w+\s*:\s*(TestResult\[\]|Array<TestResult>)/.test(__book.source));
```

```solution
type Status = "passed" | "failed" | "skipped";

interface TestResult {
  title: string;
  status: Status;
  durationMs: number;
  error?: string;
}

function summarise(results: TestResult[]) {
  const summary = { passed: 0, failed: 0, skipped: 0, totalMs: 0 };
  for (const r of results) {
    summary[r.status]++;          // r.status is "passed" | "failed" | "skipped"
    summary.totalMs += r.durationMs;
  }
  return summary;
}

const results: TestResult[] = [
  { title: "login", status: "passed", durationMs: 120 },
  { title: "checkout", status: "failed", durationMs: 2300, error: "Timeout" },
  { title: "search", status: "passed", durationMs: 450 },
  { title: "export", status: "skipped", durationMs: 0 },
];
console.log(summarise(results));
```

`summary[r.status]++` works because `r.status` can only be one of the three keys of `summary`. If `status` were a plain `string`, TypeScript would reject it.

```exercise ts title="Validate an API response"
interface Order {
  id: number;
  total: number;
  items: string[];
}

// Write isOrder(value): a type guard that returns true only if value is an
// object (not null) with a numeric id, a numeric total, and an items array
// whose every element is a string.
function isOrder(value: unknown): value is Order {
  return false;
}

const responses: unknown[] = [
  JSON.parse('{"id": 1, "total": 19.5, "items": ["pen", "book"]}'),
  JSON.parse('{"id": "2", "total": 5, "items": []}'),
  JSON.parse('{"id": 3, "total": 7, "items": ["ok", 42]}'),
  JSON.parse('null'),
];
console.log(responses.map(isOrder));
```

```checks
__book.test("accepts a valid order", () => isOrder({ id: 1, total: 19.5, items: ["pen", "book"] }) === true);
__book.test("accepts an order with no items", () => isOrder({ id: 5, total: 0, items: [] }) === true);
__book.test("rejects a string id", () => isOrder({ id: "2", total: 5, items: [] }) === false);
__book.test("rejects non-string items", () => isOrder({ id: 3, total: 7, items: ["ok", 42] }) === false);
__book.test("rejects a missing items array", () => isOrder({ id: 3, total: 7 }) === false);
__book.test("rejects null and non-objects", () => isOrder(null) === false && isOrder("order") === false);
```

```solution
interface Order {
  id: number;
  total: number;
  items: string[];
}

function isOrder(value: unknown): value is Order {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "number" &&
    typeof v.total === "number" &&
    Array.isArray(v.items) &&
    v.items.every((item) => typeof item === "string")
  );
}

const responses: unknown[] = [
  JSON.parse('{"id": 1, "total": 19.5, "items": ["pen", "book"]}'),
  JSON.parse('{"id": "2", "total": 5, "items": []}'),
  JSON.parse('{"id": 3, "total": 7, "items": ["ok", 42]}'),
  JSON.parse('null'),
];
console.log(responses.map(isOrder));
```

## Quiz

```quiz
[
  {
    "q": "Which declaration allows only the values `\"GET\"`, `\"POST\"`, and `\"DELETE\"`?",
    "options": [
      "`type Method = string;`",
      "`type Method = \"GET\" | \"POST\" | \"DELETE\";`",
      "`type Method = [\"GET\", \"POST\", \"DELETE\"];`",
      "`interface Method { GET; POST; DELETE }`"
    ],
    "answer": 1,
    "why": "A union of string literal types allows exactly those values, and TypeScript reports typos."
  },
  {
    "q": "`id` has type `string | number`. Why is `id.toUpperCase()` an error?",
    "options": [
      "`toUpperCase` doesn't exist",
      "With a union, you can only use what every member supports, and numbers don't have `toUpperCase`",
      "Unions can't have methods",
      "It isn't an error"
    ],
    "answer": 1,
    "why": "Narrow first, e.g. `if (typeof id === \"string\") id.toUpperCase();`."
  },
  {
    "q": "What does `JSON.parse(text) as User` do when the code runs?",
    "options": [
      "Checks that the data matches `User` and throws if not",
      "Converts the data into a `User`",
      "Nothing; it only tells TypeScript to treat the value as `User`",
      "Removes fields that aren't in `User`"
    ],
    "answer": 2,
    "why": "Type assertions are erased. They don't check anything, so wrong data passes silently. Use a type guard or assertions to check it."
  },
  {
    "q": "What's the difference between `any` and `unknown`?",
    "options": [
      "None",
      "`any` allows everything without checks; `unknown` must be narrowed before you can use it",
      "`unknown` only holds strings",
      "`any` is safer"
    ],
    "answer": 1,
    "why": "`unknown` is the safe type for data you haven't checked yet, such as parsed JSON."
  },
  {
    "q": "In a discriminated union like `{ ok: true; data: … } | { ok: false; error: string }`, what lets TypeScript narrow it?",
    "options": [
      "The order of the members",
      "A shared field (`ok`) with a different literal value in each member",
      "The `as` keyword",
      "Using `any`"
    ],
    "answer": 1,
    "why": "Checking the shared field (`if (result.ok)`) tells TypeScript which member you have."
  },
  {
    "q": "What does a function with return type `value is User` do?",
    "options": [
      "Converts `value` to a `User`",
      "Returns a boolean, and when it's `true` TypeScript narrows `value` to `User`",
      "Throws if `value` isn't a `User`",
      "Declares a new class"
    ],
    "answer": 1,
    "why": "That's a type predicate. The function does a real check at runtime, and TypeScript uses its result to narrow the type."
  }
]
```

## Sources

The TypeScript messages were produced by TypeScript 7.0.2, and the runtime examples were run with Node.js v24.18.0. Playwright's `json()` return type was read from the type definitions in Playwright 1.65.0.

- TypeScript Handbook, *Everyday Types* (unions, type aliases vs interfaces, literal types, type assertions, non-null assertion): [typescriptlang.org/docs/handbook/2/everyday-types.html](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- TypeScript Handbook, *Narrowing* (type guards, `in`, `instanceof`, discriminated unions, `never` and exhaustiveness): [typescriptlang.org/docs/handbook/2/narrowing.html](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- TypeScript Handbook, *Object Types* (extending interfaces, intersections): [typescriptlang.org/docs/handbook/2/objects.html](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- TypeScript docs, *unknown* (TypeScript 3.0 release notes): [typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html#new-unknown-top-type](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html#new-unknown-top-type)
- Playwright, *APIResponse.json*: [playwright.dev/docs/api/class-apiresponse#api-response-json](https://playwright.dev/docs/api/class-apiresponse#api-response-json)
- Playwright, *GenericAssertions* (`expect.objectContaining`, `expect.any`): [playwright.dev/docs/api/class-genericassertions](https://playwright.dev/docs/api/class-genericassertions)
