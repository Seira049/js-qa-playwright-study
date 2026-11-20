Chapters 11 and 12 covered the TypeScript you write every day. Open an existing test project, though, and you'll meet a few more things: tuples, `enum`, `satisfies`, `keyof typeof`, interfaces that classes `implements`, abstract base pages, and custom error classes. This chapter explains each one: what it does, when it helps, and the traps.

**In this chapter you will learn:**

- tuples: fixed-length arrays with a type per position
- `enum` vs union types, and why many teams now avoid `enum`
- `as const` objects and `keyof typeof`
- `satisfies`: checking a value without losing its precise type
- index signatures and `Record` for objects with any keys
- assertion functions: `asserts value is …`
- `implements`, abstract classes, and `override`
- custom error classes for clear test failures

## 16.1 Tuples

A **tuple** is an array with a fixed length, where each position has its own type. You'll see them when a function returns two related values:

```ts run
// [status code, message]
const result: [number, string] = [404, "Not Found"];
const [code, message] = result;            // destructure by position (Chapter 5)
console.log(code + 1, message.toUpperCase());

const wrong: [string, number] = [1, "a"];  // wrong type in each position
```

TypeScript reports `Type 'number' is not assignable to type 'string'.` and `Type 'string' is not assignable to type 'number'.` for `wrong`.

You can name the positions, which shows up in editor hints, and make the tuple `readonly`:

```ts run
const range: readonly [min: number, max: number] = [1, 5];
range[0] = 2;                               // readonly
console.log(range);
```

TypeScript reports `Cannot assign to '0' because it is a read-only property.`

Use a tuple for **two or three** values whose meaning is obvious from the position. For more, an object with named properties is clearer: `{ status: 404, message: "Not Found" }`.

## 16.2 enum vs union types

An `enum` names a set of constant values:

```ts run
enum Role {
  Admin = "admin",
  Qa = "qa",
}

const role: Role = Role.Admin;
console.log(role);
console.log(Object.keys(Role));
```

```output
admin
[ 'Admin', 'Qa' ]
```

Unlike almost everything else in TypeScript, an `enum` **creates a real JavaScript object** when the code runs. The TypeScript Handbook says it's *"not a type-level addition to JavaScript but something added to the language and runtime"*, and suggests you *"maybe hold off on using unless you are sure."*

That has practical consequences:

- **Node.js type stripping refuses it.** `node file.ts` fails with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX: TypeScript enum is not supported in strip-only mode` (Chapter 1). Playwright Test transforms TypeScript itself, so enums do work in Playwright tests.
- **Strings from an API don't match without a cast.** `const r: Role = "admin";` is an error (`Type '"admin"' is not assignable to type 'Role'.`), even though `Role.Admin` *is* `"admin"` when the code runs. JSON never contains enum values, only strings.
- **Numeric enums have surprising keys.** `enum Level { Low, High }` makes `Object.keys(Level)` return `[ '0', '1', 'Low', 'High' ]`, because numeric enums map in both directions.

The common alternative is a **union of string literals** (Chapter 11), plus an `as const` array when you also need the list at runtime:

```ts run
const ROLES = ["admin", "qa", "viewer"] as const;
type Role = (typeof ROLES)[number];       // "admin" | "qa" | "viewer"

const fromApi: Role = "admin";            // plain strings work
for (const role of ROLES) console.log(role);
```

```output
admin
qa
viewer
```

> **erasableSyntaxOnly:** TypeScript 5.8 added the `erasableSyntaxOnly` option. With it on, TypeScript reports `This syntax is not allowed when 'erasableSyntaxOnly' is enabled.` for `enum`, parameter properties (Chapter 9), and the other features that generate JavaScript. The Node.js docs recommend it for code that Node.js runs directly. Seeing it in a `tsconfig.json` tells you the project avoids those features.

## 16.3 as const objects and keyof typeof

A frequent pattern for fixed lookups, such as status labels or routes:

```ts run
const STATUS_LABELS = {
  passed: "Passed",
  failed: "Failed",
  skipped: "Skipped",
} as const;

