Nearly every line of a Playwright test starts with `await`. That's because talking to a browser or an API takes time, and JavaScript doesn't stop and wait by itself. This chapter explains **asynchronous** code: what a *Promise* is, how `async` and `await` work, how to run things in parallel, and the mistakes that cause flaky tests.

**In this chapter you will learn:**

- why JavaScript code doesn't always run in the order it's written
- what a Promise is, and its three states
- `async` functions and `await`
- handling errors in async code with `try/catch`
- running work in parallel with `Promise.all`, and its relatives
- why `forEach` and `await` don't mix, and what to use instead
- what happens in Playwright when you forget `await`
- typing async functions in TypeScript with `Promise<T>`

## 10.1 Why "async"?

Some operations finish **later**: a network request, a page load, a timer. JavaScript doesn't block while it waits. It schedules the rest of that work for later and carries on with the next line:

```js run
console.log("1. start");
setTimeout(() => console.log("3. timer done"), 0);
console.log("2. end of script");
```

```output
1. start
2. end of script
3. timer done
```

Even with a delay of `0`, the timer's callback runs **after** the current code has finished. `setTimeout(fn, ms)` asks JavaScript to call `fn` after at least `ms` milliseconds, once it's free.

## 10.2 Promises

A **Promise** is an object that stands for a value that isn't ready yet. It's always in one of three states:

| State | Meaning |
|---|---|
| *pending* | still working |
| *fulfilled* | finished successfully, with a value |
| *rejected* | failed, with an error |

Once a promise is fulfilled or rejected, it's *settled* and never changes again. Here's a function that returns a promise, simulating a slow API call:

```js run
function fetchUser(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id > 0) resolve({ id, name: "Ana" });
      else reject(new Error(`No user with id ${id}`));
    }, 50);
  });
}

const promise = fetchUser(1);
console.log(promise instanceof Promise);   // a Promise, not the user yet!

promise.then((user) => console.log("then:", user.name));
fetchUser(-1).catch((err) => console.log("catch:", err.message));
```

```output
true
then: Ana
catch: No user with id -1
```

The first line prints straight away. The other two appear about 50 ms later. If you `console.log` the promise itself, Node.js shows `Promise { <pending> }`.

`.then(fn)` runs `fn` with the value when the promise fulfils, and `.catch(fn)` runs `fn` with the error when it rejects. You'll see `.then` in older code, but **`await` is clearer**, and it's what Playwright tests use.

## 10.3 async and await

- **`await promise`** pauses the current function until the promise settles. Then it gives you the value, or **throws** the error.
- You can only use `await` inside a function marked **`async`**, or at the top level of a module.
- An `async` function **always returns a promise**.

```js run
function fetchUser(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => (id > 0 ? resolve({ id, name: "Ana" }) : reject(new Error(`No user with id ${id}`))), 50);
  });
}

async function main() {
  const user = await fetchUser(1);   // waits, then gives the actual value
  console.log("got:", user.name);

  try {
    await fetchUser(-1);             // a rejected promise throws here
  } catch (err) {
    console.log("caught:", err.message);
  }
}

main();
```

```output
got: Ana
caught: No user with id -1
```

Compare with a Playwright test. Every browser action returns a promise, so every action is awaited:

```ts title="Read-only example"
test("search works", async ({ page }) => {        // the test function is async
  await page.goto("/");                            // wait for navigation
  await page.getByRole("searchbox").fill("shoes"); // wait for typing
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
});
```

### An async function returns a promise, even for plain values

```js run
async function getCount() {
  return 3;
}
const result = getCount();
console.log(result instanceof Promise);
console.log(await getCount());       // top-level await works in modules
```

```output
true
3
```

## 10.4 Forgetting await

Forgetting `await` is the most common async bug. Without it, you get the **promise**, not the value, and the next line runs before the work is done:

```js run
const fetchCount = () => new Promise((resolve) => setTimeout(() => resolve(3), 20));

const count = fetchCount();      // forgot await
console.log(count === 3);        // comparing a Promise with 3
console.log(typeof count);
```

