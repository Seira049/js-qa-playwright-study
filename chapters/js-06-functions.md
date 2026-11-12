A **function** is a named, reusable piece of code. In test automation, functions are everywhere: every Playwright test *is* a function, and helpers like "log in", "build a test user", or "format a price" keep tests short and readable. This chapter covers how to write functions, pass data in and out, and type them in TypeScript.

**In this chapter you will learn:**

- three ways to write a function, and when to use each
- parameters, arguments, `return`, and what happens when there's no `return`
- default values, rest parameters, and destructured parameters
- passing functions to other functions (*callbacks*)
- scope and *closures*, and a practical use for them in test data
- how TypeScript checks function parameters and return values

## 6.1 Writing a function

### Function declaration

```js run
function add(a, b) {
  return a + b;
}

console.log(add(2, 3));
console.log(add(10, -4));
```

```output
5
6
```

- `add` is the function's **name**.
- `a` and `b` are **parameters**: placeholders for the values the function receives.
- `2` and `3` in `add(2, 3)` are **arguments**: the actual values passed in.
- `return` sends a value back to whoever *called* the function, and stops the function.

### Arrow function

An *arrow function* is a shorter way to write a function, stored in a variable:

```js run
const multiply = (a, b) => a * b;   // one expression: the result is returned automatically

const square = (n) => {             // with braces: you need an explicit return
  return n * n;
};

console.log(multiply(4, 5), square(3));
```

```output
20 9
```

Arrow functions are the usual choice for short callbacks, like the ones you passed to `map` and `filter` in Chapter 5. Playwright tests use them too: `test("title", async ({ page }) => { … })`.

> **Trap:** to return an object from a one-line arrow function, wrap it in parentheses. Without them, the braces are read as the function body.

```js run
const makeUser = () => ({ id: 1 }); // returns an object
const broken = () => { id: 1 };     // a body containing a label, returns undefined
console.log(makeUser(), broken());
```

```output
{ id: 1 } undefined
```

### Declaration or arrow?

Both work for most purposes. One real difference: a **function declaration** can be called before the line where it's written (it's *hoisted*), while an arrow function stored in `const` can't:

```js run
console.log(early(2));
function early(n) {
  return n * 10;
}
```

```output
20
```

Calling a `const` arrow function before its line throws `ReferenceError: Cannot access '…' before initialization`, the same rule as any `const` (Chapter 2).

## 6.2 Return values

A function without `return` (or with `return;` on its own) returns `undefined`:

```js run
function logOnly(message) {
  console.log(message);
}
const result = logOnly("hi");
console.log(result);
```

```output
hi
undefined
```

This is a common bug in helpers: a function that calculates something but forgets to `return` it. The caller gets `undefined`.

## 6.3 Parameters in more detail

### Missing and extra arguments

JavaScript doesn't check how many arguments you pass. Missing ones are `undefined`, and extra ones are ignored:

```js run
function add(a, b) {
  return a + b;
}
console.log(add(1));       // b is undefined, 1 + undefined is NaN
console.log(add(1, 2, 3)); // 3 is ignored
```

```output
NaN
3
```

TypeScript catches both mistakes (section 6.6).

### Default values

