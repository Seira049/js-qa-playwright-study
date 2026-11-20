Playwright tests run in **Node.js** (Chapter 1), so they can do things a web page can't: read settings from the environment, load test data from files, write reports, and build URLs for different environments. This chapter covers the Node.js features you'll use in almost every real test project.

**In this chapter you will learn:**

- environment variables with `process.env`, and why every value is a string
- `.env` files, and keeping secrets out of Git
- building file paths with `node:path`, and the `__dirname` trap in ES modules
- reading and writing files with `node:fs/promises`, including JSON test data
- building and checking URLs with `URL` and `URLSearchParams`

> **About the examples:** `process`, `fs`, and `path` exist only in Node.js, so those examples are shown read-only. Each one was run with Node.js v24.18.0 exactly as written. `URL` and `URLSearchParams` also work in browsers, so those examples, and both exercises, run in the playground.

## 14.1 Environment variables

An **environment variable** is a named setting passed to a program by whatever starts it: your terminal, a CI system, or a script. Test projects use them for anything that changes between environments or must stay secret: the base URL, test-account passwords, API tokens.

In Node.js they're in `process.env`:

```js title="env.mjs"
console.log(process.env.BASE_URL);
console.log(process.env.NOT_SET);
```

Setting a variable for one command (macOS and Linux):

```bash
BASE_URL=https://staging.shop.test node env.mjs
```

```output
https://staging.shop.test
undefined
```

In Windows PowerShell, set it first: `$env:BASE_URL = "https://staging.shop.test"`, then run the command. A variable that isn't set is `undefined`.

### Every value is a string

```js title="types.mjs"
// Run as: RETRIES=2 HEADLESS=false node types.mjs
console.log(typeof process.env.RETRIES, process.env.RETRIES);
console.log(Boolean(process.env.HEADLESS));            // a trap
console.log(process.env.HEADLESS === "true");          // the right check
console.log(Number(process.env.RETRIES ?? "0") + 1);
```

```output
string 2
true
false
3
```

`Boolean("false")` is `true`, because any non-empty string is truthy (Chapter 3). Compare with the exact text instead. Convert numbers with `Number()` and check for `NaN` (Chapter 2). Even assigning a number stores a string: after `process.env.N = 5`, `typeof process.env.N` is `"string"`.

### Failing early with a clear message

A missing variable usually surfaces later as a confusing error, such as navigating to `"undefined/login"`. Check required variables up front:

```ts title="config/env.ts"
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing environment variable ${name}. Set it before running the tests.`);
  }
  return value;
}

const password = requireEnv("TEST_USER_PASSWORD");
```

### In Playwright

The Playwright docs pass environment variables straight into the config and tests, for example choosing the `baseURL` with `process.env.STAGING === '1' ? … : …` and filling a password field with `process.env.PASSWORD`. Running `BASE_URL=… npx playwright test` makes the value available everywhere.

## 14.2 .env files and secrets

Typing variables for every run gets tedious, so projects keep them in a **`.env` file**, one `NAME=value` per line:

```text title=".env (never commit this file)"
BASE_URL=https://staging.shop.test
TEST_USER_EMAIL=qa@test.io
TEST_USER_PASSWORD=correct-password
```

Node.js can load it itself, without any library:

- `node --env-file=.env script.mjs` loads the file for one script (added in Node.js 20.6, no longer experimental since 24.10 and 22.21).
- `process.loadEnvFile()` loads `./.env` from inside your code (added in 21.7 and 20.12, no longer experimental since 24.10 and 22.21). For Playwright, call it at the top of `playwright.config.ts`, because the tests are started by `npx playwright test`, not by `node` directly:

```ts title="playwright.config.ts (excerpt)"
import { defineConfig } from "@playwright/test";
import path from "node:path";

process.loadEnvFile(path.join(import.meta.dirname, ".env"));

export default defineConfig({
  use: { baseURL: process.env.BASE_URL },
});
```

We checked this pattern with Playwright 1.65.1: a value from the `.env` file reached the tests through `process.env`. If the file is missing, `loadEnvFile` throws `ENOENT`. The Playwright docs show the same idea with the `dotenv` package, which older projects use.

A variable that's **already set** in the environment (for example by CI) wins over the value in the file. That's what lets CI supply real secrets while your laptop uses the `.env` file.

> **Keep secrets out of Git.** Add `.env` to `.gitignore`, and commit a `.env.example` with the variable names and dummy values instead, so others know what to set. Never print secrets in test output or logs. In CI, use the platform's secret storage.

## 14.3 File paths with node:path

Paths are written differently on Windows (`tests\data\users.json`) and macOS/Linux (`tests/data/users.json`). `node:path` builds them correctly for whichever system runs the code:

```js title="paths.mjs"
import path from "node:path";

