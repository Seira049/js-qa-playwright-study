This last chapter of Part 1 covers three things you'll meet as soon as you read real test code: **generics** (the `<T>` in `Promise<T>` and `test.extend<…>`), **utility types** such as `Partial` and `Omit` that build new types from existing ones, and **`tsconfig.json`**, the file that controls how TypeScript checks your project.

**In this chapter you will learn:**

- what generics are, and how to write a generic function and interface
- constraints with `extends`, and `keyof`
- the utility types you'll use most: `Partial`, `Required`, `Pick`, `Omit`, `Readonly`, `Record`, `ReturnType`
- how they make test-data builders and API types safer
- what's in a `tsconfig.json`, and how to type-check a Playwright project

## 12.1 Generics: types with a parameter

You've already used generic types: `Array<number>`, `Promise<string>`. The part in angle brackets is a **type parameter**: it fills in a type that the generic code doesn't fix in advance.

Here's why you'd want one. This function works for any array, but its return type is fixed:

```ts
function firstNumber(items: number[]): number | undefined {
  return items[0];
}
```

You'd need a separate version for strings, users, and so on. A **generic function** takes the type as a parameter, conventionally called `T`:

```ts run
function first<T>(items: T[]): T | undefined {
  return items[0];
}

const n = first([10, 20]);        // T is number, so n is number | undefined
const s = first(["a", "b"]);      // T is string
const wrong: string = first([1, 2]);
console.log(n, s);
```

TypeScript **infers** `T` from the argument, so you rarely write it yourself. The last line is an error: `Type 'number | undefined' is not assignable to type 'string'.`

### Generic interfaces

Generics are perfect for API response wrappers, where the outer shape is always the same but the data differs:

```ts run
interface ApiResponse<T> {
  status: number;
  data: T;
}

interface User {
  id: number;
  name: string;
}

const usersResponse: ApiResponse<User[]> = {
  status: 200,
  data: [{ id: 1, name: "Ana" }],
};
const countResponse: ApiResponse<number> = { status: 200, data: 42 };

console.log(usersResponse.data[0].name, countResponse.data);
```

```output
Ana 42
```

### Constraints: T extends …

Sometimes the generic code needs `T` to have certain properties. `T extends { id: number }` means "any type, as long as it has a numeric `id`":

```ts run
function findById<T extends { id: number }>(items: T[], id: number): T | undefined {
  return items.find((item) => item.id === id);
}

const users = [{ id: 1, name: "Ana" }, { id: 2, name: "Ben" }];
console.log(findById(users, 2)?.name);   // the result is still typed as a user

findById([{ name: "no id" }], 1);        // error: these items have no id
```

TypeScript reports: `Object literal may only specify known properties, and 'name' does not exist in type '{ id: number; }'.`

### keyof

`keyof T` is the union of a type's property names. Combined with generics, it gives you functions that only accept real keys:

```ts run
interface User {
  id: number;
  email: string;
}

function getField<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user: User = { id: 1, email: "ana@test.io" };
const email = getField(user, "email");  // typed as string
const phone = getField(user, "phone");  // "phone" isn't a key of User
console.log(email);
```

`T[K]` means "the type of property `K` in `T`". The bad key is reported as not assignable to the parameter type, which is `keyof User`.

### Where you'll see generics in Playwright

Custom fixtures (Part 2) are typed with a generic. The type parameter lists the fixtures and their types:

```ts title="Read-only example"
import { test as base } from "@playwright/test";
import { LoginPage } from "./pages/login-page";

export const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
```

## 12.2 Utility types

TypeScript includes generic types that **transform** other types. These are the ones you'll use in tests:

| Utility | Result | Typical use |
|---|---|---|
| `Partial<T>` | every property optional | "overrides" for a test-data builder |
| `Required<T>` | every property required | a fully filled-in config |
| `Pick<T, "a" \| "b">` | only those properties | a login form needs only `email` and `password` |
| `Omit<T, "id">` | every property **except** those | a create-user payload (the server assigns `id`) |
| `Readonly<T>` | every property read-only | shared fixtures that must not be changed |
| `Record<K, V>` | an object with keys `K` and values `V` | counts per status, lookup tables |
| `ReturnType<typeof fn>` | what a function returns | reuse a helper's result type |

