Most of what a UI test checks is text: headings, button labels, error messages, URLs. This chapter covers how to build strings, how to clean up and search text read from a page, and the basics of *regular expressions*, which Playwright accepts in many assertions.

**In this chapter you will learn:**

- the three kinds of quotes, and how to put special characters in a string
- template literals: building strings with `${…}`
- the string methods you'll use most in tests
- why string methods never change the original string
- how to turn messy page text like `"  Total: $1,299.99  "` into a number
- just enough regular expressions to match patterns

## 4.1 Writing strings

A string can use double quotes, single quotes, or backticks. All three create the same kind of value:

```js run
console.log("double", 'single', `backtick`);
```

```output
double single backtick
```

To put a special character inside a string, *escape* it with a backslash `\`:

| You write | You get |
|---|---|
| `\"` | a double quote inside `"…"` |
| `\'` | a single quote inside `'…'` |
| `\\` | one backslash |
| `\n` | a new line |
| `\t` | a tab |

```js run
console.log("She said \"hi\"", 'It\'s fine', "C:\\tests");
console.log("Line 1\nLine 2");
```

```output
She said "hi" It's fine C:\tests
Line 1
Line 2
```

## 4.2 Template literals

Strings in **backticks** are *template literals*. They let you insert any expression with `${…}`:

```js run
const user = "Ana";
const count = 3;
console.log(`Hello, ${user}! You have ${count} tests.`);
console.log(`Total: ${count * 2}`);
```

```output
Hello, Ana! You have 3 tests.
Total: 6
```

This is easier to read than joining with `+` (`"Hello, " + user + "! You have " + count + " tests."`), and you can't forget a space. Template literals can also span several lines:

```js run
const report = `Run finished
Passed: 5
Failed: 1`;
console.log(report);
```

```output
Run finished
Passed: 5
Failed: 1
```

In tests you'll use template literals constantly, to build URLs and expected text:

```js run
const baseUrl = "https://shop.test";
const productId = 42;
console.log(`${baseUrl}/products/${productId}?ref=home`);
```

```output
https://shop.test/products/42?ref=home
```

## 4.3 Length and characters

```js run
const title = "Sign in";
console.log(title.length);  // number of characters
console.log(title[0]);      // first character (positions start at 0)
console.log(title.at(-1));  // last character (negative counts from the end)
console.log(title[99]);     // no character there
```

```output
7
S
n
undefined
```

> **Note on emoji:** `length` counts *UTF-16 code units*, not visible characters. Most characters are one unit, but many emoji are two: `"👍".length` is `2`. If you test a character limit on a field that accepts emoji, keep this in mind.

## 4.4 Strings never change

String methods **return a new string**. The original is never modified. If you don't store the result, it's lost:

```js run
let status = "passed";
status.toUpperCase();           // result is thrown away
console.log(status);

status = status.toUpperCase();  // store the new string
console.log(status);
```

```output
passed
PASSED
```

## 4.5 The string methods you'll use most

### Cleaning up text: trim, toLowerCase, toUpperCase

Text read from a page often has extra spaces or line breaks around it. `trim()` removes whitespace from both ends:

```js run
const label = "  Add to Cart \n";
console.log(`[${label.trim()}]`);
console.log(label.trim().toUpperCase());
console.log(label.trim().toLowerCase());
```

```output
[Add to Cart]
ADD TO CART
add to cart
```

There are also `trimStart()` and `trimEnd()` for one side only.

### Searching: includes, startsWith, endsWith, indexOf

```js run
const msg = "Error: invalid password";
console.log(msg.includes("invalid"));   // anywhere in the string?
console.log(msg.startsWith("Error"));
console.log(msg.endsWith("!"));
console.log(msg.indexOf("invalid"));    // position, or -1 if not found
console.log(msg.indexOf("expired"));
```

```output
true
true
false
7
-1
```

All of these are **case-sensitive**. To ignore case, lowercase both sides first:

```js run
const msg = "Error: Invalid password";
console.log(msg.includes("invalid"));
console.log(msg.toLowerCase().includes("invalid"));
```

```output
false
true
```

### Cutting and splitting: slice, split

`slice(start, end)` returns part of a string, from `start` up to (but **not** including) `end`. Negative numbers count from the end:

```js run
const url = "https://shop.test/products/42";
console.log(url.slice(0, 5));  // characters 0 to 4
console.log(url.slice(8));     // from position 8 to the end
console.log(url.slice(-2));    // last 2 characters
```

```output
https
shop.test/products/42
42
```

`split(separator)` breaks a string into an **array** of pieces (arrays are covered in Chapter 5):

```js run
console.log("smoke,login,checkout".split(","));
console.log("/products/42".split("/"));
```

```output
[ 'smoke', 'login', 'checkout' ]
[ '', 'products', '42' ]
```

### Replacing: replace and replaceAll