type Status = keyof typeof STATUS_LABELS;   // "passed" | "failed" | "skipped"

function label(status: Status): string {
  return STATUS_LABELS[status];
}
console.log(label("failed"));

const bad: Status = "flaky";                // not a key
```

```output
Failed
```

Read `keyof typeof STATUS_LABELS` from the inside out:

- `typeof STATUS_LABELS` turns the **value** into its **type** (TypeScript's `typeof`, used in a type position, is different from JavaScript's `typeof` operator from Chapter 2).
- `keyof` takes the union of that type's keys.

Add a status to the object, and the `Status` type updates automatically. The last line is reported as `Type '"flaky"' is not assignable to type '"passed" | "failed" | "skipped"'.`

## 16.4 satisfies

Sometimes you want TypeScript to **check** that a value matches a type, while still remembering the value's **exact** shape. Annotating with `: Type` checks it, but replaces the precise type with the general one. `satisfies` (TypeScript 4.9 and later) does the check and keeps the precise type:

```ts run
const routes = {
  login: "/practice/login.html",
  dashboard: "/practice/dashboard.html",
} satisfies Record<string, string>;

console.log(routes.login.toUpperCase());   // TypeScript knows login exists
console.log(routes.profile);               // and knows profile doesn't
```

TypeScript reports `Property 'profile' does not exist on type '{ login: string; dashboard: string; }'.` With the annotation `const routes: Record<string, string> = …` instead, `routes.profile` would be **allowed** (typed as `string`), and you'd get `undefined` when the code runs.

`satisfies` also catches typos and wrong values in configuration objects:

```ts run
type TestConfig = { baseURL: string; retries: number };

const config = {
  baseURL: "https://staging.shop.test",
  retries: "2",          // should be a number
} satisfies TestConfig;
console.log(config);
```

TypeScript reports `Type 'string' is not assignable to type 'number'.` Playwright's own `defineConfig` gives you the same checking for `playwright.config.ts`.

## 16.5 Index signatures and Record

When an object can have **any** keys, but every value has the same type, such as HTTP headers or translations, use an **index signature** or `Record`:

```ts run
interface Headers {
  [name: string]: string;                  // any string key, string values
}
const headers: Headers = { accept: "application/json", "x-request-id": "abc" };

const counts: Record<string, number> = {}; // the same idea with Record
counts["passed"] = (counts["passed"] ?? 0) + 1;
console.log(headers.accept, counts);

const badHeaders: Headers = { retries: 3 }; // number, not string
```

```output
application/json { passed: 1 }
```

The last line is reported as `Type 'number' is not assignable to type 'string'.`

> **Trap:** with an index signature, TypeScript assumes **every** key exists. `headers.authorization.toUpperCase()` compiles, then throws when the header is missing. The `noUncheckedIndexedAccess` option (it's on in a `tsconfig.json` made by `tsc --init`, Chapter 12) makes such lookups `string | undefined`, so TypeScript reminds you to check.

For a fixed set of keys, prefer a union key type: `Record<"passed" | "failed", number>` requires both keys (Chapter 12).

## 16.6 Assertion functions

Chapter 11 showed **type guards**, functions that return `value is Type`. An **assertion function** is the throwing version: if it returns at all, the value is known to have the type from then on.

```ts run
function assertDefined<T>(value: T, name: string): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(`Expected ${name} to be defined`);
  }
}

const token = new URL("https://shop.test/?token=abc").searchParams.get("token"); // string | null
assertDefined(token, "token");
console.log(token.toUpperCase());           // narrowed to string, no ?. needed

const missing = new URL("https://shop.test/").searchParams.get("token");
assertDefined(missing, "token");             // throws
console.log("never reached");
```

This prints `ABC`, then stops with `Error: Expected token to be defined`. `"never reached"` is never printed.

`NonNullable<T>` is a utility type that removes `null` and `undefined`. Assertion functions are a natural fit for test helpers: they fail with a clear message, and the code after them stays simple.

> **Use a `function` declaration.** If you write an assertion function as an arrow function in a `const`, calling it is an error (`Assertions require every name in the call target to be declared with an explicit type annotation.`) unless the variable itself has a type annotation.

## 16.7 implements, abstract classes, and override

### implements: a class promises a shape

`class X implements SomeInterface` asks TypeScript to check that the class has everything the interface lists. It's useful when several classes must be interchangeable, such as different reporters or different API clients:

```ts run
interface Reporter {
  report(message: string): void;
}

