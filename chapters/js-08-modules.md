A real test project has many files: test files, page objects, helpers, test data, and configuration. **Modules** are how those files share code. Every Playwright test file starts with one: `import { test, expect } from "@playwright/test";`. This chapter explains how `import` and `export` work, the two module systems you'll run into, and the errors you'll see when something is wired up wrong.

**In this chapter you will learn:**

- named exports, default exports, and the different ways to import them
- how import paths work, and when you need a file extension
- ES modules vs CommonJS (`require`), and how Node.js decides which one a file uses
- importing packages such as `@playwright/test`
- importing types in TypeScript, and why `import type` exists
- how to read the common module errors

> **About the examples:** modules are about *several files*, and the playground runs one file at a time. The multi-file examples here are shown read-only. Each one was run with Node.js v24.18.0 exactly as written. The exercise at the end runs in the playground.

## 8.1 Why modules?

Without modules, every file would share one global space, and you'd have the name clashes from Chapter 1. A **module** is a file with its own scope: nothing in it is visible to other files unless it's **exported**, and nothing from another file is available unless it's **imported**.

That gives you:

- **reuse:** write `login()` once and import it into every test that needs it
- **privacy:** helper variables inside a module can't be changed from outside
- **clear dependencies:** the `import` lines at the top of a file show what it relies on

## 8.2 Named exports

Put `export` in front of anything you want other files to use:

```js title="helpers.js"
export const BASE_URL = "https://shop.test";

export function buildUser(overrides = {}) {
  return { name: "Test User", role: "qa", ...overrides };
}

const secret = "not exported"; // private to this file
```

Import the names you need, inside braces, with a path to the file:

```js title="checkout.js"
import { BASE_URL, buildUser } from "./helpers.js";

console.log(BASE_URL);
console.log(buildUser({ role: "admin" }));
```

```output
https://shop.test
{ name: 'Test User', role: 'admin' }
```

The names in braces must match the exported names exactly. You can rename on import with `as`:

```js
import { buildUser as makeUser } from "./helpers.js";
```

You can also export a list at the bottom of a file instead of marking each declaration: `export { BASE_URL, buildUser };`.

## 8.3 Default exports

A module can also have **one** *default* export. It's imported **without** braces, and the importing file chooses the name:

```js title="format-price.js"
export default function formatPrice(amount) {
  return `$${amount.toFixed(2)}`;
}
```

```js title="cart.js"
import formatPrice from "./format-price.js";       // any name works here
console.log(formatPrice(5));
```

```output
$5.00
```

A file can have both: `import formatPrice, { BASE_URL } from "./helpers.js";`.

> **Named or default?** Many teams prefer named exports, because the name is the same everywhere it's used and editors can find and rename it reliably. With a default export, every file can call it something different. Playwright's own package uses named exports: `test`, `expect`, `defineConfig`.

### Import everything

`import * as name` gives you an object containing all the exports:

```js
import * as helpers from "./helpers.js";
console.log(Object.keys(helpers)); // [ 'BASE_URL', 'buildUser', 'default' ]
```

The default export appears under the key `default`. Private values such as `secret` aren't there.

## 8.4 Import paths

| Path | Means |
|---|---|
| `"./helpers.js"` | a file in the **same** folder as this one |
| `"../data/users.js"` | go **up** one folder, then into `data` |
| `"@playwright/test"` | a **package** installed in `node_modules` |
| `"node:fs"` | a module **built into** Node.js |

### File extensions