`replace` changes the **first** match only. `replaceAll` changes every match:

```js run
console.log("a-b-c".replace("-", "+"));
console.log("a-b-c".replaceAll("-", "+"));
```

```output
a+b-c
a+b+c
```

### Padding and repeating

```js run
console.log(String(7).padStart(3, "0")); // e.g. order numbers like 007
console.log("-".repeat(20));
```

```output
007
--------------------
```

### Putting it together: page text to a number

Here's a common task: a page shows a price, and the test needs the number.

```js run
const priceText = "  Total: $1,299.99  ";

const cleaned = priceText
  .trim()                     // "Total: $1,299.99"
  .replace("Total: $", "")    // "1,299.99"
  .replaceAll(",", "");       // "1299.99"

const price = Number(cleaned);
console.log(price, typeof price);
```

```output
1299.99 number
```

Each method returns a new string, so you can *chain* them: call one method on the result of the previous one.

## 4.6 Comparing and sorting strings

`===` compares strings exactly, including case and spaces. Normalise both sides when the test shouldn't care about case:

```js run
console.log("Welcome" === "welcome");
console.log("Welcome".toLowerCase() === "WELCOME".toLowerCase());
```

```output
false
true
```

To test that a list is sorted alphabetically the way a person would expect, compare with `localeCompare`. The default sort orders by character code, which puts every capital letter before any lowercase letter:

```js run
const names = ["banana", "apple", "Cherry"];
console.log([...names].sort());
console.log([...names].sort((a, b) => a.localeCompare(b)));
```

```output
[ 'Cherry', 'apple', 'banana' ]
[ 'apple', 'banana', 'Cherry' ]
```