class ConsoleReporter implements Reporter {
  report(message: string): void {
    console.log(`[report] ${message}`);
  }
}

class SilentReporter implements Reporter {
  log(message: string): void {}             // wrong method name
}

const reporters: Reporter[] = [new ConsoleReporter()];
for (const r of reporters) r.report("run finished");
```

```output
[report] run finished
```

TypeScript reports `Class 'SilentReporter' incorrectly implements interface 'Reporter'.` and `Property 'report' is missing in type 'SilentReporter' but required in type 'Reporter'.`

### Abstract classes: a base you can't use directly

An `abstract` class is a base class that can't be created with `new`. It can list `abstract` members that every subclass **must** provide. In test code, it's a way to share behaviour between page objects (Chapters 9 and 20):

```ts run
abstract class BasePage {
  abstract readonly path: string;           // each page must say where it lives

  url(base: string): string {
    return new URL(this.path, base).href;   // shared behaviour (Chapter 14)
  }
}

class LoginPage extends BasePage {
  readonly path = "/practice/login.html";
}

console.log(new LoginPage().url("https://shop.test"));
const base = new BasePage();                // not allowed
```

```output
https://shop.test/practice/login.html
```

TypeScript reports `Cannot create an instance of an abstract class.`, and a subclass that forgets `path` gets `Non-abstract class 'X' does not implement inherited abstract member path from class 'BasePage'.` Like `private`, `abstract` exists only for TypeScript and is removed when the code runs.

### override

When a subclass replaces a method from its parent, `override` makes that explicit:

```ts
class AdminPage extends LoginPage {
  override url(base: string): string {
    return super.url(base) + "?admin=1";
  }
}
```

Writing `override` on a method the parent **doesn't** have is always an error (`This member cannot have an 'override' modifier because it is not declared in the base class`), which catches misspelled or renamed methods. With the `noImplicitOverride` option, TypeScript also **requires** `override` whenever a method replaces one from the parent.

## 16.8 Custom error classes

`throw new Error("...")` gives you only a message. A custom error class (Chapter 9's `extends`, applied to `Error`) can carry extra details, and tests can check its type with `instanceof`:

```ts run
class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);              // sets message (and the stack trace)
    this.name = "ApiError";      // shown in front of the message
    this.status = status;
  }
}

try {
  throw new ApiError(404, "User 9 not found");
} catch (err) {
  if (err instanceof ApiError) {
    console.log(err.name, err.status, err.message);
    console.log(err instanceof Error, String(err));
  }
}
```

```output
ApiError 404 User 9 not found
true ApiError: User 9 not found
```

- Call `super(message)` first: it's required before using `this` (Chapter 9), and it's what sets `message`.
- Set `this.name`, so test output says `ApiError: …` instead of `Error: …`.
- In `catch`, `err` is `unknown` (Chapter 7). `instanceof ApiError` narrows it, so `err.status` is typed.

The field is declared and assigned in the constructor, instead of using a parameter property (`constructor(readonly status: number, …)`), so the class also runs with Node.js type stripping (16.2).

## Exercises

```exercise ts title="A typed API helper"
// 1. Create a class HttpError that extends Error, with a readonly `status`
//    (number) and `url` (string). Its name must be "HttpError", and its message
//    "<status> for <url>", e.g. "404 for /api/users/9".
//
// 2. Write an ASSERTION function assertOk(response) that throws an HttpError
//    when response.ok is false. Its signature must use `asserts`.
//
// 3. Call assertOk on okResponse (it shouldn't throw), and on badResponse
//    inside try/catch, logging the error's status if it's an HttpError.