### Partial: a typed test-data builder

The `buildUser` builder from Chapter 6, now with types. `Partial<User>` lets callers pass any subset of fields, and TypeScript still checks every value:

```ts run
interface User {
  id: number;
  name: string;
  role: "admin" | "qa" | "viewer";
}

function buildUser(overrides: Partial<User> = {}): User {
  return { id: 1, name: "Test User", role: "qa", ...overrides };
}

console.log(buildUser({ role: "admin" }));
buildUser({ role: "owner" });   // not an allowed role
```

TypeScript reports `Type '"owner"' is not assignable to type '"admin" | "qa" | "viewer" | undefined'.` The `| undefined` is there because `Partial` makes every field optional.

### Omit and Pick: request payloads

```ts run
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

type CreateUserRequest = Omit<User, "id">;              // the server assigns id
type LoginRequest = Pick<User, "email" | "password">;

const create: CreateUserRequest = { name: "Ana", email: "ana@test.io", password: "s3cret" };
const login: LoginRequest = { email: "ana@test.io", password: "s3cret" };
const withId: CreateUserRequest = { id: 5, name: "Ben", email: "b@t.io", password: "x" };
console.log(create.name, login.email);
```

The last object is an error, because `id` was omitted: `Object literal may only specify known properties, and 'id' does not exist in type 'CreateUserRequest'.` When the `User` type changes, the derived types change with it.

### Record and Readonly

```ts run
type Status = "passed" | "failed" | "skipped";

const counts: Record<Status, number> = { passed: 4, failed: 1, skipped: 0 };
const incomplete: Record<Status, number> = { passed: 4 };   // missing keys

const baseConfig: Readonly<{ baseURL: string; retries: number }> = {
  baseURL: "https://shop.test",
  retries: 2,
};
baseConfig.retries = 0;   // read-only
console.log(counts);
```

`Record<Status, number>` requires **every** status as a key, so the second object is reported as missing `failed` and `skipped`. Assigning to `baseConfig.retries` gives `Cannot assign to 'retries' because it is a read-only property.`

### ReturnType

```ts run
function makeTestUser() {
  return { id: 1, active: true };
}
type TestUser = ReturnType<typeof makeTestUser>;   // { id: number; active: boolean }

const u: TestUser = { id: 2, active: false };
console.log(u);
```

```output
{ id: 2, active: false }
```

## 12.3 tsconfig.json

`tsconfig.json` sits at the root of a project and tells TypeScript how to check it. When you run `npx tsc` **without** file names, TypeScript uses it.

### Creating one

```bash
npx tsc --init
```

With TypeScript 7.0.2, that creates a file whose active settings are:

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "target": "esnext",
    "types": [],
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "strict": true,
    "jsx": "react-jsx",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  }
}
```

The options that matter most for test code:

| Option | What it does |
|---|---|
| `strict` | turns on all strict checks (`null` checks, no implicit `any`, `unknown` in `catch`, …). Keep it on. |
| `target` | which JavaScript version to output. `esnext` means the latest. |
| `module` / `moduleResolution` | how `import` paths are found (Chapter 8) |
| `noEmit` | only check, don't write `.js` files. Useful for tests, which Playwright runs itself. |
| `types` | which global type packages to load. TypeScript 6.0 changed the default to `[]`, so globals from `@types/node` (such as `process`) need `"types": ["node"]`. |
| `noUncheckedIndexedAccess` | `items[0]` has type `T \| undefined`, because the index might not exist |
| `verbatimModuleSyntax` | requires `import type` for type-only imports (Chapter 8) |
| `moduleDetection: "force"` | treats every file as a module, which avoids the `name` clash from Chapter 1 |
| `include` | which files to check, e.g. `["tests", "pages", "playwright.config.ts"]` |

### TypeScript in a Playwright project

Two facts from the Playwright docs to keep in mind:

1. **Playwright doesn't type-check.** It transforms TypeScript and runs tests *"even if there are non-critical TypeScript compilation errors."* Run `npx tsc -p tsconfig.json --noEmit` yourself, locally or as a CI step, as the docs recommend.
2. **Playwright reads only some tsconfig options** when it loads your files: `allowJs`, `baseUrl`, `paths`, `jsx`, `jsxFactory`, `jsxFragmentFactory`, `jsxImportSource`, `useDefineForClassFields`, `references`, and `extends`. Options like `strict` affect `tsc`'s checking, not how Playwright runs the tests.

A small, practical `tsconfig.json` for a Playwright test project:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "types": ["node"],
    "skipLibCheck": true
  },
  "include": ["tests", "pages", "fixtures", "playwright.config.ts"]
}
```

