Tests check dates all the time: *was the order created today? does the subscription expire in 30 days? is the date on the receipt formatted correctly?* Tests also need to collect and count things: unique tags, how many results per status, which IDs appeared twice. This chapter covers JavaScript's `Date`, formatting with `Intl`, and the two collection types built for those jobs, `Map` and `Set`.

**In this chapter you will learn:**

- how a `Date` stores time, and why months start at 0
- creating dates safely, and the difference between UTC and local time
- comparing dates and doing date arithmetic
- formatting dates and money with `Intl`, including a hidden-space trap
- what `Temporal` is, and where it's available
- `Map` for key-value lookups, and `Set` for unique values

> **About time zones in this chapter:** every example uses UTC or an explicit time zone, so it prints the same output on any computer. Every example was run with Node.js v24.18.0 in two different time zones, and in Chromium, Firefox, and WebKit, with identical output. The places where engines differ are called out in the text.

## 13.1 How a Date stores time

A `Date` holds **one number**: the milliseconds since 1 January 1970, 00:00 UTC. Everything else (the year, the hour, the formatted text) is calculated from that number.

```js run
const d = new Date(Date.UTC(2026, 2, 1, 9, 30)); // 1 March 2026, 09:30 UTC
console.log(d.toISOString());
console.log(d.getTime());
console.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCDay());
```

```output
2026-03-01T09:30:00.000Z
1772357400000
2026 2 1 0
```

Two traps are visible already:

- **Months start at 0.** `2` means **March**. January is `0` and December is `11`. Days of the month start at 1 as usual.
- **`getUTCDay()` is the day of the week** (0 = Sunday), not the day of the month. The day of the month is `getUTCDate()`.

The `Z` at the end of the ISO string means UTC. ISO 8601 strings like `2026-03-01T09:30:00.000Z` are the safest format for storing dates and sending them in APIs.

## 13.2 Creating dates, and UTC vs local time

Every `Date` method comes in two versions: **UTC** (`getUTCHours`, `setUTCDate`) and **local**, meaning the time zone of the computer running the code (`getHours`, `setDate`). The same moment can be a different date in different places:

```js
// The same moment, read in local time: depends on where the code runs
const moment = new Date("2026-03-01T23:30:00Z");
console.log(moment.getDate());  // 1 in London, 2 in Manila (UTC+8), 1 in New York
```

That's the most common source of date bugs in tests: a test passes on your laptop and fails on a CI machine set to UTC. Two rules avoid most of them:

1. **Use UTC methods and ISO strings with `Z`** in test logic.
2. **Name the time zone** whenever you format a date for display (section 13.4).

### Parsing strings

```js run
console.log(new Date("2026-03-01").toISOString());            // date only: treated as UTC
console.log(new Date("2026-03-01T10:00:00Z").toISOString());  // with Z: UTC
```

```output
2026-03-01T00:00:00.000Z
2026-03-01T10:00:00.000Z
```

MDN documents the rule: date-only strings like `"2026-03-01"` are read as **UTC**, but date-**time** strings **without** a `Z` or offset, like `"2026-03-01T10:00"`, are read as **local** time. Always include `Z` or an offset such as `+08:00`.

### Invalid and impossible dates

A string JavaScript can't parse gives an **Invalid Date**. It doesn't throw:

```js run
const bad = new Date("not a date");
console.log(bad.getTime(), Number.isNaN(bad.getTime()));
console.log(String(bad));
```

```output
NaN true
Invalid Date
```

Check with `Number.isNaN(date.getTime())` before using a date read from a page or an API.

A date that *looks* valid but doesn't exist, like 30 February, is **handled differently by different engines**. Node.js, Chrome, and Firefox silently move it to the next month. Safari's engine (WebKit) calls it an Invalid Date instead:

```js
// Node.js, Chromium, Firefox:
new Date("2026-02-30").toISOString();   // "2026-03-02T00:00:00.000Z"
// WebKit (Safari):
new Date("2026-02-30").toISOString();   // RangeError: Invalid Date
```

We ran this in all four to be sure. So a test can't rely on `Number.isNaN(date.getTime())` alone to spot an impossible date: in most browsers it passes. A check that works the same everywhere is a **round trip**: build the date, turn it back into text, and see whether you get what you started with. A date that was moved won't match:

```js run
function isRealDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(isoDate);
}

console.log(isRealDate("2026-02-28"), isRealDate("2026-02-30"), isRealDate("soon"));
```

```output
true false false
```

That makes date pickers and "date of birth" fields good places to test with impossible dates such as 30 February, or `2026-13-01`: the application may accept them, move them, or reject them.

## 13.3 Comparing dates and date arithmetic

**Compare dates with `getTime()`, not `===`.** Two `Date` objects are different objects (Chapter 3), even when they hold the same moment:

```js run
const a = new Date("2026-03-01T00:00:00Z");
const b = new Date("2026-03-01T00:00:00Z");
console.log(a === b);                     // two different objects
console.log(a.getTime() === b.getTime()); // same moment
console.log(a < new Date("2026-03-15T00:00:00Z")); // < and > work
```

```output
false
true
true
```

`<` and `>` work because they convert both dates to numbers. In Playwright, `expect(dateA).toEqual(dateB)` compares dates by value.

### Differences

Subtracting two dates gives the difference in **milliseconds**:

```js run
const ordered = new Date("2026-03-01T00:00:00Z");
const shipped = new Date("2026-03-15T12:00:00Z");
const ms = shipped - ordered;
const DAY_MS = 24 * 60 * 60 * 1000;
console.log(ms, ms / DAY_MS);
```

```output
1252800000 14.5
```

### Adding days or months

Copy the date first, so you don't change the original (`Date` objects are mutable), then use the `set…` methods:

```js run
const start = new Date("2026-03-01T00:00:00Z");
const due = new Date(start);                // copy
due.setUTCDate(due.getUTCDate() + 30);      // 30 days later
console.log(start.toISOString(), due.toISOString());

const jan31 = new Date(Date.UTC(2026, 0, 31));
jan31.setUTCMonth(1);                       // "31 February" rolls over
console.log(jan31.toISOString());
```

```output
2026-03-01T00:00:00.000Z 2026-03-31T00:00:00.000Z
2026-03-03T00:00:00.000Z
```

Adding a month to 31 January gives **3 March** in 2026, because there's no 31 February. If your application has a "renews in one month" feature, end-of-month dates are exactly the edge cases to test.

> **Testing tip:** for "today" or "now", don't compare against your own `new Date()` to the millisecond. The test and the application read the clock at slightly different times. Compare dates only (`toISOString().slice(0, 10)`), allow a tolerance, or, in Playwright, control the page's clock with `page.clock` (see Sources).

## 13.4 Formatting with Intl

`Intl.DateTimeFormat` formats dates for people, in a given language (*locale*) and **time zone**:

```js run
const d = new Date(Date.UTC(2026, 2, 1, 20, 30)); // 1 March, 20:30 UTC

console.log(new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(d));
console.log(new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(d));
console.log(new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(d));
```

```output
Mar 1, 2026
1 March 2026
Mar 2, 2026
```

The same moment is **1 March** in UTC but **2 March** in Manila (UTC+8), where it's already 04:30. If you leave out `timeZone`, the computer's own time zone is used, and the output changes from machine to machine. (`date.toLocaleDateString("en-US", { timeZone: "UTC" })` is a shortcut for the same thing.)

> **Formatting differs slightly between browsers.** The text comes from each browser's locale data, so punctuation and wording can differ. For a date **with a time** (`dateStyle: "medium", timeStyle: "short"`), Node.js 24, Chromium, and Firefox printed `Mar 1, 2026, 5:30 PM`, but Playwright's WebKit printed `Mar 1, 2026 at 5:30 PM`. When a test compares a formatted date, check the parts that matter (the day, the month, the year) with a regular expression (Chapter 4), instead of one long exact string, if the test runs in more than one browser.

`Intl.NumberFormat` does the same for numbers and money:

```js run
console.log(new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(1299.5));
console.log(new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(1299.5));
```

```output
$1,299.50
1.299,50 €
```

### The hidden-space trap

The German result **looks** like it contains a normal space before `€`, but it's a **non-breaking space** (character code U+00A0). Comparing it with a string you typed fails:

```js run
const price = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(1299.5);
console.log(price === "1.299,50 €");           // typed with a normal space
console.log(price.charCodeAt(8).toString(16)); // the "space" is a0
console.log(price.replace(/\s/g, " ") === "1.299,50 €");
```

```output
false
a0
true
```

`\s` in a regular expression matches non-breaking spaces too, so replacing `\s` with a normal space makes the comparison work. This also happens with text on real pages. Playwright's `toHaveText` with a **string** normalises whitespace for you (Chapter 19), which is one more reason to use it.

## 13.5 Temporal: the newer date API

`Temporal` is a newer, built-in date and time API designed to fix `Date`'s problems. It has separate types for "a date", "a time", and "a moment in a time zone", months start at 1, and values never change in place. According to MDN's compatibility data, it's available in Chrome 144+, Firefox 139+, Safari 27.3+, and **Node.js 26+**.

On Node.js 24, `typeof Temporal` is `"undefined"`, and Playwright tests run in Node.js (Chapter 1). So in test code, `Date` and `Intl` are still what you'll use for now, unless your team runs Node.js 26 or uses a polyfill (a library that adds a missing feature). Expect to see Temporal in application code over the next few years.

## 13.6 Map: key-value lookups

A `Map` stores key-value pairs, like an object, but it's designed for **lookups that change**:

```js run
const counts = new Map();
counts.set("passed", 3);
counts.set("failed", 1);

console.log(counts.get("passed"), counts.get("skipped")); // missing key: undefined
console.log(counts.has("failed"), counts.size);
console.log(counts);
```

```output
3 undefined
true 2
Map(2) { 'passed' => 3, 'failed' => 1 }
```

### Counting with a Map

```js run
const results = ["passed", "failed", "passed", "skipped", "passed"];
const counts = new Map();
for (const status of results) {
  counts.set(status, (counts.get(status) ?? 0) + 1);
}
console.log(counts);

for (const [status, n] of counts) {
  console.log(`${status}: ${n}`);
}
```

```output
Map(3) { 'passed' => 3, 'failed' => 1, 'skipped' => 1 }
passed: 3
failed: 1
skipped: 1
```

`?? 0` (Chapter 3) gives a starting count of 0 for a key that isn't there yet.

### Map or object?

| | Object `{}` | `Map` |
|---|---|---|
| Keys | strings (and symbols) | **any** value, including objects |
| Order | mostly insertion order, but integer-like keys come first | always insertion order |
| Size | `Object.keys(obj).length` | `map.size` |
| JSON | `JSON.stringify` works | becomes `{}`, so convert first |
| Best for | fixed records: a user, a config, an API body | lookups and counts built while the code runs |

The JSON row is a real trap:

```js run
const m = new Map([["a", 1]]);
console.log(JSON.stringify({ m }));
console.log(JSON.stringify(Object.fromEntries(m)));
```

```output
{"m":{}}
{"a":1}
```

`Object.fromEntries(map)` turns a Map into a plain object, and `new Map(Object.entries(obj))` goes the other way.

## 13.7 Set: unique values

A `Set` holds each value **at most once**:

```js run
const tags = new Set(["smoke", "login", "smoke"]);
tags.add("login");                       // already there: no change
console.log(tags, tags.size, tags.has("smoke"));

const ids = [3, 1, 3, 2, 1];
console.log([...new Set(ids)]);          // remove duplicates, keep first-seen order
```

```output
Set(2) { 'smoke', 'login' } 2 true
[ 3, 1, 2 ]
```

A common check in tests: are there duplicate IDs in a list?

```js run
const ids = [101, 102, 103, 102];
const hasDuplicates = new Set(ids).size !== ids.length;
console.log(hasDuplicates);
```

```output
true
```

### Set operations

Newer JavaScript (Node.js 22+, and current browsers) adds methods to combine sets:

```js run
const expected = new Set(["chromium", "firefox", "webkit"]);
const actual = new Set(["chromium", "webkit", "edge"]);

console.log(expected.difference(actual));   // expected but missing
console.log(actual.difference(expected));   // present but not expected
console.log(expected.intersection(actual)); // in both
console.log(expected.union(actual).size);
```

