API responses, test data, lists of elements, configuration: almost everything a test handles is an **array** (an ordered list) or an **object** (a set of named values). This chapter covers both, plus the methods you'll use to search and check them.

**In this chapter you will learn:**

- how to create, read, and change arrays
- `map`, `filter`, `find`, `some`, `every`, and `reduce`, the methods that do most of the work in tests
- the sorting trap with numbers, and which methods change the original array
- how to read and update objects, including keys like `"content-type"`
- spread `...` and destructuring
- why copying an object isn't as simple as `=`, and how to copy safely
- working with JSON, and typing arrays and objects in TypeScript

## 5.1 Arrays

An array holds values in order. Write it with square brackets:

```js run
const browsers = ["chromium", "firefox", "webkit"];
console.log(browsers.length);
console.log(browsers[0]);     // positions (indexes) start at 0
console.log(browsers.at(-1)); // the last item
console.log(browsers[5]);     // no item there
```

```output
3
chromium
webkit
undefined
```

### Adding and removing items

```js run
const tags = ["smoke"];
tags.push("login", "checkout"); // add to the end
console.log(tags);

const last = tags.pop();        // remove from the end and return it
console.log(last, tags);
```

```output
[ 'smoke', 'login', 'checkout' ]
checkout [ 'smoke', 'login' ]
```

`unshift` and `shift` do the same at the **start** of the array.

### Searching an array

```js run
const browsers = ["chromium", "firefox", "webkit"];
console.log(browsers.includes("firefox"));
console.log(browsers.indexOf("webkit"));
console.log(browsers.indexOf("edge"));   // -1 means "not found"
console.log(browsers.join(", "));        // turn it into one string
```

```output
true
2
-1
chromium, firefox, webkit
```

## 5.2 The methods that do the work: map, filter, find, some, every

These methods take a small **function** that runs once for each item. You'll learn functions properly in Chapter 6. For now, read `(u) => u.name` as *"for each item `u`, give back `u.name`."*

Here's a typical API response body to work with:

```js run
const users = [
  { id: 1, name: "Ana", role: "admin", active: true },
  { id: 2, name: "Ben", role: "qa", active: false },
  { id: 3, name: "Chen", role: "qa", active: true },
];

console.log(users.map((u) => u.name));            // transform every item
console.log(users.filter((u) => u.active));       // keep matching items
console.log(users.find((u) => u.role === "qa"));  // first match
console.log(users.find((u) => u.role === "owner"));
```

```output
[ 'Ana', 'Ben', 'Chen' ]
[
  { id: 1, name: 'Ana', role: 'admin', active: true },
  { id: 3, name: 'Chen', role: 'qa', active: true }
]
{ id: 2, name: 'Ben', role: 'qa', active: false }
undefined
```

| Method | Returns | Use it to… |
|---|---|---|
| `map(fn)` | a new array, same length | pick or transform a field from every item |
| `filter(fn)` | a new array of the items where `fn` is truthy | keep only matching items |
| `find(fn)` | the **first** matching item, or `undefined` | look up one record |
| `findIndex(fn)` | the index of the first match, or `-1` | find a position |
| `some(fn)` | `true` if **at least one** item matches | "is there any admin?" |
| `every(fn)` | `true` if **all** items match | "does every user have a numeric id?" |

`some` and `every` are perfect for checking whole API responses:

```js run
const users = [
  { id: 1, name: "Ana", active: true },
  { id: 2, name: "Ben", active: false },
];
console.log(users.some((u) => u.active));
console.log(users.every((u) => u.active));
console.log(users.every((u) => typeof u.id === "number"));
```

```output
true
false
true
```

Methods that return arrays can be chained:

```js run
const users = [
  { name: "Ana", active: true },
  { name: "Ben", active: false },
  { name: "Chen", active: true },
];
const activeNames = users.filter((u) => u.active).map((u) => u.name);
console.log(activeNames);
```

```output
[ 'Ana', 'Chen' ]
```

### reduce: combine everything into one value

`reduce` walks the array and builds up a single result. The second argument (`0` here) is the starting value:

```js run
const lineTotals = [19.5, 5, 10.25];
const sum = lineTotals.reduce((total, n) => total + n, 0);
console.log(sum);
```

```output
34.75
```

