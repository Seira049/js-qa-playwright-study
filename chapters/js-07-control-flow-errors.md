So far, code has run straight from top to bottom. Real tests need to **make decisions** (*if the cookie banner is shown, close it*), **repeat** work (*check every row in the table*), and **handle failures** (*if the response isn't JSON, report a clear error*). This chapter covers all three.

**In this chapter you will learn:**

- `if` / `else`, the ternary operator `? :`, and `switch`
- `for`, `for...of`, `for...in`, and `while` loops, plus `break` and `continue`
- how to throw, catch, and clean up after errors with `try` / `catch` / `finally`
- how to write clear error messages and assertion helpers
- how TypeScript narrows types inside `if`, and why `catch` gives you `unknown`

## 7.1 if, else if, else

```js run
const statusCode = 404;

if (statusCode >= 200 && statusCode < 300) {
  console.log("success");
} else if (statusCode >= 400 && statusCode < 500) {
  console.log("client error");
} else {
  console.log("something else");
}
```

```output
client error
```

The conditions are checked in order, and only the **first** one that's true runs. The `else` block runs when none of them are true. Conditions use the truthy/falsy rules from Chapter 3, so prefer explicit comparisons like `count === 0` over `if (count)`.

### The ternary operator

For choosing between two **values**, `condition ? valueIfTrue : valueIfFalse` is shorter:

```js run
const statusCode = 200;
const label = statusCode === 200 ? "OK" : "Not OK";
console.log(label);
```

```output
OK
```

Keep ternaries short. If you need to nest them, an `if` is easier to read.

### Returning early

In a function, `return` stops immediately. Checking the special cases first and returning keeps code flat (you used this in the Chapter 6 exercise):

```js run
function describeStatus(code) {
  if (code === 200) return "OK";
  if (code === 404) return "Not Found";
  if (code >= 500) return "Server Error";
  return `Status ${code}`;
}
console.log(describeStatus(404), describeStatus(503), describeStatus(302));
```

```output
Not Found Server Error Status 302
```

## 7.2 switch

`switch` compares one value against several `case`s. It uses strict equality (`===`):

```js run
function browserName(project) {
  switch (project) {
    case "chromium":
    case "chrome":            // two cases can share the same code
      return "Chrome";
    case "firefox":
      return "Firefox";
    default:                  // runs when no case matches
      return "Unknown";
  }
}
console.log(browserName("chrome"), browserName("firefox"), browserName("edge"));
```

```output
Chrome Firefox Unknown
```

> **Trap: fall-through.** If a `case` doesn't end with `break` (or `return`), execution **continues into the next case**:

```js run
const level = "warn";
switch (level) {
  case "warn":
    console.log("warn");      // no break here...
  case "error":
    console.log("error");     // ...so this runs too
    break;
  case "info":
    console.log("info");
}
```

```output
warn
error
```

## 7.3 Loops

### for...of: go through every item

This is the loop you'll use most. It gives you each **value** of an array in turn:

```js run
const browsers = ["chromium", "firefox", "webkit"];
for (const browser of browsers) {
  console.log(`testing on ${browser}`);
}
```

```output
testing on chromium
testing on firefox
testing on webkit
```

If you need the index as well, loop over `.entries()`:

```js run
const steps = ["open page", "log in", "check dashboard"];
for (const [index, step] of steps.entries()) {
  console.log(`${index + 1}. ${step}`);
}
```

```output
1. open page
2. log in
3. check dashboard
```

To loop over an **object**, turn it into entries with `Object.entries` (Chapter 5):

```js run
const headers = { "content-type": "application/json", "cache-control": "no-store" };
for (const [name, value] of Object.entries(headers)) {
  console.log(`${name}: ${value}`);
}
```

```output
content-type: application/json
cache-control: no-store
```

### The classic for loop

Use it when you need to count:

```js run
for (let i = 0; i < 3; i++) {
  console.log(`attempt ${i + 1}`);
}
```

```output
attempt 1
attempt 2
attempt 3
```

The three parts are: **start** (`let i = 0`), **keep going while** (`i < 3`), and **after each round** (`i++`).

### while

`while` repeats as long as a condition is true. Make sure something inside changes the condition, or the loop never ends (the playground stops it after 10 seconds):

```js run
let tries = 0;
while (tries < 3) {
  tries++;
}
console.log(tries);
```

```output
3
```

### break and continue

`continue` skips to the next round, and `break` leaves the loop completely:

```js run
for (const n of [1, 2, 3, 4, 5]) {
  if (n === 2) continue; // skip 2
  if (n === 4) break;    // stop at 4
  console.log(n);
}
```

```output
1
3
```

### Avoid for...in for arrays

`for...in` loops over an object's **keys**. On an array, the keys are the indexes, **as strings**, which surprises people:

```js run
for (const i in ["a", "b"]) {
  console.log(i, typeof i);
}
```

```output
0 string
1 string
```

Use `for...of` for arrays, and `Object.entries` with `for...of` for objects.

### Loops or array methods?

`map`, `filter`, `some`, and `every` (Chapter 5) are usually clearer when you're building a new array or checking a condition. Loops are better when you need `break`, or when each step is an `await` (Chapter 10 explains why `forEach` doesn't work with `await`).