When Node.js runs ES modules directly, relative imports **must include the file extension**. Leaving it off fails:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/you/qa/helpers' imported from /Users/you/qa/main.js
```

The same rule applies to `.ts` files run with Node's type stripping (Chapter 1): you write `import { greet } from "./types.ts";`.

Playwright Test is different: it transforms your test files itself, and in Playwright projects you'll commonly see imports **without** an extension, such as `import { LoginPage } from "../pages/login-page";`. Both styles work there. Follow whatever the project already does.

## 8.5 ES modules and CommonJS

JavaScript has two module systems. You'll see both.

| | ES modules (ESM) | CommonJS (CJS) |
|---|---|---|
| Export | `export function add…` | `module.exports = { add };` |
| Import | `import { add } from "./math.js";` | `const { add } = require("./math");` |
| Status | the JavaScript standard | Node.js's original system |

Use ES modules in new code. You'll still meet `require` in older projects, older tutorials, and some config files.

### How Node.js decides

For a `.js` (or `.ts`) file, Node.js looks at the nearest `package.json`:

- `"type": "module"` makes files ES modules.
- `"type": "commonjs"` makes files CommonJS.
- `.mjs` / `.mts` files are always ES modules, and `.cjs` / `.cts` files are always CommonJS.
- If there's no `"type"` field, Node.js (22.7 and later, and 20.19 and later) looks at the file: if it uses `import`/`export` syntax, Node.js runs it as an ES module. The Node.js docs call this *syntax detection*.

> **A trap with npm:** recent versions of npm (version 11, for example) write `"type": "commonjs"` into a new `package.json` when you run `npm init -y`. In that project, a file using `export` fails with `SyntaxError: Unexpected token 'export'`. Change the field to `"type": "module"` if you want ES modules.

## 8.6 Packages and Node.js built-ins

Installed packages are imported by name, with no `./`:

```ts title="example.spec.ts"
import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("https://playwright.dev/");
  await expect(page).toHaveTitle(/Playwright/);
});
```

Node.js's built-in modules use the `node:` prefix, for example `import fs from "node:fs";` to read files, or `import path from "node:path";` to build file paths.

## 8.7 Modules in TypeScript

TypeScript uses the same `import` and `export` syntax, and you can export **types** as well as values:

```ts title="types.ts"
export interface User {
  id: number;
  name: string;
}

export function greet(user: User): string {
  return `Hi ${user.name}`;
}
```

### import type

Types exist only while TypeScript checks the code. They're removed before it runs (Chapter 1). Mark imports that are **only types** with `type`, so tools that strip types know they can delete them:

```ts title="main.ts"
import { greet, type User } from "./types.ts";

const user: User = { id: 1, name: "Ana" };
console.log(greet(user));
```

```output
Hi Ana
```

This matters in practice. Run with `node main.ts` **without** the `type` keyword, Node.js treats `User` as a real value, finds nothing, and fails:

```text
SyntaxError: The requested module './types.ts' does not provide an export named 'User'
```

The Node.js docs say the `type` keyword is *"necessary to correctly strip type imports."* The tsconfig option `verbatimModuleSyntax` makes TypeScript enforce this rule for you. You can also write a whole line as `import type { User } from "./types.ts";`.

### Modules solve the "name" problem

In Chapter 1 you saw `Cannot redeclare block-scoped variable 'name'`. TypeScript treats a file with no `import` or `export` as a *script* that shares the global scope. Any `import` or `export` makes the file a module with its own scope, and the error goes away. If a file has nothing to import or export, `export {};` at the end is enough.

## 8.8 Reading module errors

| Error | Usual cause |
|---|---|
| `Cannot find module '…/helpers'` (`ERR_MODULE_NOT_FOUND`) | wrong path, typo in the file name, or a missing `.js` / `.ts` extension in Node ESM |
| `The requested module './x.js' does not provide an export named 'y'` | the name isn't exported, it's misspelled, it's a default export imported with braces, or it's a type imported without `type` |
| `SyntaxError: Unexpected token 'export'` | the file is running as CommonJS. Check `"type"` in `package.json` |
| `Cannot use import statement outside a module` | the same cause as the line above, in a different situation |
| `Cannot find module '@playwright/test'` | the package isn't installed. Run `npm install` |

## Exercise

The playground runs each example as a module, so `export` works there. It just can't import from other files.

```exercise ts title="Turn helpers into a module"
// Make this file a module that other test files could import from:
//  1. export DEFAULT_TIMEOUT as a named export
//  2. export buildOrder as a named export
//  3. make formatTotal the DEFAULT export
//  4. keep nextId private (not exported)

const DEFAULT_TIMEOUT = 5000;

let lastId = 0;
function nextId(): number {
  lastId++;
  return lastId;
}

function buildOrder(total: number) {
  return { id: nextId(), total };
}

function formatTotal(total: number): string {
  return `$${total.toFixed(2)}`;
}

console.log(buildOrder(20), formatTotal(20));
```

```checks
__book.test("DEFAULT_TIMEOUT is a named export", () => /export\s+const\s+DEFAULT_TIMEOUT\b/.test(__book.source) || /export\s*\{[^}]*\bDEFAULT_TIMEOUT\b[^}]*\}/.test(__book.source));
__book.test("buildOrder is a named export", () => /export\s+function\s+buildOrder\b/.test(__book.source) || /export\s*\{[^}]*\bbuildOrder\b[^}]*\}/.test(__book.source));
__book.test("formatTotal is the default export", () => /export\s+default\s+(function\s+)?formatTotal\b/.test(__book.source));
__book.test("nextId is not exported", () => !/export\s+(function|const|let)\s+nextId\b/.test(__book.source) && !/export\s*\{[^}]*\bnextId\b[^}]*\}/.test(__book.source));
__book.test("the helpers still work", () => buildOrder(5).total === 5 && formatTotal(5) === "$5.00");
```

```solution
export const DEFAULT_TIMEOUT = 5000;