const usersFile = path.join(import.meta.dirname, "data", "users.json");
console.log(path.basename(usersFile), path.extname(usersFile));
console.log(path.join("tests", "..", "data", "users.json"));
```

```output
users.json .json
data/users.json
```

| Function | Does |
|---|---|
| `path.join(a, b, …)` | joins parts with the right separator, and resolves `..` |
| `path.resolve(…)` | builds an **absolute** path |
| `path.basename(p)` / `path.extname(p)` | the file name / its extension |
| `path.dirname(p)` | the folder part |

### Paths relative to *what*?

A relative path like `"data/users.json"` is relative to the **current working directory**: wherever the command was started. That changes depending on whether you run tests from the project root or from a subfolder. To be relative to **the file itself**, build the path from the file's own folder:

- in **ES modules**: `import.meta.dirname` (added in Node.js 21.2 and 20.11)
- in **CommonJS**: `__dirname`

> **The __dirname trap:** many examples, including some in the Playwright docs, use `__dirname`. In an ES module project, it doesn't exist. In the practice project (`"type": "module"`), a test that checks `typeof __dirname` gets `"undefined"`, while `typeof import.meta.dirname` is `"string"`. If you see `ReferenceError: __dirname is not defined`, use `import.meta.dirname`.

## 14.4 Reading and writing files

`node:fs/promises` has `async` versions of the file functions (Chapter 10):

```js title="files.mjs"
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// Read JSON test data
const usersFile = path.join(import.meta.dirname, "data", "users.json");
const users = JSON.parse(await readFile(usersFile, "utf8"));
console.log(users.length, users[0].email);

// Write a small report, creating the folder if needed
const outDir = path.join(import.meta.dirname, "out");
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "report.json"), JSON.stringify({ passed: 3 }, null, 2));

// A missing file throws an error with code ENOENT
try {
  await readFile("data/missing.json", "utf8");
} catch (e) {
  console.log(e.code);
}
```

```output
2 ana@test.io
ENOENT
```

- Pass `"utf8"` to `readFile` to get text. Without it, you get raw bytes (a `Buffer`).
- `mkdir(dir, { recursive: true })` creates any missing parent folders, and doesn't fail if the folder exists.
- Errors from `fs` have a `code` property: `ENOENT` (not found), `EACCES` (permission denied), `EEXIST` (already exists). Check `code` instead of the wording of the message.

### Importing JSON directly

ES modules can import a JSON file. The `with { type: "json" }` part is required:

```js title="data-import.mjs"
import users from "./data/users.json" with { type: "json" };
console.log(users[1].role);
```

```output
qa
```

The Node.js docs mark JSON modules as no longer experimental from 23.1 and 22.12. The import is loaded once, so every test that imports it shares the **same** object. If tests change the data, give each test its own copy with `structuredClone` (Chapter 5).

## 14.5 URL and URLSearchParams

Building URLs by joining strings breaks easily: a missing or doubled `/`, or a query value with a space or `&` in it. The built-in `URL` class handles all of that. It's available in Node.js and in browsers, so these examples run here.

```js run
const url = new URL("/api/users", "https://shop.test");
url.searchParams.set("role", "qa admin");     // a space
url.searchParams.set("tag", "a&b");           // a character that means something in URLs
url.searchParams.set("page", 2);

console.log(url.href);
console.log(url.pathname, url.search);
console.log(url.searchParams.get("page"), typeof url.searchParams.get("page"));
```

```output
https://shop.test/api/users?role=qa+admin&tag=a%26b&page=2
/api/users ?role=qa+admin&tag=a%26b&page=2
2 string
```

`URL` *encodes* the values: the space became `+` and `&` became `%26`, so the server reads them correctly. Like environment variables, query values come back as **strings**.

### The trailing-slash trap

`new URL(path, base)` resolves the path the way a browser resolves a link, so a trailing `/` on the base matters:

```js run
console.log(new URL("users", "https://shop.test/api/").href);
console.log(new URL("users", "https://shop.test/api").href);
console.log(new URL("/users", "https://shop.test/api/").href);
```

```output
https://shop.test/api/users
https://shop.test/users
https://shop.test/users
```

Without the trailing slash, `api` is treated as a file name and replaced. A path starting with `/` always starts from the domain's root. Playwright's `baseURL` follows the same rules: with `baseURL: "https://shop.test/app/"`, `page.goto("login")` goes to `/app/login`, but `page.goto("/login")` goes to `/login`.

### Reading a URL from the page

```js run
const current = new URL("https://shop.test/search?q=red+shoes&page=3#results");
console.log(current.hostname, current.pathname, current.hash);
console.log(current.searchParams.get("q"), Number(current.searchParams.get("page")));
console.log(URL.canParse("not a url"), URL.canParse("https://shop.test"));
```

```output
shop.test /search #results
red shoes 3
false true
```

In a test, `new URL(page.url())` lets you check one query parameter without matching the whole URL as a string. `URL.canParse` checks a string without throwing. `new URL("/x")` with no base throws `TypeError: Invalid URL`.

## Exercises

```exercise ts title="Build API URLs"
// buildApiUrl(base, path, params) returns the full URL as a string.
//  - base is the API root, e.g. "https://shop.test/api/" (always ends with /)
//  - path is relative, e.g. "users" (no leading /)
//  - params is an object of query values; skip any that are undefined
// buildApiUrl("https://shop.test/api/", "users", { role: "qa", page: 2, q: undefined })
//   -> "https://shop.test/api/users?role=qa&page=2"
function buildApiUrl(base: string, path: string, params: Record<string, string | number | undefined> = {}): string {
  return base + path;
}

