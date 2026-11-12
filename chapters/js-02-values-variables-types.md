Every test works with values: a URL, a status code, a user name, a flag that says whether a checkbox is ticked. This chapter shows how to store values in **variables**, what **types** of values JavaScript has, and how TypeScript keeps track of them for you.

**In this chapter you will learn:**

- how to create variables with `const` and `let`, and why to avoid `var`
- the eight types of values in JavaScript, and how to check a value's type with `typeof`
- how numbers behave, including the surprises (`0.1 + 0.2`, `NaN`)
- how to turn text from a web page into a number
- the difference between `undefined` and `null`
- how TypeScript infers types, and when to write them yourself

## 2.1 Variables: const and let

A **variable** is a name that holds a value. You create (*declare*) one with `const` or `let`, give it a name, and use `=` to give it a value.

```js run
const baseUrl = "https://example.com";
let attempts = 0;

console.log(baseUrl);
console.log(attempts);
```

```output
https://example.com
0
```

### const: the value can't be replaced

A variable declared with `const` must get a value straight away, and you can't assign a different value to it later.

```js run
const maxRetries = 3;
maxRetries = 4;
```

This stops with `TypeError: Assignment to constant variable.` A `const` with no value at all is a `SyntaxError` (`Missing initializer in const declaration`), so the code doesn't run at all.

### let: the value can change

Use `let` when the value needs to change, such as a counter:

```js run
let attempts = 0;
attempts = attempts + 1; // read the current value, add 1, store the result
attempts = attempts + 1;
console.log(attempts);
```

```output
2
```

`attempts = attempts + 1` looks odd if you read `=` as "equals". In JavaScript, `=` means **assign**: work out the right-hand side first, then store the result in the variable on the left.