A **default** is used when the argument is missing or `undefined` (but not when it's `null`):

```js run
function greet(user = "Guest") {
  return `Hello, ${user}`;
}
console.log(greet());
console.log(greet("Ana"));
console.log(greet(undefined));
console.log(greet(null));
```

```output
Hello, Guest
Hello, Ana
Hello, Guest
Hello, null
```

### Rest parameters

`...name` as the **last** parameter collects any number of arguments into an array:

```js run
function sum(...numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}
console.log(sum(1, 2, 3), sum());
```

```output
6 0
```

### Destructured parameters

When a function needs several options, take **one object** and destructure it (Chapter 5). Callers then name each value, so the order doesn't matter and the call is easy to read:

```js run
function login({ email, password = "secret", rememberMe = false }) {
  return `${email} / ${password} / remember=${rememberMe}`;
}
console.log(login({ email: "ana@test.io" }));
console.log(login({ rememberMe: true, email: "ben@test.io" }));
```

```output
ana@test.io / secret / remember=false
ben@test.io / secret / remember=true
```

This is exactly what Playwright does: in `async ({ page }) => { … }`, Playwright passes an object of *fixtures*, and the test destructures the ones it needs.

### A test-data builder

Defaults plus spread make a very common test helper: a function that returns valid test data, which each test adjusts:

```js run
function buildUser(overrides = {}) {
  return { name: "Test User", role: "qa", active: true, ...overrides };
}
console.log(buildUser());
console.log(buildUser({ role: "admin" }));
```

```output
{ name: 'Test User', role: 'qa', active: true }
{ name: 'Test User', role: 'admin', active: true }
```

Every call returns a **new** object, so tests never share (and accidentally change) the same data.

## 6.4 Functions are values

A function is a value, like a number or a string. You can store it in a variable, put it in an array, and **pass it to another function**. A function passed to another function is called a **callback**:

```js run
function applyTo(value, fn) {
  return fn(value);
}
const square = (n) => n * n;

console.log(applyTo(5, square));                      // pass a named function
console.log(applyTo("qa", (s) => s.toUpperCase()));   // or write one inline
console.log(typeof square);
```

```output
25
QA
function
```

Note the difference: `square` is the function itself; `square(5)` *calls* it and gives `25`. When you pass a callback, pass the function, without parentheses.

## 6.5 Scope and closures

### Scope: where a variable is visible

A variable declared with `let` or `const` exists only inside the `{ … }` block where it's declared. Code outside the block can't see it:

```js run
if (true) {
  const inside = "only in here";
}
console.log(inside);
```

That throws `ReferenceError: inside is not defined`. Code **inside** a block (or function) can see variables from the blocks **around** it.

### Closures: functions remember where they were created

A function keeps access to the variables around it, even after the outer function has finished. This is called a **closure**. A practical use is generating unique test data:

```js run
function createIdGenerator(prefix) {
  let count = 0;            // private to this generator
  return () => {
    count++;
    return `${prefix}-${count}`;
  };
}

const nextUserId = createIdGenerator("user");
console.log(nextUserId(), nextUserId(), nextUserId());

const nextOrderId = createIdGenerator("order"); // its own separate count
console.log(nextOrderId());
```

```output
user-1 user-2 user-3
order-1
```

Each generator has its own `count`, which nothing else can change. In real tests you'd usually add something unique per run too, such as `Date.now()` or a random value, so data from different runs doesn't collide.

### Keep helpers predictable

A function that only uses its parameters and returns a result is easy to test and reuse. A function that changes variables outside itself is harder to reason about:

```js run
let total = 0;
function addToTotal(n) {
  total += n; // changes a variable outside the function
}
addToTotal(5);
addToTotal(5);
console.log(total);

const add = (a, b) => a + b; // depends only on its inputs
console.log(add(5, 5));
```

```output
10
10
```

Both print `10`, but `addToTotal` gives a different result depending on what ran before it. That's exactly the kind of hidden state that makes tests flaky when they run in a different order.

## 6.6 Functions in TypeScript

### Typing parameters and return values

Add a type after each parameter, and optionally after the parentheses for the return value:

```ts run
function formatPrice(amount: number, currency: string = "USD"): string {
  return `${currency} ${amount.toFixed(2)}`;
}
console.log(formatPrice(5));
console.log(formatPrice(19.9, "EUR"));
```

```output
USD 5.00
EUR 19.90
```

Now TypeScript checks every call:

```ts run
function add(a: number, b: number): number {
  return a + b;
}
add(1);        // too few arguments
add("1", 2);   // wrong type
```

TypeScript reports `Expected 2 arguments, but got 1.` and `Argument of type 'string' is not assignable to parameter of type 'number'.`

TypeScript usually infers the return type, so writing `: number` after the parentheses is optional. Writing it is still useful for helpers: if the function accidentally returns the wrong thing, the error appears inside the function instead of wherever it's used.

### Parameters must have types

TypeScript can't infer a parameter's type from nothing. With `strict` on, a parameter without a type is an error, `Parameter 'x' implicitly has an 'any' type.` Callbacks are the exception: in `users.map((u) => u.name)`, TypeScript already knows what `u` is from the array.

### Optional parameters

A `?` after the name makes a parameter optional. Inside the function its type includes `undefined`, so TypeScript makes you handle that:

```ts run
function label(text?: string): string {
  return text.toUpperCase();          // 'text' is possibly 'undefined'.
}
function safeLabel(text?: string): string {
  return (text ?? "untitled").toUpperCase();
}
console.log(safeLabel(), safeLabel("smoke"));
```

### void and function types

`void` means "returns nothing useful", for functions that only log or click. You can also describe the type of a function itself, which is handy for callback parameters:

```ts run
function log(message: string): void {
  console.log(`[test] ${message}`);
}

function runStep(name: string, step: () => void): void {
  log(`start: ${name}`);
  step();
  log(`end: ${name}`);
}

runStep("open page", () => console.log("...opening"));
```

```output
[test] start: open page
...opening
[test] end: open page
```

`step: () => void` means "a function that takes no arguments and returns nothing". Playwright's own `test.step(name, body)` works in a similar way.

## Exercises

```exercise ts title="Write test helpers"
// 1. formatStatus(code): return "OK" for 200, "Created" for 201,
//    and "Status <code>" for anything else, e.g. formatStatus(404) -> "Status 404".
//    Type the parameter and the return value.
function formatStatus(code) {
}

// 2. buildProduct(overrides): return a NEW object with these defaults:
//    { name: "Test Product", price: 10, inStock: true }
//    Any keys in overrides replace the defaults. overrides is optional.
const buildProduct = () => ({});

// 3. isPositiveNumber(value): true only for numbers greater than 0.
//    It must return false for NaN, for 0, and for the string "5".
const isPositiveNumber = (value: unknown): boolean => false;

console.log(formatStatus(200), formatStatus(404));
console.log(buildProduct({ price: 25 }));
console.log(isPositiveNumber(3), isPositiveNumber("5"));
```

```checks
__book.test('formatStatus(200) is "OK"', () => formatStatus(200) === "OK");
__book.test('formatStatus(201) is "Created"', () => formatStatus(201) === "Created");
__book.test('formatStatus(404) is "Status 404"', () => formatStatus(404) === "Status 404");
__book.test("buildProduct() returns the defaults", () => JSON.stringify(buildProduct()) === '{"name":"Test Product","price":10,"inStock":true}');
__book.test("buildProduct({ price: 25 }) overrides price only", () => JSON.stringify(buildProduct({ price: 25 })) === '{"name":"Test Product","price":25,"inStock":true}');
__book.test("buildProduct returns a new object each time", () => buildProduct() !== buildProduct());
__book.test("isPositiveNumber(3) is true", () => isPositiveNumber(3) === true);
__book.test("isPositiveNumber(0), (-1), (NaN) are false", () => !isPositiveNumber(0) && !isPositiveNumber(-1) && !isPositiveNumber(NaN));
__book.test('isPositiveNumber("5") is false', () => isPositiveNumber("5") === false);
```

```solution
function formatStatus(code: number): string {
  if (code === 200) return "OK";
  if (code === 201) return "Created";
  return `Status ${code}`;
}

const buildProduct = (overrides: { name?: string; price?: number; inStock?: boolean } = {}) => ({
  name: "Test Product",
  price: 10,
  inStock: true,
  ...overrides,
});

// typeof rules out strings; NaN > 0 is false, so NaN is handled too
const isPositiveNumber = (value: unknown): boolean => typeof value === "number" && value > 0;

console.log(formatStatus(200), formatStatus(404));
console.log(buildProduct({ price: 25 }));
console.log(isPositiveNumber(3), isPositiveNumber("5"));
```

The solution uses `if` before Chapter 7 covers it fully: `if (condition) return …;` returns early when the condition is true.

```exercise js title="A unique email generator"
// Write createEmailGenerator(domain). It returns a function; each call of that
// function returns the next email: "user1@<domain>", "user2@<domain>", ...
// Two generators must count separately.
function createEmailGenerator(domain) {
}

const nextEmail = createEmailGenerator("test.io");
console.log(nextEmail(), nextEmail());
```

```checks
__book.test("createEmailGenerator returns a function", () => typeof createEmailGenerator("a.io") === "function");
__book.test('first two calls give "user1@test.io", "user2@test.io"', () => { const g = createEmailGenerator("test.io"); return g() === "user1@test.io" && g() === "user2@test.io"; });
__book.test("two generators count separately", () => { const a = createEmailGenerator("a.io"); const b = createEmailGenerator("b.io"); a(); a(); return b() === "user1@b.io"; });
```

```solution
function createEmailGenerator(domain) {
  let count = 0; // each generator gets its own count (a closure)
  return () => {
    count++;
    return `user${count}@${domain}`;
  };
}

const nextEmail = createEmailGenerator("test.io");
console.log(nextEmail(), nextEmail());
```

## Quiz

```quiz
[
  {
    "q": "What does this print?",
    "code": "function double(n) {\n  n * 2;\n}\nconsole.log(double(4));",
    "options": ["`8`", "`4`", "`undefined`", "`NaN`"],
    "answer": 2,
    "why": "The function calculates `n * 2` but never returns it. A function without `return` returns `undefined`."
  },
  {
    "q": "What does this return?",
    "code": "const make = () => { ok: true };\nmake();",
    "options": ["`{ ok: true }`", "`true`", "`undefined`", "It throws a SyntaxError"],
    "answer": 2,
    "why": "The braces are read as a function body, not an object. Wrap the object in parentheses: `() => ({ ok: true })`."
  },
  {
    "q": "What does `greet(null)` return?",
    "code": "function greet(name = \"Guest\") {\n  return `Hi ${name}`;\n}",
    "options": ["`\"Hi Guest\"`", "`\"Hi null\"`", "`\"Hi undefined\"`", "It throws an error"],
    "answer": 1,
    "why": "Default values are only used for missing or `undefined` arguments. `null` is a real value, so it's used as-is."
  },
  {
    "q": "You want to pass `isActive` as a callback to `users.filter`. Which is correct?",
    "options": ["`users.filter(isActive())`", "`users.filter(isActive)`", "`users.filter(\"isActive\")`", "`users.filter(=> isActive)`"],
    "answer": 1,
    "why": "Pass the function itself. `isActive()` would call it immediately and pass its result instead."
  },
  {
    "q": "In TypeScript, what's wrong with `function add(a: number, b: number) { return a + b; }` called as `add(5)`?",
    "options": [
      "Nothing; `b` becomes 0",
      "TypeScript reports `Expected 2 arguments, but got 1.`",
      "It returns `\"5\"`",
      "TypeScript makes `b` optional automatically"
    ],
    "answer": 1,
    "why": "TypeScript checks the number of arguments. To make `b` optional, write `b?: number` or give it a default value."
  },
  {
    "q": "What is a closure?",
    "options": [
      "A function with no parameters",
      "A function that keeps access to variables from where it was created, even after that outer code has finished",
      "The closing brace of a function",
      "A function that can only be called once"
    ],
    "answer": 1,
    "why": "Closures are how `createIdGenerator` keeps its own `count` between calls."
  }
]
```

## Sources

Every example was run with Node.js v24.18.0, and the TypeScript messages were produced by TypeScript 7.0.2.

- MDN, *Functions* guide: [developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- MDN, *Arrow function expressions*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions) (returning object literals)
- MDN, *Default parameters*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters) (used only for `undefined`)
- MDN, *Rest parameters*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters)
- MDN, *Closures*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)
- MDN, *Hoisting*: [developer.mozilla.org/en-US/docs/Glossary/Hoisting](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting)
- TypeScript Handbook, *More on Functions*: [typescriptlang.org/docs/handbook/2/functions.html](https://www.typescriptlang.org/docs/handbook/2/functions.html) (function types, optional parameters, `void`)
- Playwright, *Fixtures* (destructured `{ page }`): [playwright.dev/docs/test-fixtures](https://playwright.dev/docs/test-fixtures)
- Playwright, *test.step*: [playwright.dev/docs/api/class-test#test-step](https://playwright.dev/docs/api/class-test#test-step)