console.log(buildApiUrl("https://shop.test/api/", "users", { role: "qa", page: 2, q: undefined }));
console.log(buildApiUrl("https://shop.test/api/", "search", { q: "red & blue shoes" }));
```

```checks
__book.test("adds query parameters", () => buildApiUrl("https://shop.test/api/", "users", { role: "qa", page: 2 }) === "https://shop.test/api/users?role=qa&page=2");
__book.test("skips undefined values", () => buildApiUrl("https://shop.test/api/", "users", { role: "qa", q: undefined }) === "https://shop.test/api/users?role=qa");
__book.test("encodes spaces and &", () => buildApiUrl("https://shop.test/api/", "search", { q: "red & blue shoes" }) === "https://shop.test/api/search?q=red+%26+blue+shoes");
__book.test("keeps the /api/ part of the base", () => buildApiUrl("https://shop.test/api/", "orders") === "https://shop.test/api/orders");
__book.test("uses the URL class", () => /new\s+URL\(/.test(__book.source));
```

```solution
function buildApiUrl(base: string, path: string, params: Record<string, string | number | undefined> = {}): string {
  const url = new URL(path, base);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(name, String(value));
  }
  return url.href;
}

console.log(buildApiUrl("https://shop.test/api/", "users", { role: "qa", page: 2, q: undefined }));
console.log(buildApiUrl("https://shop.test/api/", "search", { q: "red & blue shoes" }));
```

```exercise ts title="Read test settings from the environment"
// readConfig(env) turns environment variables into typed settings.
// (In a real project you'd call readConfig(process.env). Here we pass an
// object instead, so it can run in the playground.)
//  - baseURL: env.BASE_URL, REQUIRED. Throw an Error whose message includes
//    "BASE_URL" if it's missing or empty.
//  - retries: Number(env.RETRIES), default 0 if not set
//  - headless: true unless env.HEADLESS is exactly "false"
type Env = Record<string, string | undefined>;

function readConfig(env: Env) {
  return { baseURL: env.BASE_URL, retries: env.RETRIES, headless: Boolean(env.HEADLESS) };
}

console.log(readConfig({ BASE_URL: "https://staging.shop.test", RETRIES: "2", HEADLESS: "false" }));
```

```checks
__book.test("parses all three settings", () => JSON.stringify(readConfig({ BASE_URL: "https://s.test", RETRIES: "2", HEADLESS: "false" })) === '{"baseURL":"https://s.test","retries":2,"headless":false}');
__book.test("defaults: retries 0, headless true", () => { const c = readConfig({ BASE_URL: "https://s.test" }); return c.retries === 0 && c.headless === true; });
__book.test('HEADLESS="true" gives headless true', () => readConfig({ BASE_URL: "https://s.test", HEADLESS: "true" }).headless === true);
__book.test("missing BASE_URL throws an Error mentioning BASE_URL", () => { try { readConfig({}); return false; } catch (e) { return e instanceof Error && e.message.includes("BASE_URL"); } });
__book.test("empty BASE_URL throws too", () => { try { readConfig({ BASE_URL: "" }); return false; } catch (e) { return e instanceof Error; } });
```

```solution
type Env = Record<string, string | undefined>;

function readConfig(env: Env) {
  const baseURL = env.BASE_URL;
  if (baseURL === undefined || baseURL === "") {
    throw new Error("Missing environment variable BASE_URL");
  }
  return {
    baseURL,
    retries: Number(env.RETRIES ?? "0"),
    headless: env.HEADLESS !== "false",   // Boolean("false") would be true
  };
}