## 5.3 Sorting, and methods that change the original

**Trap 1:** `sort()` with no arguments sorts items **as strings**, even numbers:

```js run
console.log([10, 9, 1, 100].sort());
console.log([10, 9, 1, 100].sort((a, b) => a - b)); // numeric, smallest first
```

```output
[ 1, 10, 100, 9 ]
[ 1, 9, 10, 100 ]
```

The function `(a, b) => a - b` tells `sort` how to compare two items: a negative result puts `a` first. Use `(a, b) => b - a` for largest first, and `(a, b) => a.localeCompare(b)` for text (Chapter 4).

**Trap 2:** some methods **change (mutate) the original array**. Others return a new one and leave the original alone:

| Changes the original | Returns a new array |
|---|---|
| `push`, `pop`, `shift`, `unshift` | `map`, `filter`, `slice`, `concat` |
| `sort`, `reverse`, `splice` | `toSorted`, `toReversed`, `toSpliced`, `with` |

```js run
const original = [3, 1, 2];
const sorted = original.toSorted(); // copy, then sort
console.log(original, sorted);

original.sort();                    // sorts in place
console.log(original);
```

```output
[ 3, 1, 2 ] [ 1, 2, 3 ]
[ 1, 2, 3 ]
```

Mutating shared test data is a common cause of tests that pass alone but fail when run together. Prefer the methods that return a new array. (`toSorted` and friends are newer: they need Node.js 20 or later. Current Playwright already requires Node.js 22.x, 24.x, or 26.x, so you'll have them.)

## 5.4 Objects

An object groups related values under names called **keys** (or *properties*):

```js run
const user = { id: 7, name: "Ana", active: true };
console.log(user.name);    // dot notation
console.log(user["name"]); // bracket notation, same result
```

```output
Ana
Ana
```

Use **brackets** when the key isn't a valid variable name (such as an HTTP header) or when the key is stored in a variable:

```js run
const headers = { "content-type": "application/json", "x-request-id": "abc123" };
console.log(headers["content-type"]);

const field = "x-request-id";
console.log(headers[field]);
```

```output
application/json
abc123
```

### Adding, changing, and removing keys

```js run
const user = { name: "Ana" };
user.email = "ana@test.io";  // add
user.name = "Ana Lopez";     // change
console.log(user);
delete user.email;           // remove
console.log(user);
console.log(Object.hasOwn(user, "name"), Object.hasOwn(user, "email"));
```

```output
{ name: 'Ana Lopez', email: 'ana@test.io' }
{ name: 'Ana Lopez' }
true false
```

`Object.hasOwn(obj, key)` checks whether a key exists. That's different from checking the value: a key can exist with the value `undefined` or `null` (Chapter 2).

### Keys, values, entries

```js run
const settings = { browser: "chromium", retries: 2, headless: true };
console.log(Object.keys(settings));
console.log(Object.values(settings));
console.log(Object.entries(settings));
```

```output
[ 'browser', 'retries', 'headless' ]
[ 'chromium', 2, true ]
[ [ 'browser', 'chromium' ], [ 'retries', 2 ], [ 'headless', true ] ]
```

### Nested data

Real API responses contain objects inside objects and arrays inside objects. Chain the accesses:

```js run
const order = {
  id: 1042,
  customer: { name: "Ana", address: { city: "Manila" } },
  items: [{ sku: "A1", qty: 2 }, { sku: "B7", qty: 1 }],
};
console.log(order.customer.address.city);
console.log(order.items[1].sku);
console.log(order.items.length);
```

```output
Manila
B7
2
```

When a level might be missing, use `?.` from Chapter 3: `order.customer?.address?.city`.

### Shorthand keys

If a variable has the same name as the key you want, you can write it once:

```js run
const id = 5;
const title = "Login works";
console.log({ id, title }); // same as { id: id, title: title }
```

```output
{ id: 5, title: 'Login works' }
```

## 5.5 Spread and destructuring

### Spread: copy and combine

`...` (*spread*) copies the items of an array, or the keys of an object, into a new one. For objects, later keys win, which makes it ideal for "defaults plus overrides":

```js run
const defaults = { browser: "chromium", retries: 0, headless: true };
const overrides = { retries: 2 };
const config = { ...defaults, ...overrides };
console.log(config);
console.log(defaults); // unchanged

const browsers = ["chromium", "firefox"];
console.log([...browsers, "webkit"]);
```

```output
{ browser: 'chromium', retries: 2, headless: true }
{ browser: 'chromium', retries: 0, headless: true }
[ 'chromium', 'firefox', 'webkit' ]
```

### Destructuring: unpack into variables

Destructuring pulls values out of an object or array into variables in one line. You'll see it in every Playwright test, in `async ({ page }) => { … }`.

```js run
const response = { status: 200, body: { name: "Ana" }, durationMs: 120 };

const { status, durationMs } = response;  // pick keys by name
console.log(status, durationMs);

const { body: data } = response;          // rename: body -> data
console.log(data);

const { retries = 3 } = response;         // default if missing
console.log(retries);

const [first, second, ...rest] = [10, 20, 30, 40]; // arrays: by position
console.log(first, second, rest);
```

```output
200 120
{ name: 'Ana' }
3
10 20 [ 30, 40 ]
```

`...rest` collects "everything else". It works for objects too: `const { id, ...others } = order;`.

## 5.6 References: why = doesn't copy

A variable holding an object holds a **reference** to it, like an address. Assigning it to another variable copies the address, not the object. Both variables then point at the **same** object:

```js run
const original = { id: 1 };
const alias = original;
alias.id = 99;
console.log(original.id);
```

```output
99
```

Spread makes a new object, but it's a **shallow** copy: nested objects and arrays are still shared:

```js run
const original = { id: 1, tags: ["smoke"] };
const copy = { ...original };
copy.id = 2;            // only changes the copy
copy.tags.push("login"); // changes the array both objects share!
console.log(original);
```

```output
{ id: 1, tags: [ 'smoke', 'login' ] }
```

For a **deep** copy (every level copied), use `structuredClone`:

```js run
const original = { id: 1, tags: ["smoke"] };
const copy = structuredClone(original);
copy.tags.push("login");
console.log(original.tags, copy.tags);
```

```output
[ 'smoke' ] [ 'smoke', 'login' ]
```

> **Testing tip:** if several tests share one test-data object and one test changes it, later tests see the change. Give each test its own copy (`structuredClone(baseUser)`) or build fresh data in each test.

## 5.7 JSON

**JSON** (JavaScript Object Notation) is the text format most APIs use. It looks like JavaScript objects, with stricter rules: keys must be in double quotes, strings must use double quotes, and there's no `undefined`, no functions, and no trailing commas.

- `JSON.parse(text)` turns JSON text into a JavaScript value.
- `JSON.stringify(value)` turns a value into JSON text. Pass `null, 2` to indent it.

```js run
const bodyText = '{"id":1,"name":"Ana","roles":["qa"]}';
const body = JSON.parse(bodyText);
console.log(body.roles[0]);
console.log(JSON.stringify({ id: 1, ok: true }));
console.log(JSON.stringify({ id: 1, tags: ["a"] }, null, 2));
```

```output
qa
{"id":1,"ok":true}
{
  "id": 1,
  "tags": [
    "a"
  ]
}
```

Invalid JSON throws a `SyntaxError`. For example, `JSON.parse("{id:1}")` fails because the key isn't quoted, and `JSON.parse("")` fails with `Unexpected end of JSON input`. When an API returns an error page instead of JSON, this is the error you'll see. In Playwright API tests, `await response.json()` does the parsing for you.

## 5.8 Arrays and objects in TypeScript

### Array types

Write the item type followed by `[]`. TypeScript then checks everything you put in:

```ts run
const ids: number[] = [1, 2, 3];
ids.push("4");
console.log(ids);
```

TypeScript reports `Argument of type 'string' is not assignable to parameter of type 'number'.` You can also write `Array<number>`, which means the same thing.

### Object types

Describe the shape of an object by listing each key and its type. A `?` marks an **optional** key, and `readonly` stops a key from being reassigned:

```ts run
const user: { id: number; name: string; email?: string } = { id: 1, name: "Ana" };
const config: { readonly baseUrl: string } = { baseUrl: "https://shop.test" };

user.phone = "555-0100";  // not part of the type
config.baseUrl = "other"; // readonly
console.log(user, config);
```

TypeScript reports that `Property 'phone' does not exist` on that type, and `Cannot assign to 'baseUrl' because it is a read-only property.` Forgetting a required key is also an error, for example `Property 'name' is missing in type '{ id: number; }'`.

Writing the same shape over and over gets repetitive. Chapter 11 shows how to name it once with `interface` or `type`.

### find can return undefined

`find` returns `undefined` when nothing matches, and TypeScript makes you handle that:

```ts run
const users = [{ id: 1, name: "Ana" }, { id: 2, name: "Ben" }];
const ben = users.find((u) => u.name === "Ben");

console.log(ben.id);  // TypeScript: 'ben' is possibly 'undefined'.
console.log(ben?.id); // OK: undefined if Ben isn't found
```

This catches a real class of test bugs: assuming a record exists when it might not.

## Exercises

```exercise ts title="Check an API response"
// A response body from GET /api/users
const body = {
  total: 4,
  users: [
    { id: 101, email: "ana@test.io", role: "admin", active: true },
    { id: 102, email: "ben@test.io", role: "qa", active: false },
    { id: 103, email: "chen@test.io", role: "qa", active: true },
    { id: 104, email: "dee@test.io", role: "viewer", active: true },
  ],
};

// 1. emails: an array of every user's email, in the same order (use map)
const emails: string[] = [];

// 2. activeQaCount: how many users have role "qa" AND are active (use filter)
const activeQaCount = -1;

// 3. adminEmail: the email of the user with role "admin" (use find).
//    If there's no admin, it should be undefined.
const adminEmail: string | undefined = "";

// 4. allIdsAreNumbers: true if every id is a number (use every)
const allIdsAreNumbers = false;

// 5. totalMatches: true if body.total equals the number of users in the array
const totalMatches = false;

console.log(emails, activeQaCount, adminEmail, allIdsAreNumbers, totalMatches);
```

```checks
__book.test("emails lists all 4 emails in order", () => JSON.stringify(emails) === JSON.stringify(["ana@test.io", "ben@test.io", "chen@test.io", "dee@test.io"]));
__book.test("emails uses map", () => /\.map\(/.test(__book.source));
__book.test("activeQaCount is 1", () => activeQaCount === 1);
__book.test("activeQaCount uses filter", () => /\.filter\(/.test(__book.source));
__book.test('adminEmail is "ana@test.io"', () => adminEmail === "ana@test.io");
__book.test("adminEmail uses find", () => /\.find\(/.test(__book.source));
__book.test("allIdsAreNumbers is true", () => allIdsAreNumbers === true);
__book.test("allIdsAreNumbers uses every", () => /\.every\(/.test(__book.source));
__book.test("totalMatches is true", () => totalMatches === true);
__book.test("totalMatches compares with the array's length", () => /users\.length/.test(__book.source));
```

```solution
const body = {
  total: 4,
  users: [
    { id: 101, email: "ana@test.io", role: "admin", active: true },
    { id: 102, email: "ben@test.io", role: "qa", active: false },
    { id: 103, email: "chen@test.io", role: "qa", active: true },
    { id: 104, email: "dee@test.io", role: "viewer", active: true },
  ],
};

const emails: string[] = body.users.map((u) => u.email);

const activeQaCount = body.users.filter((u) => u.role === "qa" && u.active).length;

// find returns undefined if there's no match; ?. keeps that safe
const adminEmail: string | undefined = body.users.find((u) => u.role === "admin")?.email;

const allIdsAreNumbers = body.users.every((u) => typeof u.id === "number");

const totalMatches = body.total === body.users.length;

console.log(emails, activeQaCount, adminEmail, allIdsAreNumbers, totalMatches);
```

```exercise js title="Build test data without changing the base"
const baseUser = { name: "Test User", role: "qa", permissions: ["read"] };

// 1. Create adminUser: a copy of baseUser with role "admin".
//    Don't change baseUser.
const adminUser = baseUser;
adminUser.role = "admin";

// 2. Create editorUser: a DEEP copy of baseUser whose permissions
//    also include "write". baseUser.permissions must stay ["read"].
const editorUser = baseUser;
editorUser.permissions.push("write");

console.log(baseUser, adminUser, editorUser);
```

```checks
__book.test('baseUser.role is still "qa"', () => baseUser.role === "qa");
__book.test('adminUser.role is "admin"', () => adminUser.role === "admin");
__book.test("adminUser is a different object from baseUser", () => adminUser !== baseUser);
__book.test('editorUser.permissions is ["read", "write"]', () => JSON.stringify(editorUser.permissions) === '["read","write"]');
__book.test('baseUser.permissions is still ["read"]', () => JSON.stringify(baseUser.permissions) === '["read"]');
```

```solution
const baseUser = { name: "Test User", role: "qa", permissions: ["read"] };

// Spread makes a new object; role is overridden in the copy only
const adminUser = { ...baseUser, role: "admin" };

// permissions is an array inside the object, so a shallow copy would share it.
// structuredClone copies every level.
const editorUser = structuredClone(baseUser);
editorUser.permissions.push("write");

console.log(baseUser, adminUser, editorUser);
```

## Quiz

```quiz
[
  {
    "q": "What does this print?",
    "code": "console.log([10, 9, 1].sort());",
    "options": ["`[ 1, 9, 10 ]`", "`[ 1, 10, 9 ]`", "`[ 10, 9, 1 ]`", "`[ 9, 10, 1 ]`"],
    "answer": 1,
    "why": "Without a compare function, `sort` compares items as strings, and `\"10\"` comes before `\"9\"`. Use `sort((a, b) => a - b)` for numbers."
  },
  {
    "q": "You need the first user whose role is `\"admin\"`. Which method fits?",
    "options": ["`filter`", "`map`", "`find`", "`some`"],
    "answer": 2,
    "why": "`find` returns the first matching item (or `undefined`). `filter` returns an array of all matches, and `some` returns only `true` or `false`."
  },
  {
    "q": "What does this print?",
    "code": "const a = { count: 1 };\nconst b = a;\nb.count = 5;\nconsole.log(a.count);",
    "options": ["`1`", "`5`", "`undefined`", "It throws an error"],
    "answer": 1,
    "why": "`b = a` copies the reference, so both names point at the same object. Changing it through `b` is visible through `a`."
  },
  {
    "q": "How do you read the header `content-type` from `const headers = { \"content-type\": \"text/html\" };`?",
    "options": ["`headers.content-type`", "`headers[\"content-type\"]`", "`headers.contentType`", "`headers(content-type)`"],
    "answer": 1,
    "why": "A key with a hyphen isn't a valid name for dot notation (`headers.content - type` would be a subtraction). Use brackets with a string."
  },
  {
    "q": "What is the value of `config.retries`?",
    "code": "const defaults = { retries: 0, headless: true };\nconst config = { ...defaults, retries: 2 };",
    "options": ["`0`", "`2`", "`undefined`", "`[0, 2]`"],
    "answer": 1,
    "why": "With object spread, later keys override earlier ones. `defaults` itself is unchanged."
  },
  {
    "q": "Which statement about `JSON.parse` is true?",
    "options": [
      "It turns a JavaScript object into JSON text",
      "It accepts keys without quotes, like `{id:1}`",
      "It turns JSON text into a JavaScript value, and throws `SyntaxError` on invalid JSON",
      "It returns `undefined` for invalid JSON"
    ],
    "answer": 2,
    "why": "`JSON.parse` reads JSON text. Invalid JSON, such as unquoted keys or an empty string, throws a `SyntaxError`. `JSON.stringify` goes the other way."
  }
]
```

## Sources

Every example was run with Node.js v24.18.0, and the TypeScript messages were produced by TypeScript 7.0.2.

- MDN, *Array*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) (copying vs mutating methods, `sort` default order, `toSorted`)
- MDN, *Working with objects*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects)
- MDN, *Object.hasOwn*, *Object.keys*, *Object.entries*: linked from [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
- MDN, *Spread syntax* and *Destructuring*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax), [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring)
- MDN, *structuredClone*: [developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)
- MDN, *JSON*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)
- TypeScript Handbook, *Everyday Types* (arrays, object types, optional properties): [typescriptlang.org/docs/handbook/2/everyday-types.html](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- TypeScript Handbook, *Object Types* (`readonly`): [typescriptlang.org/docs/handbook/2/objects.html](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- Playwright, *System requirements* (Node.js versions): [playwright.dev/docs/intro#system-requirements](https://playwright.dev/docs/intro#system-requirements)
