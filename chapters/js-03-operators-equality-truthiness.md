Tests are full of comparisons: *is the status 200? is the total greater than zero? is the error message empty?* This chapter covers the operators that do maths and comparisons, the difference between `==` and `===`, and the *truthy/falsy* rules that decide what counts as "true" in an `if`.

**In this chapter you will learn:**

- arithmetic operators, and why `"5" + 1` is `"51"` but `"5" - 1` is `4`
- why tests should use `===`, never `==`
- how strings and objects are compared
- the logical operators `&&`, `||`, `!`, and the safer `??` and `?.`
- which values are *falsy*, and the traps that causes in tests
- how TypeScript catches comparisons that can never be true

## 3.1 Arithmetic

```js run
console.log(7 + 2, 7 - 2, 7 * 2, 7 / 2);
console.log(7 % 2);  // remainder after dividing 7 by 2
console.log(2 ** 3); // 2 to the power of 3
```

```output
9 5 14 3.5
1
8
```

Multiplication and division happen before addition and subtraction, as in normal maths. Use parentheses to make the order explicit:

```js run
console.log(2 + 3 * 4, (2 + 3) * 4);
```

```output
14 20
```

### Shortcuts for updating a variable

```js run
let count = 5;
count += 2; // same as count = count + 2  -> 7
count -= 1; // count = count - 1          -> 6
count *= 2; // count = count * 2          -> 12
count++;    // add 1                      -> 13
console.log(count);
```

```output
13
```

### + also joins strings

When either side of `+` is a string, `+` **joins** (concatenates) instead of adding. The other operators (`-`, `*`, `/`) always try to convert both sides to numbers:

```js run
console.log("Total: " + 3);
console.log("5" + 1);   // joins
console.log("5" - 1);   // subtracts
console.log("5" * "2"); // multiplies
console.log(1 + 2 + "3", "1" + 2 + 3); // left to right
```

```output
Total: 3
51
4
10
33 123
```

The last line is read left to right: `1 + 2` is `3`, then `3 + "3"` is `"33"`. In the second, `"1" + 2` is already a string, so everything after it is joined.

> **Testing trap:** text read from a page is a string (Chapter 2). If you do `cartCount + 1` with `cartCount = "3"`, you get `"31"`, not `4`. Convert with `Number()` first.

## 3.2 Comparing values: use ===

`===` (strict equality) is `true` only when both values have the **same type and the same value**. `!==` is its opposite.

```js run
console.log(5 === 5, 5 === "5", 5 !== "5");
console.log(3 < 10, 10 >= 10);
```

```output
true false true
true true
```

### Why not ==?

`==` (loose equality) converts the values to a common type before comparing. The rules are hard to remember and give surprising results:

```js run
console.log(0 == "", "1" == 1, 0 == "0");
console.log("" == "0", false == "0", null == undefined);
```

```output
true true true
false true true
```

`0 == ""` and `0 == "0"` are both `true`, yet `"" == "0"` is `false`. In a test, `==` can make a wrong value pass: `"1" == 1` is `true`, so an API returning the string `"1"` instead of the number `1` would go unnoticed. **Always use `===` and `!==`.** Playwright's assertions, such as `expect(x).toBe(y)`, compare strictly as well.

### Comparing strings

Strings compare character by character, using each character's code. Capital letters come before lowercase letters, and digits compare as text, not as numbers:

```js run
console.log("apple" < "banana");
console.log("Zebra" < "apple");
console.log("10" < "9", 10 < 9);
```

```output
true
true
true false
```

`"10" < "9"` is `true` because the first characters are compared: `"1"` comes before `"9"`. This matters when you test that a table is sorted. If the values are numbers stored as text, convert them before comparing.

### Comparing objects and arrays

Objects and arrays are compared by **identity** (whether they are the same object), not by their contents:

```js run
console.log({ id: 1 } === { id: 1 });
console.log([1] === [1]);

const a = { id: 1 };
const b = a; // b points to the same object as a
console.log(a === b);
```

```output
false
false
true
```

Two objects with the same contents are still two different objects. To compare contents in a Playwright test, use `expect(actual).toEqual(expected)`, which checks values recursively. `toBe` uses `Object.is`, which behaves like `===` for objects.

## 3.3 Logical operators

| Operator | Name | Meaning |
|---|---|---|
| `a && b` | AND | `true` only if both are true |
| `a \|\| b` | OR | `true` if at least one is true |
| `!a` | NOT | flips `true` and `false` |

```js run
const statusCode = 201;
const isSuccess = statusCode >= 200 && statusCode < 300;
const isRedirect = statusCode === 301 || statusCode === 302;
console.log(isSuccess, isRedirect, !isSuccess);
```