console.log(readConfig({ BASE_URL: "https://staging.shop.test", RETRIES: "2", HEADLESS: "false" }));
```

A fuller version would also reject a `RETRIES` value that isn't a number, for example with `Number.isNaN`.

## Quiz

```quiz
[
  {
    "q": "A test runs with `HEADLESS=false`. What is `Boolean(process.env.HEADLESS)`?",
    "options": ["`false`", "`true`", "`undefined`", "`\"false\"`"],
    "answer": 1,
    "why": "Environment variables are strings, and `\"false\"` is a non-empty string, so it's truthy. Compare with `=== \"true\"` or `!== \"false\"`."
  },
  {
    "q": "What's the right way to handle a `.env` file with passwords?",
    "options": [
      "Commit it so CI can use it",
      "Add it to `.gitignore`, commit a `.env.example` with dummy values, and use CI's secret storage",
      "Rename it to `.env.txt`",
      "Put the passwords in `playwright.config.ts` instead"
    ],
    "answer": 1,
    "why": "Secrets must never be committed. Only the variable names belong in Git."
  },
  {
    "q": "A test in an ES module project throws `ReferenceError: __dirname is not defined`. What should it use?",
    "options": ["`process.cwd()`", "`import.meta.dirname`", "`window.location`", "`require.main`"],
    "answer": 1,
    "why": "`__dirname` exists only in CommonJS. `import.meta.dirname` is the folder of the current module. `process.cwd()` is where the command was started, which can differ."
  },
  {
    "q": "What does `new URL(\"users\", \"https://shop.test/api\").href` return?",
    "options": [
      "`https://shop.test/api/users`",
      "`https://shop.test/users`",
      "`https://shop.test/apiusers`",
      "It throws an error"
    ],
    "answer": 1,
    "why": "Without a trailing slash, `api` is treated like a file name and replaced. Use `https://shop.test/api/` as the base."
  },
  {
    "q": "`readFile(\"data/users.json\", \"utf8\")` throws. Which property tells you the file doesn't exist?",
    "options": ["`error.status === 404`", "`error.code === \"ENOENT\"`", "`error.name === \"NotFound\"`", "`error.message === \"missing\"`"],
    "answer": 1,
    "why": "File-system errors have a `code`. `ENOENT` means no such file or directory."
  },
  {
    "q": "What does `url.searchParams.set(\"q\", \"a b\")` put in the URL?",
    "options": ["`q=a b`", "`q=a+b`", "`q=a_b`", "`q=\"a b\"`"],
    "answer": 1,
    "why": "Query values are encoded. A space becomes `+` in the query string, and the server decodes it back."
  }
]
```

## Sources

The Node.js examples were run with Node.js v24.18.0 as written, and the `.env` pattern and `__dirname` behaviour were checked inside Playwright Test 1.65.1. The `URL` examples also ran in the playground (Chromium).

- Node.js docs, *process.env*: [nodejs.org/api/process.html#processenv](https://nodejs.org/api/process.html#processenv) (values are strings)
- Node.js docs, *--env-file* (added v20.6.0, stable v24.10.0 / v22.21.0; existing variables take precedence): [nodejs.org/api/cli.html#--env-filefile](https://nodejs.org/api/cli.html#--env-filefile)
- Node.js docs, *process.loadEnvFile* (added v21.7.0 / v20.12.0, stable v24.10.0 / v22.21.0): [nodejs.org/api/process.html#processloadenvfilepath](https://nodejs.org/api/process.html#processloadenvfilepath)
- Node.js docs, *path*: [nodejs.org/api/path.html](https://nodejs.org/api/path.html)
- Node.js docs, *import.meta.dirname* (added v21.2.0 / v20.11.0) and *JSON modules* (stable v23.1.0 / v22.12.0): [nodejs.org/api/esm.html](https://nodejs.org/api/esm.html)
- Node.js docs, *fs/promises* and *Common system errors*: [nodejs.org/api/fs.html](https://nodejs.org/api/fs.html), [nodejs.org/api/errors.html#common-system-errors](https://nodejs.org/api/errors.html#common-system-errors)
- MDN, *URL* and *URLSearchParams* (including `URL.canParse`): [developer.mozilla.org/en-US/docs/Web/API/URL](https://developer.mozilla.org/en-US/docs/Web/API/URL), [developer.mozilla.org/en-US/docs/Web/API/URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
- Playwright, *Parameterize tests* (environment variables, `.env` files): [playwright.dev/docs/test-parameterize](https://playwright.dev/docs/test-parameterize)