```output
Set(1) { 'firefox' }
Set(1) { 'edge' }
Set(2) { 'chromium', 'webkit' }
4
```

`difference` in both directions is a clear way to report exactly which items are missing and which are unexpected.

> **Sets compare objects by identity.** `new Set([{ id: 1 }, { id: 1 }]).size` is `2`: two separate objects (Chapter 3). To find duplicate records, put their IDs (or another primitive key) in the Set.

### In TypeScript

`Map` and `Set` are generic (Chapter 12): `new Map<string, number>()` and `new Set<string>()`. TypeScript usually infers the types from the initial values. `map.get(key)` returns `V | undefined`, because the key might be missing.

## Exercises

```exercise ts title="Check dates from an API"
const order = {
  createdAt: "2026-03-01T23:30:00Z",
  expiresAt: "2026-03-31T23:30:00Z",
};

// 1. daysBetween(fromIso, toIso): the number of days from one ISO date to
//    another (can be a fraction). daysBetween(order.createdAt, order.expiresAt) is 30.
function daysBetween(fromIso: string, toIso: string): number {
  return 0;
}

// 2. formatUtcDate(iso): format a date as "Mar 1, 2026" (en-US, medium style),
//    ALWAYS in UTC, whatever computer runs the code.
function formatUtcDate(iso: string): string {
  return "";
}

// 3. isValidIso(text): true if text parses to a real date, false for things
//    like "soon" or "".
function isValidIso(text: string): boolean {
  return true;
}

console.log(daysBetween(order.createdAt, order.expiresAt));
console.log(formatUtcDate(order.createdAt));
console.log(isValidIso(order.createdAt), isValidIso("soon"));
```

```checks
__book.test("daysBetween gives 30 for the order", () => daysBetween(order.createdAt, order.expiresAt) === 30);
__book.test("daysBetween handles half days (12 hours = 0.5)", () => daysBetween("2026-03-01T00:00:00Z", "2026-03-01T12:00:00Z") === 0.5);
__book.test('formatUtcDate(order.createdAt) is "Mar 1, 2026" (not Mar 2)', () => formatUtcDate(order.createdAt) === "Mar 1, 2026");
__book.test("formatUtcDate names the UTC time zone", () => /timeZone\s*:\s*["']UTC["']/.test(__book.source));
__book.test('isValidIso is false for "soon" and ""', () => isValidIso("soon") === false && isValidIso("") === false);
__book.test("isValidIso is true for a real ISO date", () => isValidIso("2026-03-01T00:00:00Z") === true);
```

```solution
const order = {
  createdAt: "2026-03-01T23:30:00Z",
  expiresAt: "2026-03-31T23:30:00Z",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / DAY_MS;
}

function formatUtcDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso));
}

function isValidIso(text: string): boolean {
  return !Number.isNaN(new Date(text).getTime());
}

console.log(daysBetween(order.createdAt, order.expiresAt));
console.log(formatUtcDate(order.createdAt));
console.log(isValidIso(order.createdAt), isValidIso("soon"));
```

In TypeScript, subtracting two `Date` objects directly (`b - a`) is an error, because TypeScript only allows arithmetic on numbers. Call `.getTime()` on both, as the solution does.

```exercise js title="Compare expected and actual tags"
const expectedTags = ["smoke", "login", "checkout", "search"];
const actualTags = ["login", "smoke", "smoke", "payments", "search"];

// 1. duplicates: an array of tags that appear MORE THAN ONCE in actualTags
//    (each listed once). Here: ["smoke"]
const duplicates = [];

// 2. missing: tags in expectedTags but not in actualTags. Here: ["checkout"]
const missing = [];

// 3. unexpected: tags in actualTags but not in expectedTags. Here: ["payments"]
const unexpected = [];

// Use a Map or Set for at least one of these.
console.log(duplicates, missing, unexpected);
```

```checks
__book.test('duplicates is ["smoke"]', () => JSON.stringify(duplicates) === '["smoke"]');
__book.test('missing is ["checkout"]', () => JSON.stringify(missing) === '["checkout"]');
__book.test('unexpected is ["payments"]', () => JSON.stringify(unexpected) === '["payments"]');
__book.test("uses a Map or a Set", () => /new\s+(Map|Set)\b/.test(__book.source));
```