```output
false
object
```

In a Playwright test, a missing `await` before an **action** lets the next line run while the action is still happening, which is a classic cause of flaky tests. A missing `await` before an **assertion** means the test doesn't wait for it. When we checked with Playwright 1.65.0, an unawaited assertion that was still running when the test finished made the test fail with `Error: Test ended.`. That's better than a false pass, but the error points at the wrong cause.

Two safety nets, both recommended in Playwright's *Best Practices* guide:

- The ESLint rule **`@typescript-eslint/no-floating-promises`** reports any promise you didn't `await`.
- Running **`tsc --noEmit`** in CI catches calls with the wrong types.

## 10.5 Sequential or parallel?

Each `await` waits before starting the next line. When steps **don't depend on each other**, you can start them all at once and wait for all of them with `Promise.all`:

```js run
const wait = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

let start = Date.now();
await wait(100);
await wait(100);
console.log("one after another: about", Math.round((Date.now() - start) / 100) * 100, "ms");

start = Date.now();
const [a, b] = await Promise.all([wait(100, "A"), wait(100, "B")]);
console.log(a, b, "in parallel: about", Math.round((Date.now() - start) / 100) * 100, "ms");
```

```output
one after another: about 200 ms
A B in parallel: about 100 ms
```

`Promise.all` gives you the results **in the same order** as the promises you passed in. Use it for independent work, such as creating several pieces of test data through an API. Don't use it for browser steps that must happen in order: a test that clicks before the page has loaded is broken however fast it is.

### The Promise helpers

| Helper | Settles when | Result |
|---|---|---|
| `Promise.all([...])` | all fulfil, **or** the first one rejects | array of values, or the first error |
| `Promise.allSettled([...])` | all have settled | array of `{ status, value }` / `{ status, reason }` |
| `Promise.race([...])` | the first one settles (either way) | that value or error |
| `Promise.any([...])` | the first one fulfils | that value (rejects only if all reject) |

```js run
const wait = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
const fail = (ms, msg) => new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));

try {
  await Promise.all([wait(50, "ok"), fail(10, "API down")]);
} catch (e) {
  console.log("all:", e.message);
}

const results = await Promise.allSettled([wait(10, "ok"), fail(10, "API down")]);
console.log("allSettled:", results.map((r) => r.status));

console.log("race:", await Promise.race([wait(50, "slow"), wait(10, "fast")]));
```

```output
all: API down
allSettled: [ 'fulfilled', 'rejected' ]
race: fast
```

`Promise.race` is how you add a timeout to something that doesn't have one:

```js run
const wait = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms));

try {
  await Promise.race([wait(200, "data"), timeout(50)]);
} catch (e) {
  console.log(e.message);
}
```

```output
Timed out after 50 ms
```