let lastId = 0;
function nextId(): number { // no export: private to this module
  lastId++;
  return lastId;
}

export function buildOrder(total: number) {
  return { id: nextId(), total };
}

export default function formatTotal(total: number): string {
  return `$${total.toFixed(2)}`;
}

console.log(buildOrder(20), formatTotal(20));

// Another file could now write:
// import formatTotal, { DEFAULT_TIMEOUT, buildOrder } from "./order-helpers.ts";
```

## Quiz

```quiz
[
  {
    "q": "`helpers.js` has `export function login() {}`. Which import is correct?",
    "options": [
      "`import login from \"./helpers.js\";`",
      "`import { login } from \"./helpers.js\";`",
      "`import { Login } from \"./helpers.js\";`",
      "`require { login } from \"./helpers.js\";`"
    ],
    "answer": 1,
    "why": "Named exports are imported with braces and the exact same name. Without braces you'd be asking for the default export."
  },
  {
    "q": "How many default exports can one module have?",
    "options": ["None", "One", "Two", "As many as you like"],
    "answer": 1,
    "why": "A module can have many named exports but only one default export."
  },
  {
    "q": "Node.js runs `main.js` as an ES module and it contains `import { x } from \"./data\";`. The file is `data.js`. What happens?",
    "options": [
      "It works; Node.js adds `.js` automatically",
      "It fails with `ERR_MODULE_NOT_FOUND`",
      "It imports `undefined`",
      "It switches to CommonJS"
    ],
    "answer": 1,
    "why": "Node.js ES modules require the file extension in relative imports: `\"./data.js\"`."
  },
  {
    "q": "A new project's `package.json` has `\"type\": \"commonjs\"`. A `.js` file in it uses `export`. What happens when Node.js runs it?",
    "options": [
      "It runs normally",
      "`SyntaxError: Unexpected token 'export'`",
      "The export is ignored",
      "Node.js converts it to `module.exports`"
    ],
    "answer": 1,
    "why": "`\"type\": \"commonjs\"` makes `.js` files CommonJS, where `export` isn't valid. Use `\"type\": \"module\"` or a `.mjs` file."
  },
  {
    "q": "Why write `import { type User } from \"./types.ts\";`?",
    "options": [
      "It makes the import faster",
      "It tells type-stripping tools that `User` is only a type, so the import can be removed safely",
      "It's required for all imports in TypeScript",
      "It converts `User` into a class"
    ],
    "answer": 1,
    "why": "Types don't exist when the code runs. Without `type`, Node.js's type stripping keeps the import and fails because there's no runtime value called `User`."
  },
  {
    "q": "What does `\"../pages/login-page\"` mean in an import?",
    "options": [
      "A package called `pages`",
      "A file in a `pages` folder one level up from the current file",
      "A file in the current folder",
      "A Node.js built-in module"
    ],
    "answer": 1,
    "why": "`..` means the parent folder. Paths starting with `./` or `../` are relative to the current file; bare names refer to packages."
  }
]
```

## Sources

The multi-file examples and error messages were produced by running them with Node.js v24.18.0. The Playwright import style was checked with Playwright Test 1.65.0.

- MDN, *JavaScript modules* guide: [developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- MDN, *export* and *import*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export), [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)
- Node.js docs, *Modules: Packages* (`"type"` field, `.mjs`/`.cjs`, syntax detection): [nodejs.org/api/packages.html](https://nodejs.org/api/packages.html)
- Node.js docs, *ECMAScript modules* (mandatory file extensions): [nodejs.org/api/esm.html](https://nodejs.org/api/esm.html)
- Node.js docs, *Modules: TypeScript* (`type` keyword for type imports, `verbatimModuleSyntax`): [nodejs.org/api/typescript.html](https://nodejs.org/api/typescript.html)
- TypeScript Handbook, *Modules*: [typescriptlang.org/docs/handbook/2/modules.html](https://www.typescriptlang.org/docs/handbook/2/modules.html)
- Playwright, *Writing tests*: [playwright.dev/docs/writing-tests](https://playwright.dev/docs/writing-tests)