```solution
const expectedTags = ["smoke", "login", "checkout", "search"];
const actualTags = ["login", "smoke", "smoke", "payments", "search"];

// Count each tag with a Map, then keep the ones seen more than once
const counts = new Map();
for (const tag of actualTags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
const duplicates = [...counts].filter(([, n]) => n > 1).map(([tag]) => tag);

// Set differences in both directions
const expected = new Set(expectedTags);
const actual = new Set(actualTags);
const missing = [...expected.difference(actual)];
const unexpected = [...actual.difference(expected)];

console.log(duplicates, missing, unexpected);
```

`[, n]` in the solution skips the first item when destructuring (Chapter 5), so only the count is named.

## Quiz

```quiz
[
  {
    "q": "What does `new Date(Date.UTC(2026, 0, 15)).toISOString()` return?",
    "options": ["`2026-00-15T00:00:00.000Z`", "`2026-01-15T00:00:00.000Z`", "`2026-02-15T00:00:00.000Z`", "It throws an error"],
    "answer": 1,
    "why": "Months start at 0, so `0` is January. The ISO string uses normal month numbers."
  },
  {
    "q": "Two `Date` objects hold the same moment. What does `a === b` return?",
    "options": ["`true`", "`false`", "`NaN`", "It depends on the time zone"],
    "answer": 1,
    "why": "They're two separate objects. Compare `a.getTime() === b.getTime()`."
  },
  {
    "q": "A test formats a date with `Intl.DateTimeFormat(\"en-US\", { dateStyle: \"medium\" })`. It passes locally and fails in CI. What's the most likely cause?",
    "options": [
      "CI doesn't support Intl",
      "No `timeZone` was given, so the machine's own time zone was used, and the date differs",
      "`dateStyle` is deprecated",
      "CI uses a different locale for all output"
    ],
    "answer": 1,
    "why": "The same moment can fall on a different date in different time zones. Pass `timeZone` explicitly."
  },
  {
    "q": "Why isn't `Number.isNaN(new Date(text).getTime())` enough to prove that `text` is a real date like `\"2026-02-30\"`?",
    "options": [
      "`getTime` is slow",
      "Node.js, Chrome, and Firefox accept impossible dates and move them to the next month, while Safari rejects them, so the result depends on the browser",
      "`NaN` can never be detected",
      "Dates can't be compared"
    ],
    "answer": 1,
    "why": "Use a round trip instead: turn the date back into an ISO string and check that it still starts with the text you began with."
  },
  {
    "q": "How do you check an array of IDs for duplicates?",
    "options": [
      "`ids.length === 0`",
      "`new Set(ids).size !== ids.length`",
      "`ids.includes(ids)`",
      "`new Map(ids).size`"
    ],
    "answer": 1,
    "why": "A Set keeps each value once, so if it's smaller than the array, something appeared twice."
  },
  {
    "q": "What does `JSON.stringify(new Map([[\"a\", 1]]))` produce?",
    "options": ["`{\"a\":1}`", "`[[\"a\",1]]`", "`{}`", "It throws an error"],
    "answer": 2,
    "why": "Maps have no enumerable own properties, so they serialise as `{}`. Convert with `Object.fromEntries(map)` first."
  }
]
```

## Sources

Every example was run with Node.js v24.18.0 (in two different time zones) and in Chromium, Firefox, and WebKit through Playwright 1.65.1, with identical output. The differences described in sections 13.2 and 13.4 were observed in those runs. TypeScript messages come from TypeScript 7.0.2.

- MDN, *Date* (epoch milliseconds, months from 0, UTC vs local methods, invalid dates): [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- MDN, *Date.parse* (date-only forms are UTC, date-time forms without an offset are local): [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse)
- MDN, *Intl.DateTimeFormat* and *Intl.NumberFormat*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat), [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- MDN, *Temporal*, and its browser compatibility data (Chrome 144, Firefox 139, Safari 27.3, Node.js 26): [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal)
- MDN, *Map* (Map vs Object) and *Set* (including `union`, `intersection`, `difference`): [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map), [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
- Playwright, *Clock* (controlling time in the page): [playwright.dev/docs/clock](https://playwright.dev/docs/clock)