```output
true false false
```

### && and || return one of their values

`&&` and `||` don't always return `true` or `false`. They return **one of the two values**, and they stop as soon as they know the answer (*short-circuit*):

- `a || b` returns `a` if `a` is truthy, otherwise `b`.
- `a && b` returns `a` if `a` is falsy, otherwise `b`.

```js run
console.log("" || "default", "qa" || "default");
console.log(true && "yes", false && "yes");
```

```output
default qa
yes false
```

That's why `||` is often used for default values. But it has a trap: **`0` and `""` are falsy**, so they get replaced too.

### ?? : a default only for null and undefined

The *nullish coalescing* operator `??` returns the right-hand side **only** when the left is `null` or `undefined`:

```js run
const configuredRetries = 0; // the user deliberately chose 0

console.log(configuredRetries || 3); // 3 (wrong: 0 was replaced)
console.log(configuredRetries ?? 3); // 0 (correct)
console.log(null ?? "Guest", undefined ?? "Guest");
```

```output
3
0
Guest Guest
```

Use `??` for defaults whenever `0`, `""`, or `false` are valid values.

### ?. : read a property that might not exist

Reading a property of `null` or `undefined` throws a `TypeError`. The *optional chaining* operator `?.` returns `undefined` instead:

```js run
const user = { name: "Ana", address: null };
console.log(user.address?.city);
console.log(user.profile?.age);
console.log(user.address.city); // no ?. here
```

The first two lines print `undefined`. The third throws `TypeError: Cannot read properties of null (reading 'city')`. You'll use `?.` often with API responses, where some fields are optional.

## 3.4 Truthy and falsy

`if` and the logical operators need a true/false answer, so JavaScript converts any value to a boolean. According to MDN, these are **all** the falsy values:

| Falsy value | Type |
|---|---|
| `false` | boolean |
| `0`, `-0` | number |
| `0n` | bigint |
| `""` (empty string) | string |
| `null` | null |
| `undefined` | undefined |
| `NaN` | number |