type ResponseLike = { ok: boolean; status: number; url: string };
const okResponse: ResponseLike = { ok: true, status: 200, url: "/api/users" };
const badResponse: ResponseLike = { ok: false, status: 404, url: "/api/users/9" };
```

```checks
let __e: unknown;
try { assertOk(badResponse); } catch (e) { __e = e; }
__book.test("HttpError extends Error", () => new HttpError(500, "/x") instanceof Error);
__book.test('name is "HttpError"', () => new HttpError(500, "/x").name === "HttpError");
__book.test('message is "404 for /api/users/9"', () => __e instanceof HttpError && __e.message === "404 for /api/users/9");
__book.test("status and url are set", () => __e instanceof HttpError && __e.status === 404 && __e.url === "/api/users/9");
__book.test("assertOk doesn't throw for an OK response", () => { try { assertOk(okResponse); return true; } catch { return false; } });
__book.test("assertOk is an assertion function (uses asserts)", () => /function\s+assertOk\s*\([^)]*\)\s*:\s*asserts\b/.test(__book.source));
```

```solution
type ResponseLike = { ok: boolean; status: number; url: string };
const okResponse: ResponseLike = { ok: true, status: 200, url: "/api/users" };
const badResponse: ResponseLike = { ok: false, status: 404, url: "/api/users/9" };

class HttpError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(status: number, url: string) {
    super(`${status} for ${url}`);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
  }
}

function assertOk(response: ResponseLike): asserts response is ResponseLike & { ok: true } {
  if (!response.ok) throw new HttpError(response.status, response.url);
}

assertOk(okResponse);
try {
  assertOk(badResponse);
} catch (err) {
  if (err instanceof HttpError) console.log("failed with", err.status);
}
```

`asserts response is ResponseLike & { ok: true }` tells TypeScript that after the call, `ok` is `true`. (The shorter form `asserts response` would only promise that `response` is truthy, which an object always is, so it says nothing useful here.)

```exercise ts title="Typed test settings"
// 1. Make BROWSERS a readonly list using `as const`, and derive a type
//    BrowserName from it ("chromium" | "firefox" | "webkit").
const BROWSERS = ["chromium", "firefox", "webkit"];

// 2. Define `settings` so it's CHECKED against the Settings type with
//    `satisfies` (not a `: Settings` annotation). Use browser "firefox" and retries 2.
type Settings = { browser: string; retries: number };
const settings = { browser: "firefox", retries: 2 };

// 3. Write isBrowserName(value: string): value is BrowserName
//    using BROWSERS.includes(...).

console.log(settings, isBrowserName("webkit"), isBrowserName("edge"));
```

```checks
__book.test("BROWSERS uses as const", () => /BROWSERS\s*=\s*\[[^\]]*\]\s*as\s+const/.test(__book.source));
__book.test("BrowserName is derived from BROWSERS", () => /type\s+BrowserName\s*=\s*\(?\s*typeof\s+BROWSERS\s*\)?\s*\[\s*number\s*\]/.test(__book.source));
__book.test("settings uses satisfies", () => /\}\s*satisfies\s+Settings/.test(__book.source));
__book.test("settings has browser firefox and retries 2", () => settings.browser === "firefox" && settings.retries === 2);
__book.test("isBrowserName works", () => isBrowserName("webkit") === true && isBrowserName("edge") === false);
__book.test("isBrowserName is a type guard (value is BrowserName)", () => /\)\s*:\s*value\s+is\s+BrowserName/.test(__book.source));
```

```solution
const BROWSERS = ["chromium", "firefox", "webkit"] as const;
type BrowserName = (typeof BROWSERS)[number];

type Settings = { browser: string; retries: number };
const settings = { browser: "firefox", retries: 2 } satisfies Settings;

function isBrowserName(value: string): value is BrowserName {
  return (BROWSERS as readonly string[]).includes(value);
}