(Playwright actions and assertions already have their own timeouts, so you won't need this for them.)

## 10.6 Loops and await

### forEach doesn't wait

`forEach` calls your function for each item but **ignores the promises it returns**. The code after the loop runs straight away:

```js run
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const processed = [];

[1, 2, 3].forEach(async (n) => {
  await wait(10);
  processed.push(n);
});
console.log("right after forEach:", processed);

await wait(50);
console.log("50 ms later:", processed);
```

```output
right after forEach: []
50 ms later: [ 1, 2, 3 ]
```

In a test, that means steps inside `forEach` aren't finished (or even checked) when the next line runs.

### Use for...of to go one at a time

```js run
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const processed = [];
for (const n of [1, 2, 3]) {
  await wait(10);
  processed.push(n);
}
console.log(processed);
```

```output
[ 1, 2, 3 ]
```

### Use Promise.all with map to go in parallel

```js run
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const doubled = await Promise.all(
  [1, 2, 3].map(async (n) => {
    await wait(10);
    return n * 2;
  }),
);
console.log(doubled);
```

```output
[ 2, 4, 6 ]
```

## 10.7 Errors in async code

A rejected promise behaves like a thrown error once you `await` it, so the `try/catch` from Chapter 7 works. If nobody awaits or catches a rejected promise, Node.js reports an **unhandled rejection** and, by default, stops the program:

```text
Error: boom
    at go (file:///Users/you/qa/unhandled.mjs:1:28)
    ...more "at" lines...

Node.js v24.18.0
```

Always `await` (or `return`) the promises you create, so their errors reach a `try/catch` or the test runner.

## 10.8 The order things run in (optional detail)

JavaScript keeps two queues of waiting work. Promise callbacks (*microtasks*) run as soon as the current code finishes, **before** timers:

```js run
console.log("A");
setTimeout(() => console.log("D (timer)"), 0);
Promise.resolve().then(() => console.log("C (promise)"));
console.log("B");
```

```output
A
B
C (promise)
D (timer)
```

You rarely need this in tests, but it explains why a `.then` runs before a `setTimeout(…, 0)`.

## 10.9 Async in TypeScript

An async function's return type is `Promise<T>`, where `T` is the type of the value it resolves to. `await` unwraps it back to `T`:

```ts run
async function getCount(): Promise<number> {
  return 3;
}

const wrong: number = getCount();    // a Promise, not a number
const right: number = await getCount();
console.log(right);
```

TypeScript reports `Type 'Promise<number>' is not assignable to type 'number'.` on the first assignment. That's TypeScript catching a forgotten `await` for you.

Two more errors you'll see:

- Using `await` in a function that isn't `async`: `'await' expressions are only allowed within async functions and at the top levels of modules.`
- Returning the wrong type: an `async` function declared as `Promise<string>` that returns `5` is reported as `Type 'number' is not assignable to type 'string'.`

## Exercises

```exercise ts title="Load test data in parallel"
// A fake API: each call takes 100 ms.
const api = {
  getUser: (id: number) => new Promise<{ id: number; name: string }>((resolve) =>
    setTimeout(() => resolve({ id, name: `User ${id}` }), 100)),
  getOrders: (userId: number) => new Promise<number[]>((resolve) =>
    setTimeout(() => resolve([userId * 10, userId * 10 + 1]), 100)),
};

// 1. Write loadDashboard(userId). It should fetch the user AND the orders
//    IN PARALLEL (not one after the other), then return:
//    { name: <the user's name>, orderCount: <how many orders> }
async function loadDashboard(userId: number) {
  return { name: "", orderCount: 0 };
}

// 2. Call it for user 7 and store the result (don't forget await!).
const dashboard = { name: "", orderCount: 0 };

console.log(dashboard);
```

```checks
const __start = Date.now();
const __result = await loadDashboard(3);
const __ms = Date.now() - __start;
__book.test('loadDashboard(3) returns { name: "User 3", orderCount: 2 }', () => __result.name === "User 3" && __result.orderCount === 2);
__book.test("both requests run in parallel (well under 200 ms)", () => __result.name === "User 3" && __ms < 180);
__book.test("loadDashboard uses Promise.all", () => /Promise\.all\(/.test(__book.source));
__book.test('dashboard is { name: "User 7", orderCount: 2 }', () => dashboard.name === "User 7" && dashboard.orderCount === 2);
```

```solution
const api = {
  getUser: (id: number) => new Promise<{ id: number; name: string }>((resolve) =>
    setTimeout(() => resolve({ id, name: `User ${id}` }), 100)),
  getOrders: (userId: number) => new Promise<number[]>((resolve) =>
    setTimeout(() => resolve([userId * 10, userId * 10 + 1]), 100)),
};

async function loadDashboard(userId: number) {
  // Start both requests, then wait for both: about 100 ms instead of 200 ms
  const [user, orders] = await Promise.all([api.getUser(userId), api.getOrders(userId)]);
  return { name: user.name, orderCount: orders.length };
}

const dashboard = await loadDashboard(7);

console.log(dashboard);
```

```exercise js title="Fix the async loop"
// saveAll should save every name, one after another, and only return
// when they're all saved. Right now it returns too early.
const saved = [];
const save = (name) => new Promise((resolve) => setTimeout(() => { saved.push(name); resolve(); }, 20));

async function saveAll(names) {
  names.forEach(async (name) => {
    await save(name);
  });
}

await saveAll(["ana", "ben", "chen"]);
console.log(saved);
```

```checks
__book.test('saved is ["ana", "ben", "chen"] right after saveAll finishes', () => JSON.stringify(saved) === '["ana","ben","chen"]');
__book.test("saveAll no longer uses forEach", () => !/forEach/.test(__book.source));
```

```solution
const saved = [];
const save = (name) => new Promise((resolve) => setTimeout(() => { saved.push(name); resolve(); }, 20));

async function saveAll(names) {
  // for...of waits for each save before starting the next
  for (const name of names) {
    await save(name);
  }
}

await saveAll(["ana", "ben", "chen"]);
console.log(saved);
```

## Quiz

```quiz
[
  {
    "q": "What does this print?",
    "code": "console.log(\"a\");\nsetTimeout(() => console.log(\"b\"), 0);\nconsole.log(\"c\");",
    "options": ["`a b c`", "`a c b`", "`b a c`", "`a c` (b never prints)"],
    "answer": 1,
    "why": "The timer callback runs only after the current code finishes, even with a delay of 0."
  },
  {
    "q": "What does `await` do?",
    "options": [
      "Makes code run faster",
      "Pauses the async function until the promise settles, then gives its value or throws its error",
      "Waits exactly one second",
      "Turns a function into a promise"
    ],
    "answer": 1,
    "why": "`await` unwraps a promise: the fulfilled value, or a thrown error if it rejected."
  },
  {
    "q": "What do you get from calling an `async` function without `await`?",
    "options": ["The return value", "A Promise", "`undefined`", "An error"],
    "answer": 1,
    "why": "An async function always returns a promise. You need `await` to get the value."
  },
  {
    "q": "You need to create 5 independent test users through an API. What's the fastest correct approach?",
    "options": [
      "`users.forEach(async (u) => await create(u))`",
      "`await Promise.all(users.map((u) => create(u)))`",
      "Call `create` without `await`",
      "`for (const u of users) create(u);`"
    ],
    "answer": 1,
    "why": "`Promise.all` starts them all and waits until every one is done. `forEach` doesn't wait at all, and calls without `await` aren't waited for or checked."
  },
  {
    "q": "`Promise.all` is given three promises and the second one rejects. What happens?",
    "options": [
      "It waits for all three, then returns all results",
      "It rejects with the second promise's error",
      "It ignores the rejection",
      "It returns `undefined` for the second item"
    ],
    "answer": 1,
    "why": "`Promise.all` rejects as soon as any promise rejects. Use `Promise.allSettled` if you need every result regardless."
  },
  {
    "q": "In TypeScript, what's the return type of `async function getName() { return \"Ana\"; }`?",
    "options": ["`string`", "`Promise<string>`", "`async string`", "`void`"],
    "answer": 1,
    "why": "Async functions always return a promise of their result type."
  }
]
```

## Sources

Every example was run with Node.js v24.18.0, and the TypeScript messages were produced by TypeScript 7.0.2. The missing-`await` behaviour was checked with Playwright Test 1.65.0.

- MDN, *Using promises*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- MDN, *Promise* (states, `all`, `allSettled`, `race`, `any`): [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- MDN, *async function* and *await*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function), [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
- MDN, *Array.prototype.forEach* (doesn't wait for promises): [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach)
- MDN, *setTimeout*: [developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout)
- Node.js docs, *Process: 'unhandledRejection'* and `--unhandled-rejections`: [nodejs.org/api/cli.html#--unhandled-rejectionsmode](https://nodejs.org/api/cli.html#--unhandled-rejectionsmode)
- Playwright, *Best Practices* (lint with `no-floating-promises`, run `tsc --noEmit`): [playwright.dev/docs/best-practices](https://playwright.dev/docs/best-practices)
- TypeScript Handbook, *More on Functions* / `Promise<T>`: [typescriptlang.org/docs/handbook/2/functions.html](https://www.typescriptlang.org/docs/handbook/2/functions.html)