## 7.4 Errors: throw, try, catch, finally

### What an error is

When something goes wrong, JavaScript **throws** an error object. If nothing catches it, the program (or the test) stops. You can throw your own with `throw new Error("message")`:

```js run
const err = new Error("Login failed");
console.log(err.name, "|", err.message, "|", err instanceof Error);
```

```output
Error | Login failed | true
```

In Node.js, an uncaught error prints the message and a stack trace, exactly like the `ReferenceError` in Chapter 1:

```text
Error: Element not found: #login
    at file:///Users/you/qa/check.mjs:1:7
```

### Catching errors

Put code that might fail in `try`. If it throws, execution jumps to `catch`, and the error is passed in. `finally` runs **either way**, which makes it the place for cleanup:

```js run
try {
  JSON.parse("not json");
  console.log("this line never runs");
} catch (error) {
  console.log("Caught:", error.name);
} finally {
  console.log("cleanup runs either way");
}
```

```output
Caught: SyntaxError
cleanup runs either way
```

> **In tests:** don't wrap assertions in `try/catch` just to hide failures. A failing assertion *should* throw, because that's how Playwright knows the test failed. Use `try/catch` when you can genuinely handle the problem, or to add information and throw again.

### Writing an assertion helper

Assertions are just functions that throw when something is wrong. A clear message saves debugging time:

```js run
function assertEqual(actual, expected, what) {
  if (actual !== expected) {
    throw new Error(`${what}: expected ${expected}, got ${actual}`);
  }
}

try {
  assertEqual(404, 200, "status code");
} catch (e) {
  console.log(e.message);
}
```

```output
status code: expected 200, got 404
```

Playwright's `expect` does the same thing, with much more detail in its messages.

### Adding context with cause

When you catch a low-level error and throw a clearer one, pass the original as `cause`, so the details aren't lost:

```js run
function parseBody(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Response body was not valid JSON", { cause: e });
  }
}

try {
  parseBody("<html>Server error</html>");
} catch (e) {
  console.log(e.message);
  console.log("cause:", e.cause.name);
}
```

```output
Response body was not valid JSON
cause: SyntaxError
```

### Retrying

Loops and `try/catch` together make a retry:

```js run
let attempt = 0;
function flakyAction() {
  attempt++;
  if (attempt < 3) throw new Error(`failed on attempt ${attempt}`);
  return "done";
}

function retry(fn, times) {
  let lastError;
  for (let i = 1; i <= times; i++) {
    try {
      return fn();             // success: return straight away
    } catch (e) {
      lastError = e;
      console.log(`attempt ${i}: ${e.message}`);
    }
  }
  throw lastError;             // every attempt failed
}

console.log(retry(flakyAction, 5));
```

```output
attempt 1: failed on attempt 1
attempt 2: failed on attempt 2
done
```

> **In Playwright you rarely need this.** Actions like `click()` wait automatically, and web-first assertions like `toBeVisible()` retry until they pass or time out. Retrying a whole test hides flakiness. Use Playwright's built-in waiting first, and investigate tests that need retries.

### You can throw anything (but don't)

JavaScript lets you `throw` any value, even a string:

```js run
try {
  throw "just a string";
} catch (e) {
  console.log(typeof e, e instanceof Error);
}
```

```output
string false
```

A thrown string has no `name`, `message`, or stack trace. Always throw `Error` objects.

## 7.5 TypeScript and control flow

### Narrowing

When you check a type with `typeof` inside an `if`, TypeScript **narrows** the type inside that branch:

```ts run
function describe(value: string | number): string {
  if (typeof value === "string") {
    return value.toUpperCase(); // here, TypeScript knows value is a string
  }
  return value.toFixed(2);      // and here, it must be a number
}
console.log(describe("ok"), describe(3.14159));
```

```output
OK 3.14
```

Chapter 11 covers narrowing in depth.

### catch gives you unknown

Because anything can be thrown, TypeScript (with `strict` on) types the `catch` variable as `unknown`, not `Error`. You must check it before reading `.message`:

```ts run
try {
  JSON.parse("x");
} catch (err) {
  console.log(err.message);           // 'err' is of type 'unknown'.
}

try {
  JSON.parse("x");
} catch (err) {
  if (err instanceof Error) {
    console.log("safe:", err.name);   // OK after the check
  }
}
```

## Exercises

```exercise ts title="Classify response times"
// Write classify(ms) that returns:
//   "fast"    for under 200 ms
//   "ok"      for 200 up to (not including) 1000 ms
//   "slow"    for 1000 ms or more
//   "invalid" for negative numbers or NaN
function classify(ms: number): string {
  return "";
}

// Then use a for...of loop to count how many timings are "slow".
const timings = [120, 850, 1500, 40, 2300, 999];
let slowCount = 0;

console.log(timings.map(classify), slowCount);
```