console.log(settings, isBrowserName("webkit"), isBrowserName("edge"));
```

`(BROWSERS as readonly string[])` is needed because `includes` on a list of exact literals only accepts those literals. Widening the list to `readonly string[]` lets it accept any string, which is the point of the check.

## Quiz

```quiz
[
  {
    "q": "Why does `node file.ts` fail on a file that declares an `enum`?",
    "options": [
      "Node.js doesn't support TypeScript at all",
      "An enum creates real JavaScript code, and Node.js only strips types",
      "Enums must be in their own file",
      "Enums need `export`"
    ],
    "answer": 1,
    "why": "Type stripping can only delete types. Enums need code generation, so Node.js reports ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX."
  },
  {
    "q": "What type is `Key` in `const LABELS = { ok: \"OK\", err: \"Error\" } as const; type Key = keyof typeof LABELS;`?",
    "options": ["`string`", "`\"OK\" | \"Error\"`", "`\"ok\" | \"err\"`", "`object`"],
    "answer": 2,
    "why": "`typeof` gets the object's type, and `keyof` takes its keys."
  },
  {
    "q": "What's the difference between `const c: Config = {...}` and `const c = {...} satisfies Config`?",
    "options": [
      "None",
      "Both check the object; `satisfies` also keeps its exact type, so TypeScript knows which properties really exist",
      "`satisfies` skips type checking",
      "`satisfies` works only for arrays"
    ],
    "answer": 1,
    "why": "An annotation replaces the precise type with `Config`. `satisfies` checks against `Config` without losing detail."
  },
  {
    "q": "What does `function assertDefined(v: unknown): asserts v is string` tell TypeScript?",
    "options": [
      "That the function returns a string",
      "That if the function returns (doesn't throw), `v` is a string from then on",
      "That `v` is always a string",
      "Nothing; it's a comment"
    ],
    "answer": 1,
    "why": "Assertion functions narrow the type for the code after the call, and throw otherwise."
  },
  {
    "q": "Why set `this.name = \"ApiError\"` in a custom error class?",
    "options": [
      "It's required for `instanceof`",
      "So messages and test output show `ApiError: …` instead of `Error: …`",
      "To make the error serialisable",
      "It sets the HTTP status"
    ],
    "answer": 1,
    "why": "`instanceof` works without it. `name` is what appears in front of the message when the error is printed."
  },
  {
    "q": "What does `abstract` on a base class do?",
    "options": [
      "Makes the class faster",
      "Stops it from being created with `new`, and can require subclasses to provide certain members",
      "Hides it from other files",
      "Makes all its methods private"
    ],
    "answer": 1,
    "why": "Abstract classes are only for extending. TypeScript checks that subclasses implement the abstract members."
  }
]
```

## Sources

Every example was run in the playground and with Node.js v24.18.0 (after compiling where needed), and the TypeScript messages were produced by TypeScript 7.0.2.

- TypeScript Handbook, *Object Types* (tuples, readonly tuples, index signatures): [typescriptlang.org/docs/handbook/2/objects.html](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- TypeScript Handbook, *Enums*, and *Everyday Types* (enums add runtime code; "hold off on using unless you are sure"): [typescriptlang.org/docs/handbook/enums.html](https://www.typescriptlang.org/docs/handbook/enums.html), [typescriptlang.org/docs/handbook/2/everyday-types.html](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- TypeScript Handbook, *Typeof Type Operator* and *Keyof Type Operator*: [typescriptlang.org/docs/handbook/2/typeof-types.html](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html), [typescriptlang.org/docs/handbook/2/keyof-types.html](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- TypeScript 4.9 release notes (`satisfies`): [typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)
- TypeScript 3.7 release notes (assertion functions): [typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions)
- TypeScript 5.8 release notes (`erasableSyntaxOnly`): [typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html)
- TypeScript Handbook, *Classes* (`implements`, `abstract`, `override`): [typescriptlang.org/docs/handbook/2/classes.html](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- TypeScript, *TSConfig reference* (`noUncheckedIndexedAccess`, `noImplicitOverride`): [typescriptlang.org/tsconfig](https://www.typescriptlang.org/tsconfig)
- MDN, *Error* (custom error types): [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types)
- Node.js docs, *Modules: TypeScript* (enums unsupported in strip-only mode; recommended `erasableSyntaxOnly`): [nodejs.org/api/typescript.html](https://nodejs.org/api/typescript.html)