(`[...names]` makes a copy so the original array isn't changed. Chapter 5 explains copying and sorting arrays.)

## 4.7 A first look at regular expressions

A **regular expression** (*regex*) describes a pattern of text. In JavaScript you write one between slashes: `/dashboard/`. You'll meet them in Playwright all the time, for example `await expect(page).toHaveURL(/dashboard/)`.

```js run
console.log(/dashboard/.test("/app/dashboard?tab=1")); // contains "dashboard"?
console.log(/^order-\d+$/.test("order-1042"));
console.log(/^order-\d+$/.test("order-abc"));
console.log(/welcome/i.test("WELCOME BACK"));          // i = ignore case
```

```output
true
true
false
true
```

The pieces you'll use most:

| Pattern | Matches |
|---|---|
| `abc` | the text `abc` anywhere |
| `^` / `$` | the start / the end of the string |
| `\d` | one digit (0–9) |
| `+` | one or more of the thing before it |
| `.` | any single character |
| `.*` | any text (zero or more characters) |
| `i` after the closing `/` | ignore case |

`match` returns what was found, or `null`:

```js run
const confirmation = "Order #1042 confirmed";
const found = confirmation.match(/\d+/);
console.log(found[0]);
console.log("no digits here".match(/\d+/));
```

```output
1042
null
```

> **In Playwright:** when you pass a **string** to `toHaveText` or `toContainText`, Playwright normalises whitespace and line breaks in both the actual and expected text before comparing. When you pass a **regular expression**, the actual text is matched exactly as it is. Both assertions also accept an `ignoreCase` option.

Regular expressions can do much more. MDN's regex guide (linked in Sources) is a good reference when you need more.

## 4.8 TypeScript and strings

TypeScript knows every string method, so your editor autocompletes them and catches typos before the code runs:

```ts run
const title: string = "Sign in";
console.log(title.toUppercase());
```

TypeScript reports `Property 'toUppercase' does not exist on type 'string'. Did you mean 'toUpperCase'?` Without TypeScript, you'd only find out when the code runs and throws `TypeError: title.toUppercase is not a function`.

It also stops you calling string methods on things that aren't strings. For example, calling `.trim()` on a `number` is an error: `Property 'trim' does not exist on type 'number'`.

## Exercises

```exercise ts title="Clean up page text"
// Text read from three elements on a checkout page:
const headingText = "\n   Order Summary   \n";
const totalText = "Total: $2,450.50";
const confirmationText = "Thanks! Your order ORD-88213 is confirmed.";

// 1. heading: headingText without the surrounding whitespace
const heading = headingText;

// 2. total: the NUMBER 2450.5, from totalText
const total = 0;

// 3. orderId: the text "ORD-88213", found with a regular expression and match()
const orderId = "";

// 4. summary: build exactly "Order ORD-88213: $2450.5" with a template literal
const summary = "";

console.log(heading, total, orderId, summary);
```

```checks
__book.test('heading is "Order Summary"', () => heading === "Order Summary");
__book.test("total is the number 2450.5", () => typeof total === "number" && total === 2450.5);
__book.test('orderId is "ORD-88213"', () => orderId === "ORD-88213");
__book.test("orderId uses match()", () => /\.match\(/.test(__book.source));
__book.test('summary is "Order ORD-88213: $2450.5"', () => summary === "Order ORD-88213: $2450.5");
__book.test("summary uses a template literal", () => /`[^`]*\$\{[^`]*`/.test(__book.source));
```

```solution
const headingText = "\n   Order Summary   \n";
const totalText = "Total: $2,450.50";
const confirmationText = "Thanks! Your order ORD-88213 is confirmed.";

const heading = headingText.trim();

const total = Number(totalText.replace("Total: $", "").replaceAll(",", ""));

// ORD- followed by one or more digits. match() returns null if nothing is found,
// so ?. and ?? give a safe fallback.
const orderId = confirmationText.match(/ORD-\d+/)?.[0] ?? "";

const summary = `Order ${orderId}: $${total}`;

console.log(heading, total, orderId, summary);
```

In the solution, `$${total}` is a literal `$` followed by `${total}`. Only `${` starts an insertion.

```exercise js title="Case-insensitive check"
// The test should pass whether the page says "Welcome", "WELCOME", or "welcome".
// Write isWelcome so it's true when pageText contains "welcome" in any case.
const pageText = "  WELCOME BACK, ANA  ";

const isWelcome = pageText.includes("welcome");

console.log(isWelcome);
```

```checks
__book.test("isWelcome is true", () => isWelcome === true);
__book.test("isWelcome ignores case (toLowerCase, toUpperCase, or a regex with i)", () => /toLowerCase\(\)|toUpperCase\(\)|\/[^/\n]+\/i/.test(__book.source));
```

```solution
const pageText = "  WELCOME BACK, ANA  ";

// Option 1: lowercase first
const isWelcome = pageText.toLowerCase().includes("welcome");

// Option 2: a regular expression with the i flag
// const isWelcome = /welcome/i.test(pageText);

console.log(isWelcome);
```

## Quiz

```quiz
[
  {
    "q": "What does this print?",
    "code": "let status = \"ok\";\nstatus.toUpperCase();\nconsole.log(status);",
    "options": ["`OK`", "`ok`", "`Ok`", "`undefined`"],
    "answer": 1,
    "why": "String methods return a new string and never change the original. The result wasn't stored, so `status` is still `\"ok\"`."
  },
  {
    "q": "What is `\"https://shop.test\".slice(0, 5)`?",
    "options": ["`\"https\"`", "`\"https:\"`", "`\"http\"`", "`\"shop.\"`"],
    "answer": 0,
    "why": "`slice(start, end)` includes `start` and stops before `end`: characters 0 to 4."
  },
  {
    "q": "Which line builds `\"/users/7/orders\"` from `const id = 7;`?",
    "options": ["`\"/users/${id}/orders\"`", "`'/users/${id}/orders'`", "`` `/users/${id}/orders` ``", "`/users/{id}/orders`"],
    "answer": 2,
    "why": "Only backtick strings (template literals) replace `${…}` with a value. In quotes, `${id}` is just text."
  },
  {
    "q": "What does `\"Error: Invalid email\".includes(\"invalid\")` return?",
    "options": ["`true`", "`false`", "`7`", "`-1`"],
    "answer": 1,
    "why": "`includes` is case-sensitive, so `\"invalid\"` doesn't match `\"Invalid\"`. Lowercase first, or use a regex with the `i` flag."
  },
  {
    "q": "What does `\"a,b,c\".replace(\",\", \";\")` return?",
    "options": ["`\"a;b;c\"`", "`\"a;b,c\"`", "`\"a,b;c\"`", "`[\"a\", \"b\", \"c\"]`"],
    "answer": 1,
    "why": "`replace` with a string only changes the first match. Use `replaceAll` to change every match."
  },
  {
    "q": "Which string does `/^ORD-\\d+$/` match?",
    "options": ["`\"ORD-\"`", "`\"ORD-12a\"`", "`\"ORD-4471\"`", "`\"My ORD-4471\"`"],
    "answer": 2,
    "why": "`^` and `$` anchor the start and end, and `\\d+` needs one or more digits with nothing after them."
  }
]
```

## Sources

Every example was run with Node.js v24.18.0, and the TypeScript messages were produced by TypeScript 7.0.2.

- MDN, *String*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) (escape sequences, immutability, `length` and UTF-16)
- MDN, *Template literals*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)
- MDN, *String.prototype.slice*, *split*, *replace*, *replaceAll*, *localeCompare*: linked from the String page above
- MDN, *Regular expressions* guide: [developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions)
- Playwright, *LocatorAssertions* (`toHaveText`, `toContainText`, whitespace normalisation, `ignoreCase`): [playwright.dev/docs/api/class-locatorassertions](https://playwright.dev/docs/api/class-locatorassertions)
- Playwright, *PageAssertions* (`toHaveURL`): [playwright.dev/docs/api/class-pageassertions](https://playwright.dev/docs/api/class-pageassertions)