```checks
__book.test('classify(120) is "fast"', () => classify(120) === "fast");
__book.test('classify(200) and classify(999) are "ok"', () => classify(200) === "ok" && classify(999) === "ok");
__book.test('classify(1000) is "slow"', () => classify(1000) === "slow");
__book.test('classify(-5) and classify(NaN) are "invalid"', () => classify(-5) === "invalid" && classify(NaN) === "invalid");
__book.test("slowCount is 2", () => slowCount === 2);
__book.test("slowCount is counted with for...of", () => /for\s*\(\s*const\s+\w+\s+of\s+timings\s*\)/.test(__book.source));
```

```solution
function classify(ms: number): string {
  if (Number.isNaN(ms) || ms < 0) return "invalid";
  if (ms < 200) return "fast";
  if (ms < 1000) return "ok";
  return "slow";
}

const timings = [120, 850, 1500, 40, 2300, 999];
let slowCount = 0;
for (const ms of timings) {
  if (classify(ms) === "slow") slowCount++;
}

console.log(timings.map(classify), slowCount);
```

```exercise ts title="Parse a response safely"
// Write parseJson(text). It should:
//  - return the parsed value when text is valid JSON
//  - otherwise THROW a new Error whose message starts with "Invalid JSON"
//    and whose cause is the original error
function parseJson(text: string): unknown {
  return JSON.parse(text);
}

console.log(parseJson('{"ok":true}'));
```

```checks
__book.test("valid JSON is parsed", () => JSON.stringify(parseJson('{"ok":true}')) === '{"ok":true}');
__book.test('invalid JSON throws an Error starting with "Invalid JSON"', () => { try { parseJson("<html>"); return false; } catch (e) { return e instanceof Error && e.message.startsWith("Invalid JSON"); } });
__book.test("the thrown error has the original SyntaxError as cause", () => { try { parseJson("<html>"); return false; } catch (e) { return e instanceof Error && e.cause instanceof SyntaxError; } });
```

```solution
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Invalid JSON: ${text.slice(0, 30)}`, { cause: err });
  }
}

console.log(parseJson('{"ok":true}'));
```

## Quiz

```quiz
[
  {
    "q": "What does this print?",
    "code": "const x = \"b\";\nswitch (x) {\n  case \"a\": console.log(\"A\");\n  case \"b\": console.log(\"B\");\n  case \"c\": console.log(\"C\");\n}",
    "options": ["`B`", "`B` then `C`", "`A` then `B` then `C`", "Nothing"],
    "answer": 1,
    "why": "Execution starts at the matching case and falls through to the next one, because there's no `break`."
  },
  {
    "q": "Which loop should you use to go through the values of an array?",
    "options": ["`for...in`", "`for...of`", "`switch`", "`while (true)`"],
    "answer": 1,
    "why": "`for...of` gives you each value. `for...in` gives the keys, which for an array are the indexes as strings."
  },
  {
    "q": "When does a `finally` block run?",
    "options": ["Only if an error was thrown", "Only if no error was thrown", "Always, after `try` (and `catch` if it ran)", "Never in tests"],
    "answer": 2,
    "why": "`finally` always runs, which makes it the right place for cleanup such as closing a connection or deleting test data."
  },
  {
    "q": "What does `continue` do inside a loop?",
    "options": ["Leaves the loop", "Skips the rest of this round and goes to the next one", "Restarts the loop from the beginning", "Pauses the loop"],
    "answer": 1,
    "why": "`continue` skips to the next round. `break` leaves the loop completely."
  },
  {
    "q": "In TypeScript with `strict` on, what is the type of `err` in `catch (err)`?",
    "options": ["`Error`", "`any`", "`unknown`", "`string`"],
    "answer": 2,
    "why": "Any value can be thrown, so `err` is `unknown`. Check it with `err instanceof Error` before using `.message`."
  },
  {
    "q": "Why shouldn't you wrap a Playwright assertion in `try/catch` and ignore the error?",
    "options": [
      "It makes the test slower",
      "A failed assertion throws to mark the test as failed; catching it hides real failures",
      "`try/catch` doesn't work in tests",
      "Playwright forbids it"
    ],
    "answer": 1,
    "why": "Assertions report failure by throwing. Swallowing the error turns a real failure into a false pass."
  }
]
```

## Sources

Every example was run with Node.js v24.18.0, and the TypeScript messages were produced by TypeScript 7.0.2.

- MDN, *Control flow and error handling*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
- MDN, *switch* (strict comparison, fall-through): [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/switch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/switch)
- MDN, *Loops and iteration*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration) (`for...of` vs `for...in`)
- MDN, *try...catch*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)
- MDN, *Error* and *Error: cause*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
- TypeScript Handbook, *Narrowing*: [typescriptlang.org/docs/handbook/2/narrowing.html](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- TypeScript TSConfig reference, *useUnknownInCatchVariables* (part of `strict`): [typescriptlang.org/tsconfig/#useUnknownInCatchVariables](https://www.typescriptlang.org/tsconfig/#useUnknownInCatchVariables)
- Playwright, *Auto-waiting* and *Assertions* (actions wait; web-first assertions retry): [playwright.dev/docs/actionability](https://playwright.dev/docs/actionability), [playwright.dev/docs/test-assertions](https://playwright.dev/docs/test-assertions)