Then type-check the whole project with:

```bash
npx tsc --noEmit
```

`"types": ["node"]` needs the `@types/node` package (`npm install -D @types/node`), which gives you types for things like `process.env`. `"moduleResolution": "bundler"` allows the extension-less imports that Playwright projects commonly use (Chapter 8).

## Exercises

```exercise ts title="Typed test data"
interface Product {
  id: number;
  name: string;
  price: number;
  category: "books" | "games" | "music";
}

// 1. Write a generic function lastItem that returns the last element of any
//    array, or undefined if the array is empty. Its return type must follow
//    the array's item type.
function lastItem(items: number[]): number | undefined {
  return undefined;
}

// 2. Write buildProduct(overrides) using Partial<Product>. Defaults:
//    { id: 1, name: "Test Product", price: 10, category: "books" }
function buildProduct(): Product {
  return { id: 0, name: "", price: 0, category: "books" };
}

// 3. Define CreateProductRequest: Product without the id (use Omit).
type CreateProductRequest = Product;

// 4. Use Record to count products per category.
const perCategory = { books: 0, games: 0, music: 0 };

const lastLetter: string | undefined = lastItem(["a", "b"]);
const request: CreateProductRequest = { name: "Chess", price: 25, category: "games" };
console.log(lastLetter, buildProduct({ price: 99 }), request, perCategory);
```

```checks
__book.test("lastItem([1, 2, 3]) is 3", () => lastItem([1, 2, 3]) === 3);
__book.test("lastItem([]) is undefined", () => lastItem([]) === undefined);
__book.test('lastItem works for strings ("b")', () => lastItem(["a", "b"]) === "b");
__book.test("lastItem is generic (<T>)", () => /function\s+lastItem\s*<\s*\w+\s*>/.test(__book.source));
__book.test("buildProduct() returns the defaults", () => JSON.stringify(buildProduct()) === '{"id":1,"name":"Test Product","price":10,"category":"books"}');
__book.test("buildProduct({ price: 99 }) overrides the price", () => buildProduct({ price: 99 }).price === 99 && buildProduct({ price: 99 }).name === "Test Product");
__book.test("buildProduct uses Partial<Product>", () => /Partial\s*<\s*Product\s*>/.test(__book.source));
__book.test("CreateProductRequest uses Omit<Product, \"id\">", () => /Omit\s*<\s*Product\s*,\s*["']id["']\s*>/.test(__book.source));
__book.test("perCategory is typed with Record", () => /perCategory\s*:\s*Record\s*</.test(__book.source));
```

```solution
interface Product {
  id: number;
  name: string;
  price: number;
  category: "books" | "games" | "music";
}

function lastItem<T>(items: T[]): T | undefined {
  return items[items.length - 1];
}

function buildProduct(overrides: Partial<Product> = {}): Product {
  return { id: 1, name: "Test Product", price: 10, category: "books", ...overrides };
}

type CreateProductRequest = Omit<Product, "id">;

const perCategory: Record<Product["category"], number> = { books: 0, games: 0, music: 0 };

const lastLetter: string | undefined = lastItem(["a", "b"]);
const request: CreateProductRequest = { name: "Chess", price: 25, category: "games" };
console.log(lastLetter, buildProduct({ price: 99 }), request, perCategory);
```