(MDN also lists `document.all`, a browser oddity you won't meet in tests.)

**Every other value is truthy**, including some that look empty:

```js run
console.log(Boolean("0"), Boolean("false"), Boolean(" "));
console.log(Boolean([]), Boolean({}), Boolean(-1));
```

```output
true true true
true true true
```

`Boolean(value)` and `!!value` both convert a value to `true` or `false`.

### Truthiness traps in tests

```js run
const itemCount = 0;
if (itemCount) {
  console.log("Cart has items");
} else {
  console.log("Cart is empty or the count is missing");
}
```

```output
Cart is empty or the count is missing
```

`if (itemCount)` can't tell the difference between `0` (a real count), `undefined` (missing), and `NaN` (a failed conversion). When the difference matters, and in tests it usually does, compare explicitly: `itemCount === 0`, `itemCount === undefined`, `Number.isNaN(itemCount)`.

The same applies to empty arrays: `[]` is truthy, so `if (results)` is true even when there are no results. Check `results.length === 0` instead.

## 3.5 TypeScript catches impossible comparisons

TypeScript knows each variable's type, so it can spot comparisons that can never be true, and maths on the wrong types:

```ts run
const statusCode: number = 200;

if (statusCode === "200") {   // comparing a number with a string
  console.log("never runs");
}

const total = "5" - 1;        // subtracting from a string
console.log(total);
```

TypeScript reports two problems:

- `This comparison appears to be unintentional because the types 'number' and 'string' have no overlap.`
- `The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.`

Plain JavaScript runs this without complaint: the `if` is silently `false`, and `total` is `4`.

## Exercises

```exercise ts title="Evaluate an API response"
const statusCode = 204;
const nickname: string | null = null;
const pageSize = 0; // the API deliberately returned 0

// 1. isSuccess: true when statusCode is from 200 to 299 (inclusive)
const isSuccess = false; // replace false with an expression

// 2. displayName: nickname, or "Guest" when nickname is null or undefined
const displayName = ""; // replace "" with an expression

// 3. size: pageSize, or 20 ONLY when pageSize is null or undefined.
//    Because pageSize is 0, size should be 0.
const size = -1; // replace -1 with an expression

console.log(isSuccess, displayName, size);
```

```checks
__book.test("isSuccess is true for 204", () => isSuccess === true);
__book.test("isSuccess uses >= and <", () => /statusCode\s*>=\s*200/.test(__book.source) && /statusCode\s*<\s*300|statusCode\s*<=\s*299/.test(__book.source));
__book.test('displayName is "Guest"', () => displayName === "Guest");
__book.test("size is 0 (not 20)", () => size === 0);
__book.test("size uses ??", () => /pageSize\s*\?\?\s*20/.test(__book.source));
```

```solution
const statusCode = 204;
const nickname: string | null = null;
const pageSize = 0;

const isSuccess = statusCode >= 200 && statusCode < 300;
const displayName = nickname ?? "Guest";
const size = pageSize ?? 20; // || would give 20, because 0 is falsy

console.log(isSuccess, displayName, size);
```

```exercise js title="Fix the buggy checks"
// Each check below gives the wrong answer. Fix the operators.
const responseId = "42";          // the API returned a string
const expectedId = 42;            // the contract says it must be a number
const errors = [];                // no errors collected

// Should be false, because the types differ:
const idMatches = responseId == expectedId;

// Should be true, because there are no errors:
const noErrors = !errors;

console.log(idMatches, noErrors);
```

```checks
__book.test("idMatches is false", () => idMatches === false);
__book.test("idMatches uses ===", () => /responseId\s*===\s*expectedId|expectedId\s*===\s*responseId/.test(__book.source));
__book.test("noErrors is true", () => noErrors === true);
__book.test("noErrors checks the array's length", () => /errors\.length/.test(__book.source));
```

```solution
const responseId = "42";
const expectedId = 42;
const errors = [];

// === also compares the type, so "42" and 42 are not equal
const idMatches = responseId === expectedId;

// [] is truthy, so !errors is always false. Check the length instead.
const noErrors = errors.length === 0;

console.log(idMatches, noErrors);
```

## Quiz

```quiz
[
  {
    "q": "What does this print?",
    "code": "const cartCount = \"3\";\nconsole.log(cartCount + 1);",
    "options": ["`4`", "`\"31\"` (shown as `31`)", "`NaN`", "It throws an error"],
    "answer": 1,
    "why": "When one side of `+` is a string, `+` joins strings. Convert first: `Number(cartCount) + 1` is `4`."
  },
  {
    "q": "Why should tests use `===` instead of `==`?",
    "options": [
      "`===` is faster",
      "`==` converts types before comparing, so values like `\"1\"` and `1` count as equal",
      "`==` only works with numbers",
      "There is no difference"
    ],
    "answer": 1,
    "why": "Loose equality converts types and can make a wrong value pass. Strict equality also checks the type."
  },
  {
    "q": "What does `{ id: 1 } === { id: 1 }` evaluate to?",
    "options": ["`true`", "`false`", "`undefined`", "It throws an error"],
    "answer": 1,
    "why": "Objects are compared by identity. These are two separate objects, so the result is `false`. Use `toEqual` in Playwright to compare contents."
  },
  {
    "q": "A setting `timeoutMs` is `0`, meaning \"no timeout\". Which expression keeps the `0` and only falls back to `30000` when the setting is missing?",
    "options": ["`timeoutMs || 30000`", "`timeoutMs && 30000`", "`timeoutMs ?? 30000`", "`!timeoutMs`"],
    "answer": 2,
    "why": "`??` only uses the fallback for `null` or `undefined`. `||` treats `0` as falsy and replaces it."
  },
  {
    "q": "Which of these values is truthy?",
    "options": ["`0`", "`\"\"`", "`[]`", "`null`"],
    "answer": 2,
    "why": "An empty array is an object, and all objects are truthy. Check `array.length === 0` to test for an empty array."
  },
  {
    "q": "What does `\"10\" < \"9\"` evaluate to?",
    "options": ["`true`", "`false`", "`NaN`", "It throws an error"],
    "answer": 0,
    "why": "Both are strings, so they're compared character by character: `\"1\"` comes before `\"9\"`. Convert to numbers to compare numerically."
  }
]
```

## Sources

Every example was run with Node.js v24.18.0, and the TypeScript messages were produced by TypeScript 7.0.2.

- MDN, *Expressions and operators*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_operators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_operators)
- MDN, *Equality comparisons and sameness*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness)
- MDN, *Falsy*: [developer.mozilla.org/en-US/docs/Glossary/Falsy](https://developer.mozilla.org/en-US/docs/Glossary/Falsy) (the complete list of falsy values)
- MDN, *Truthy*: [developer.mozilla.org/en-US/docs/Glossary/Truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy)
- MDN, *Nullish coalescing operator (??)*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)
- MDN, *Optional chaining (?.)*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
- Playwright, *Assertions* (`toBe`, `toEqual`): [playwright.dev/docs/api/class-genericassertions](https://playwright.dev/docs/api/class-genericassertions)