A `let` declared without a value starts out as `undefined` (you'll meet `undefined` properly in section 2.7):

```js run
let token;
console.log(token);
```

```output
undefined
```

> **Which one should I use?** Use `const` by default, and switch to `let` only when you actually need to reassign the variable. MDN notes that many style guides, including its own, recommend this, because it makes your intent clear: anyone reading the code knows a `const` will keep the same value.

### Rules that catch mistakes

You can't use a `let` or `const` variable before the line that declares it:

```js run
console.log(total);
let total = 5;
```

That's a `ReferenceError: Cannot access 'total' before initialization`. You also can't declare the same name twice in the same place. `let status = 1;` followed by `let status = 2;` is a `SyntaxError: Identifier 'status' has already been declared`.

### What about var?

`var` is the original way to declare variables. You'll still see it in older code and older tutorials. It has rules that cause bugs. One example: a `var` can be read *before* its declaration and quietly gives `undefined` instead of an error:

```js run
console.log(counter);
var counter = 5;
console.log(counter);
```

```output
undefined
5
```

With `let`, the same mistake gives you a clear error. Use `const` and `let` in new code.

## 2.2 Naming variables

**Rules (enforced by JavaScript):**

- A name can contain letters, digits, `_`, and `$`.
- It can't **start** with a digit: `user1` is fine, `1stUser` is a `SyntaxError`.
- Names are case-sensitive: `count` and `Count` are two different variables.
- You can't use reserved words such as `const`, `class`, `function`, or `if` as names.

**Conventions (followed by almost all JavaScript code):**

- Use *camelCase*: start lowercase and capitalise each following word, as in `loginButton`, `maxRetries`, or `isLoggedIn`.
- Choose names that say what the value is. `expectedTitle` is easier to follow in a failing test than `t` or `data2`.
- Start true/false values with `is`, `has`, or `should`, as in `isVisible` or `hasError`.

## 2.3 The types of values

Every value has a **type**. The JavaScript standard defines eight. Seven are *primitive* (simple, single values) and the eighth is *object*:

| Type | Example values | Used in tests for |
|---|---|---|
| `string` | `"Sign in"`, `'qa@test.io'` | text, URLs, selectors |
| `number` | `200`, `19.99`, `-1` | status codes, counts, prices |
| `boolean` | `true`, `false` | flags such as "is visible" |
| `undefined` | `undefined` | a value that was never set |
| `null` | `null` | a value that is deliberately empty |
| `bigint` | `9007199254740993n` | very large whole numbers (rare in tests) |
| `symbol` | `Symbol("id")` | unique keys (rare in tests) |
| `object` | `{ id: 1 }`, `[1, 2]` | API responses, test data, lists |

Arrays (lists such as `[1, 2]`) and functions are kinds of object. You'll learn them in Chapters 5 and 6.

### Checking a type with typeof

`typeof` tells you the type of a value, as a string:

```js run
console.log(typeof "hello", typeof 42, typeof 3.14, typeof true);
console.log(typeof undefined, typeof null, typeof 10n, typeof Symbol("id"));
console.log(typeof { id: 1 }, typeof [1, 2], typeof function () {});
```

```output
string number number boolean
undefined object bigint symbol
object object function
```

Two results are surprising:

- **`typeof null` is `"object"`.** MDN calls this *"a bug in JavaScript that cannot be fixed due to backward compatibility."* To check for `null`, compare directly: `value === null`.
- **`typeof [1, 2]` is `"object"`.** Arrays are objects. To check for an array, use `Array.isArray(value)`, which returns `true` or `false`.

`typeof` is especially useful in API tests, to confirm a field has the type you expect (for example, that `id` is a number and not the string `"1"`).

## 2.4 Numbers

JavaScript has one `number` type for both whole numbers and decimals. There's no separate integer type. MDN: *"A number literal like 37 in JavaScript code is a floating-point value, not an integer."*

### Decimals aren't always exact

Numbers are stored in binary, in a standard format (IEEE 754) that many programming languages use. Some decimals, like `0.1`, can't be stored exactly in binary, so small rounding errors appear:

```js run
console.log(0.1 + 0.2);
console.log(0.1 + 0.2 === 0.3);
```

```output
0.30000000000000004
false
```

This matters when a test checks prices or totals. Two safe approaches:

```js run
const total = 0.1 + 0.2;

// 1. Round to 2 decimal places before comparing
console.log(Math.round(total * 100) / 100 === 0.3);

// 2. Format it as text with 2 decimal places (note: toFixed returns a string)
console.log(total.toFixed(2), typeof total.toFixed(2));
```

```output
true
0.30 string
```

### Very large whole numbers lose precision

Whole numbers are only exact up to `Number.MAX_SAFE_INTEGER`, which is 9,007,199,254,740,991. Beyond that, digits change silently:

```js run
console.log(Number.MAX_SAFE_INTEGER);
console.log(9007199254740993);
```

```output
9007199254740991
9007199254740992
```

The second line printed a different number from the one written in the code. This is why some APIs send very large IDs as strings. If an ID in a response looks slightly "off", this is a likely cause.

### NaN and Infinity

Some calculations produce special number values:

```js run
console.log(10 / 0, -10 / 0, 0 / 0);
console.log(typeof NaN);
```

```output
Infinity -Infinity NaN
number
```

`NaN` means "Not a Number", even though its type is `number`. It usually appears when converting text that isn't a number (next section). `NaN` is never equal to anything, **not even itself**, so check for it with `Number.isNaN()`:

```js run
const value = Number("abc");
console.log(value === NaN);       // never true!
console.log(Number.isNaN(value)); // the correct check
```

```output
false
true
```

## 2.5 Converting text into numbers

Text you read from a web page is **always a string**, even when it looks like a number. In Playwright, for example, `locator.textContent()` gives you a string (or `null`), so `"3"` from a cart badge isn't the number `3`. To do maths or compare numbers, convert first.

```js run
console.log(Number("42"), Number("19.99"), Number("  7  "));
console.log(Number("42px"), Number("$19.99"), Number(""));
console.log(parseInt("42px", 10), parseFloat("19.99 USD"));
```

```output
42 19.99 7
NaN NaN 0
42 19.99
```

What this shows:

- **`Number(text)`** converts the whole string. Spaces at the start or end are ignored, but anything else that isn't part of a number gives `NaN`. Watch out: an **empty string becomes `0`**, not `NaN`, which can hide a missing value.
- **`parseInt(text, 10)`** reads a whole number from the start of the string and stops at the first character that doesn't fit. The `10` means "base 10" (normal decimal numbers). Always include it; MDN calls including it a best practice.
- **`parseFloat(text)`** is the same idea, but reads decimals.
- None of them understand currency symbols: `Number("$19.99")` is `NaN`. Remove the symbol first (Chapter 4 shows how).

Going the other way, `String(404)` turns a number into the string `"404"`.

> **Testing tip:** after converting, check the result isn't `NaN` before you rely on it. Otherwise a broken page can produce `NaN`, and any comparison with `NaN` is `false`. That can make an assertion fail for a confusing reason.

## 2.6 Strings and booleans

**Strings** are text in quotes. You can use double quotes `"…"`, single quotes `'…'`, or backticks `` `…` ``. All three make the same kind of value. This book uses double quotes. Backticks have extra powers, which Chapter 4 covers along with the other string skills you need for tests.

**Booleans** are the two values `true` and `false`. They're the result of every comparison:

```js run
const statusCode = 200;
const isOk = statusCode === 200;
console.log(isOk, typeof isOk);
```

```output
true boolean
```

`===` means "is equal to". Chapter 3 covers comparisons and the related idea of *truthy* and *falsy* values.

## 2.7 undefined and null

JavaScript has two values that mean "nothing here":

- **`undefined`** usually means a value was never set. You get it from a `let` with no value, or by reading an object property that doesn't exist.
- **`null`** means a value was **deliberately** set to empty. JavaScript never creates `null` by itself; a person or an API chose it.

```js run
let token;
const user = { id: 1 };

console.log(token);      // declared, never given a value
console.log(user.email); // property doesn't exist
console.log(null === undefined);
```

```output
undefined
undefined
false
```

### Why the difference matters in API tests

JSON, the format most APIs use, has `null` but no `undefined`. When an object is turned into JSON, properties that are `undefined` are **dropped completely**:

```js run
const payload = { id: 1, email: undefined, phone: null };
console.log(JSON.stringify(payload));
```

```output
{"id":1,"phone":null}
```

So in an API response, `"phone": null` (the field exists but is empty) is different from a missing `email` field. That difference can be a real bug, for example when a contract says a field must always be present. Your assertions should check for the one you expect.

## 2.8 const doesn't freeze objects

`const` stops you assigning a **new value** to the variable. It doesn't stop you changing the **contents** of an object or array the variable points to:

```js run
const tags = ["smoke"];
tags.push("login"); // allowed: changes the array's contents

const config = { retries: 1 };
config.retries = 3; // allowed: changes a property

console.log(tags, config);
```

```output
[ 'smoke', 'login' ] { retries: 3 }
```

What `const` forbids is `tags = ["other"]` or `config = {}`. Chapter 5 explains objects and arrays in detail.

## 2.9 Types in TypeScript

TypeScript adds a type to every variable and checks that you use it consistently. Most of the time you don't have to write anything.

### Inference: TypeScript works it out

When you give a variable a value, TypeScript *infers* (works out) its type from that value. Run this and read the problem it reports:

```ts run
let attempts = 0;      // TypeScript infers: number
attempts = "three";    // a string, but attempts is a number
console.log(attempts);
```

TypeScript reports `Type 'string' is not assignable to type 'number'`. Plain JavaScript would accept this silently, and the bug would show up later, wherever `attempts` is used as a number. In the playground, hover over a variable name to see the type TypeScript inferred.

The TypeScript Handbook advises: *"If you're starting out, try using fewer type annotations than you think."* If TypeScript can infer the type, you don't need to write it.

### When to write a type annotation

Write the type yourself when TypeScript has nothing to infer from, such as a variable declared without a value:

```ts run
let authToken: string;   // no value yet, so say what it will hold
authToken = "abc123";
console.log(authToken);
```

```output
abc123
```

If you forget to give it a value before using it, TypeScript tells you: `Variable 'authToken' is used before being assigned.`

Use the **lowercase** names `string`, `number`, and `boolean`. The Handbook says that `String`, `Number`, and `Boolean` with capital letters *"refer to some special built-in types that will very rarely appear in your code. Always use string, number, or boolean for types."*

### null and undefined in TypeScript

With TypeScript's `strict` setting on, `null` can't go into a `string` variable. That stops you calling string methods on something that's actually empty:

```ts run
let lastError: string = null;            // problem: null is not a string
let lastWarning: string | null = null;   // OK: "a string, or null"
console.log(lastError, lastWarning);
```

`string | null` means "either a string or `null`". This is called a *union type*, and Chapter 11 covers it fully. `strict` is on by default in TypeScript 6.0 and later, in `tsconfig.json` files created by `tsc --init`, and in this book's playground.

### Avoid any

TypeScript has a type called `any` that switches off checking for a value. The Handbook explains: *"Using any disables all further type checking."* It's sometimes tempting when a type is hard to write, but it removes the safety you're using TypeScript for. You'll learn better options, such as `unknown`, in Chapter 11.

## Exercises

```exercise ts title="Store some test settings"
// 1. Create a variable maxRetries that holds 3 and can never be reassigned.


// 2. Create a variable attempts that starts at 0.
//    Then, on a separate line below, change it to 1.


// 3. This is text read from a web page. Create a variable `price`
//    that holds it as a number (19.99), using Number().
const priceText = "19.99";


// 4. Create a variable lastError that can hold a string or null,
//    and set it to null for now.

```

```checks
__book.test("maxRetries is 3", () => maxRetries === 3);
__book.test("maxRetries is declared with const", () => /\bconst\s+maxRetries\b/.test(__book.source));
__book.test("attempts is declared with let and is now 1", () => /\blet\s+attempts\b/.test(__book.source) && attempts === 1);
__book.test("price is the number 19.99", () => typeof price === "number" && price === 19.99);
__book.test("price is converted from priceText", () => /Number\(\s*priceText\s*\)/.test(__book.source));
__book.test("lastError is null", () => lastError === null);
```

```solution
// 1. const: never reassigned
const maxRetries = 3;

// 2. let: the value changes
let attempts = 0;
attempts = 1;

// 3. Convert the text into a number
const priceText = "19.99";
const price = Number(priceText);

// 4. A union type allows either a string or null
let lastError: string | null = null;

console.log(maxRetries, attempts, price, lastError);
```

```exercise ts title="Fix the type annotations"
// Each annotation is wrong. Fix the TYPES so TypeScript reports no problems.
// Don't change the values on the right-hand side.
const statusCode: string = 404;
const isVisible: number = false;
let userName: boolean = "qa_ana";

console.log(statusCode, isVisible, userName);
```

```checks
__book.test("statusCode is still 404", () => statusCode === 404);
__book.test("isVisible is still false", () => isVisible === false);
__book.test('userName is still "qa_ana"', () => userName === "qa_ana");
```

```solution
const statusCode: number = 404;
const isVisible: boolean = false;
let userName: string = "qa_ana";

// You could also remove the annotations completely and let TypeScript infer them:
// const statusCode = 404;

console.log(statusCode, isVisible, userName);
```

The second exercise only passes when TypeScript reports **no problems**, so read each message carefully.

## Quiz

```quiz
[
  {
    "q": "Which declaration should you use for a value that never needs to be reassigned?",
    "options": ["`var`", "`let`", "`const`", "No keyword at all"],
    "answer": 2,
    "why": "Use `const` by default. It can't be reassigned, which makes your intent clear. Use `let` only when the value needs to change."
  },
  {
    "q": "What does this print?",
    "code": "console.log(typeof null);",
    "options": ["`\"null\"`", "`\"undefined\"`", "`\"object\"`", "It throws an error"],
    "answer": 2,
    "why": "`typeof null` is `\"object\"`, a long-standing bug that can't be fixed for backward compatibility. Check for null with `value === null`."
  },
  {
    "q": "A cart badge on the page shows `3 items`. What does `Number(\"3 items\")` return?",
    "options": ["`3`", "`NaN`", "`\"3\"`", "`0`"],
    "answer": 1,
    "why": "`Number()` converts the whole string, and `\"3 items\"` isn't a valid number, so the result is `NaN`. `parseInt(\"3 items\", 10)` would return `3`."
  },
  {
    "q": "What does `0.1 + 0.2 === 0.3` evaluate to?",
    "options": ["`true`", "`false`", "`NaN`", "It throws an error"],
    "answer": 1,
    "why": "`0.1 + 0.2` is `0.30000000000000004` because some decimals can't be stored exactly in binary. Round before comparing, e.g. `Math.round(total * 100) / 100`."
  },
  {
    "q": "What does this print?",
    "code": "const body = { id: 7, nickname: undefined, avatar: null };\nconsole.log(JSON.stringify(body));",
    "options": [
      "`{\"id\":7,\"nickname\":undefined,\"avatar\":null}`",
      "`{\"id\":7,\"nickname\":null,\"avatar\":null}`",
      "`{\"id\":7,\"avatar\":null}`",
      "`{\"id\":7}`"
    ],
    "answer": 2,
    "why": "JSON has no `undefined`, so properties with that value are left out. `null` is kept."
  },
  {
    "q": "In TypeScript, what happens here?",
    "lang": "ts",
    "code": "let count = 0;\ncount = \"1\";",
    "options": [
      "Nothing; `count` is now `\"1\"`",
      "TypeScript reports an error: `count` was inferred as `number`",
      "TypeScript converts `\"1\"` to the number `1`",
      "JavaScript throws a `TypeError` when it runs"
    ],
    "answer": 1,
    "why": "TypeScript inferred `count` as `number` from its first value, so assigning a string is an error. At runtime, plain JavaScript would allow it, which is exactly the kind of bug TypeScript catches."
  }
]
```

## Sources

Every example was run with Node.js v24.18.0, and every TypeScript error message was produced by TypeScript 7.0.2.

- MDN, *let*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let) (block scope, temporal dead zone, redeclaration, `const` over `let` recommendation)
- MDN, *const*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const)
- MDN, *Grammar and types*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types) (the eight data types, identifier rules, `const` and object contents)
- MDN, *typeof*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)
- MDN, *null*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/null](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/null) (`typeof null`, JSON and `null`)
- MDN, *Number*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) (IEEE 754, safe integers, conversion rules)
- MDN, *parseInt*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt)
- MDN, *Number.isNaN*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN)
- MDN, *JSON.stringify*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) (`undefined` properties are omitted)
- TypeScript Handbook, *Everyday Types*: [typescriptlang.org/docs/handbook/2/everyday-types.html](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) (inference, lowercase type names, `any`, `null` and `strictNullChecks`)
- TypeScript 6.0 release notes: [typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) (`strict` is now `true` by default)
- Playwright, *Locator.textContent*: [playwright.dev/docs/api/class-locator#locator-text-content](https://playwright.dev/docs/api/class-locator#locator-text-content)