`Product["category"]` is an *indexed access type*: the type of `Product`'s `category` property, `"books" | "games" | "music"`. If someone adds a category to `Product`, TypeScript will report that `perCategory` is missing it.

## Quiz

```quiz
[
  {
    "q": "In `function first<T>(items: T[]): T | undefined`, what is `T` when you call `first([\"x\", \"y\"])`?",
    "options": ["`any`", "`string`", "`string[]`", "`unknown`"],
    "answer": 1,
    "why": "TypeScript infers `T` from the argument: an array of strings means `T` is `string`."
  },
  {
    "q": "Which utility type makes every property of `User` optional?",
    "options": ["`Required<User>`", "`Partial<User>`", "`Pick<User>`", "`Readonly<User>`"],
    "answer": 1,
    "why": "`Partial<T>` makes every property optional, which is ideal for builder overrides."
  },
  {
    "q": "A create-user API takes everything in `User` except `id`. Which type describes the request body?",
    "options": ["`Pick<User, \"id\">`", "`Omit<User, \"id\">`", "`Partial<User>`", "`Record<User, \"id\">`"],
    "answer": 1,
    "why": "`Omit<User, \"id\">` keeps every property except `id`. `Pick` would keep *only* `id`."
  },
  {
    "q": "What does `function byId<T extends { id: number }>(items: T[])` require?",
    "options": [
      "`T` must be exactly `{ id: number }`",
      "Each item must have at least a numeric `id`; other properties are allowed",
      "`T` must be a number",
      "Nothing"
    ],
    "answer": 1,
    "why": "`extends` is a constraint: `T` can be any type that has the listed properties."
  },
  {
    "q": "Does Playwright Test stop a run when your TypeScript has type errors?",
    "options": [
      "Yes, always",
      "No; it transforms and runs the tests anyway, so run `tsc --noEmit` separately",
      "Only in CI",
      "Only if `strict` is on"
    ],
    "answer": 1,
    "why": "The Playwright docs say it doesn't check types and recommend running the TypeScript compiler alongside it."
  },
  {
    "q": "What does `noEmit` do in `tsconfig.json`?",
    "options": [
      "Disables type checking",
      "Checks types without writing `.js` output files",
      "Hides error messages",
      "Stops Playwright from running"
    ],
    "answer": 1,
    "why": "With `noEmit`, `tsc` only reports problems, which is what you want for code that another tool (Playwright) runs."
  }
]
```

## Sources

The TypeScript messages and the `tsc --init` output were produced by TypeScript 7.0.2. The example that runs was run with Node.js v24.18.0.

- TypeScript Handbook, *Generics*: [typescriptlang.org/docs/handbook/2/generics.html](https://www.typescriptlang.org/docs/handbook/2/generics.html) (type parameters, inference, constraints)
- TypeScript Handbook, *Keyof Type Operator* and *Indexed Access Types*: [typescriptlang.org/docs/handbook/2/keyof-types.html](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html), [typescriptlang.org/docs/handbook/2/indexed-access-types.html](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
- TypeScript Handbook, *Utility Types*: [typescriptlang.org/docs/handbook/utility-types.html](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- TypeScript, *TSConfig reference*: [typescriptlang.org/tsconfig](https://www.typescriptlang.org/tsconfig)
- TypeScript 6.0 release notes (`strict` on by default, `types` defaults to `[]`): [typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
- Playwright, *TypeScript* (no type checking; supported tsconfig options; run `tsc --noEmit`): [playwright.dev/docs/test-typescript](https://playwright.dev/docs/test-typescript)
- Playwright, *Fixtures* (`test.extend<…>`): [playwright.dev/docs/test-fixtures](https://playwright.dev/docs/test-fixtures)
