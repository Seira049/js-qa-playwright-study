Before you write a single test, it helps to know two things: **where your code actually runs**, and **how to read what it prints**, including error messages. This chapter covers both, and gets you comfortable with the playground you'll use for the rest of the book.

**In this chapter you will learn:**

- what JavaScript and TypeScript are, and how they relate
- the two places your code runs (the browser and Node.js), and why that matters in Playwright
- how to print values with `console.log` and its relatives
- how to read an error message
- how to run `.js` and `.ts` files on your own computer, and how to check types

## 1.1 JavaScript and TypeScript

**JavaScript** is a programming language. It started as the language of web pages, and today it also runs outside the browser.

**TypeScript** is JavaScript with *type annotations* added. A type annotation describes what kind of value something holds. In the example below, `: number` says "this is a number". A tool called the TypeScript compiler (`tsc`) reads those annotations and warns you about mistakes **before** the code runs.

```ts run
const testsPassed: number = 5; // ": number" is a type annotation
console.log(testsPassed);
```

```output
5
```

Before TypeScript code runs, the type annotations are removed. What's left is plain JavaScript:

```js run
const testsPassed = 5;
console.log(testsPassed);
```

```output
5
```

The TypeScript Handbook puts it this way: *"Type annotations never change the runtime behavior of your program."* TypeScript helps you find mistakes earlier. It does not make your code run differently.

> **Why this matters for QA:** Playwright tests are written in JavaScript or TypeScript. When you create a project with `npm init playwright@latest`, the installer asks which one you want, and TypeScript is the default. Everything you learn about JavaScript applies to both, because TypeScript *is* JavaScript plus types.

## 1.2 Two places your code can run

JavaScript needs a program to run it. You'll meet two of them.

**1. A web browser.** Every browser (Chrome, Firefox, Safari, Edge) can run JavaScript. The scripts on a web page run inside the browser. You can type JavaScript directly into the browser's developer tools: in Chrome, press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>J</kbd> on Windows or Linux, or <kbd>Cmd</kbd> + <kbd>Option</kbd> + <kbd>J</kbd> on a Mac, to open the **Console**.

**2. Node.js.** Node.js runs JavaScript on your computer, outside any browser. From the Node.js website: *"Node.js runs the V8 JavaScript engine, the core of Google Chrome, outside of the browser."* Node.js is what runs build tools, servers, and test runners.

**Playwright uses both at once.** The Playwright test runner is a Node.js program. Your test code runs in Node.js, and Playwright starts and controls a real browser. The web page you're testing runs its own JavaScript inside that browser. The Playwright docs are clear that these are separate: *"Playwright scripts run in your Playwright environment. Your page scripts run in the browser page environment. Those environments don't intersect."*

```ts title="Where each line runs (read-only example)"
// This runs in Node.js, as part of your test:
const title = await page.title();

// The function passed to page.evaluate() is sent to the browser and runs inside the page:
const href = await page.evaluate(() => document.location.href);
```

You don't need to understand `await` or `page.evaluate` yet. You'll learn them later. For now, remember that **your test and the page under test are two different programs**. A variable in your test doesn't exist inside the page, and the page's `document` doesn't exist in your test.

> **About this book's playground:** examples here run in **your browser**, inside a *Web Worker* (a background thread with no web page attached). That's ideal for learning the language. It also means browser-page features like `document`, and Node.js features like reading files, aren't available in the playground.

## 1.3 Printing values with console.log

`console.log()` prints whatever you put between the parentheses. It's the quickest way to see what your code is doing, and you'll use it constantly while debugging tests.

```js run
console.log("Hello, QA!");
console.log(200);
console.log(true);
```

```output
Hello, QA!
200
true
```

Text must be in quotes (`"Hello, QA!"`). Text in quotes is called a **string**. Numbers and `true`/`false` don't need quotes.

### Printing several values at once

Separate values with commas. `console.log` prints them on one line with a space between each.

```js run
console.log("Status:", 200, true);
console.log("Passed:", 5, "Failed:", 1);
```

```output
Status: 200 true
Passed: 5 Failed: 1
```

### Printing objects and arrays

You can print whole groups of data, too. You'll learn about objects `{ }` and arrays `[ ]` in Chapter 5. For now, notice how they're displayed:

```js run
console.log({ id: 1, tags: ["smoke", "login"] });
```

```output
{ id: 1, tags: [ 'smoke', 'login' ] }
```

Node.js shows strings *inside* objects and arrays with single quotes (`'smoke'`), even if you wrote them with double quotes. That's only how it displays them. The values are the same.

### Errors, warnings, and tables

`console` has more methods than `log`. These three are the most useful in testing:

```js run
console.error("Login failed: wrong password");
console.warn("Retrying in 2 seconds");
console.table([
  { user: "ana", role: "qa" },
  { user: "ben", role: "dev" },
]);
```

```output
Login failed: wrong password
Retrying in 2 seconds
┌─────────┬───────┬───────┐
│ (index) │ user  │ role  │
├─────────┼───────┼───────┤
│ 0       │ 'ana' │ 'qa'  │
│ 1       │ 'ben' │ 'dev' │
└─────────┴───────┴───────┘
```

In Node.js, `console.log` writes to *standard output* (stdout), while `console.error` and `console.warn` write to *standard error* (stderr). They look the same in a terminal, but tools such as CI systems can capture and display them separately. In the playground, errors appear in red and warnings in yellow.

## 1.4 How JavaScript reads your code

**Top to bottom, one statement at a time.** Each instruction is called a *statement*. This book ends every statement with a semicolon (`;`). JavaScript can often add missing semicolons for you (a feature called *automatic semicolon insertion*), but MDN calls writing them yourself best practice, because it avoids some surprising bugs. Playwright's documentation examples use semicolons too.

**Comments are ignored.** Use them to explain your code.

```js run
// A single-line comment starts with two slashes.
console.log("Step 1: open the login page");
console.log("Step 2: enter credentials"); // comments can go at the end of a line
/* A block comment
   can span several lines. */
console.log("Step 3: click Sign in");
```

```output
Step 1: open the login page
Step 2: enter credentials
Step 3: click Sign in
```

**JavaScript is case-sensitive.** `console`, `Console`, and `CONSOLE` are three different names. Only `console` (all lowercase) is the built-in one.

## 1.5 Reading error messages

Errors are normal. Reading them quickly is one of the most useful skills you can build, because a failing test usually shows you a JavaScript error.

Run this. Line 2 has a typo: `consol` instead of `console`.

```js run
console.log("before");
consol.log("oops");
console.log("after");
```

The playground prints `before`, then a red `ReferenceError`. Notice that `after` is **never printed**: when an error isn't handled, the program stops at that line.

Here's what the same file prints when you run it with Node.js (the paths will be different on your computer):

```text
before
/Users/you/qa/typo.js:2
consol.log("oops");
^

ReferenceError: consol is not defined
    at Object.<anonymous> (/Users/you/qa/typo.js:2:1)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    ...more "at" lines...

Node.js v24.18.0
```

Read it from the top:

1. **Where:** `typo.js:2` means file `typo.js`, line 2. The `^` points at the spot on that line.
2. **What:** `ReferenceError: consol is not defined`. The first word is the *error type*, and the rest is the message.
3. **How it got there:** the `at ...` lines are the *stack trace*. The first `at` line (`typo.js:2:1`, meaning line 2, column 1) is your code. Lines starting with `node:internal` are Node.js itself, so you can usually ignore them.

### Three errors you'll see most often

| Error type | What it means | Example cause |
|---|---|---|
| `SyntaxError` | The code isn't valid JavaScript, so it can't even start. **Nothing runs**, not even the lines before the mistake. | A missing `)` or quote |
| `ReferenceError` | You used a name that doesn't exist. | A typo such as `consol`, or using a variable before it's declared |
| `TypeError` | A value is the wrong kind for what you tried to do with it. | Calling a method on `undefined` |

Try a `SyntaxError`. Line 2 is missing its closing `)`. Even line 1 doesn't print:

```js run
console.log("line 1");
console.log("line 2";
console.log("line 3");
```

And a `TypeError`. You'll see this exact situation in tests when something you expected to exist is `undefined`:

```js run
const result = undefined;
result.click();
```

In Node.js and Chrome this prints `TypeError: Cannot read properties of undefined (reading 'click')`. Firefox and Safari word the message differently, but the error type is the same.

## 1.6 Running code on your computer

The playground is great for learning, but your real tests run on your computer with Node.js.

### Install Node.js

Download the **LTS** (long-term support) version from [nodejs.org](https://nodejs.org/) and install it. Then open a terminal (Terminal on macOS, PowerShell on Windows) and check that it works:

```bash
node --version
```

It prints a version number such as `v24.18.0`.

### Run a JavaScript file

Create a file named `hello.js` containing `console.log("Hello, QA!");`. In the terminal, go to the folder that contains it and run:

```bash
node hello.js
```

```output
Hello, QA!
```

### Run a TypeScript file

Recent versions of Node.js (**22.18.0 and later, or 23.6.0 and later**) can run `.ts` files directly. Node.js does this by *stripping* the types (deleting them) before running the code:

```bash
node hello.ts
```

Two things to know about this:

- **Node.js does not check your types.** The Node.js docs say it plainly: *"no type checking is performed."* A file with a type mistake still runs.
- **Only TypeScript that can simply be erased works.** A few TypeScript features generate extra JavaScript, and Node.js refuses to run those. The best-known one is `enum`, which fails with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. For full TypeScript support, the Node.js docs suggest a tool such as `tsx` (`npx tsx hello.ts`).

Here's the first point in action. This file assigns text to a variable declared as a `number`:

```ts title="wrong.ts"
const count: number = "three";
console.log(count);
```

```bash
node wrong.ts
```

```output
three
```

Node.js ran it without complaining. To find the mistake, you need the type checker.

### Check types with tsc

Install TypeScript in your project folder once:

```bash
npm install --save-dev typescript
```

Then check the file. `--noEmit` means "only check, don't write any `.js` files":

```bash
npx tsc --noEmit wrong.ts
```

```output
wrong.ts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.

1 const count: number = "three";
        ~~~~~


Found 1 error in wrong.ts:1
```

`wrong.ts:1:7` means line 1, column 7. `TS2322` is the error's code number, which you can search for online.

**Playwright behaves like Node.js here.** It runs `.ts` test files without checking their types. The Playwright docs recommend running `npx tsc --noEmit` alongside your tests, for example as a step in CI, so type errors aren't missed.

> **A confusing error you might hit:** if you name a variable `name` in a file and check it with `tsc`, you may see `Cannot redeclare block-scoped variable 'name'`. That's because TypeScript treats a file with no `import` or `export` as a *script* that shares one global scope with the browser's built-in definitions, and browsers already define a global called `name`. For now, the easy fix is to pick a different variable name. Chapter 8 explains modules, which avoid this problem. (The playground treats every example as a separate module, so you won't see this error there.)

### Command summary

| You want to… | Command |
|---|---|
| Check that Node.js is installed | `node --version` |
| Run a JavaScript file | `node file.js` |
| Run a TypeScript file (types are not checked) | `node file.ts` (Node.js 22.18+ or 23.6+) |
| Check types without creating `.js` files | `npx tsc --noEmit file.ts` |

## 1.7 Using the playground

- Press **▶ Run** on any example to run it right there.
- Press **Open in playground** to copy the example into the playground and change it. You can also open the playground with the **&lt;/&gt; Playground** button, or with <kbd>Ctrl</kbd> + <kbd>`</kbd>.
- In the playground, choose **TypeScript** or **JavaScript**, then press **▶ Run** or <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>Enter</kbd>.
- TypeScript problems are underlined in red in the editor and listed above the output. **Your code still runs**, the same as with `node file.ts` and Playwright, so you can see both the type error and what actually happens.
- Code that runs longer than 10 seconds is stopped, so an endless loop can't freeze the page.
- Output is formatted the way Node.js formats it for everyday values (text, numbers, objects, arrays, tables). One difference: an error shows only its first line, not the full stack trace.

## Exercise

Write a short run summary. The exercise checks exactly what your code prints.

```exercise ts title="Print a test run summary"
// Task 1: print the text  Test run started


// Task 2: print the label "Passed:" and the number 5 in ONE console.log call.
// The output should be:  Passed: 5


// Task 3: this line has a bug. Fix it so it prints  Run finished
consol.log("Run finished");
```

```checks
__book.check('Line 1 prints "Test run started"', __book.logs[0] === "Test run started");
__book.check('Line 2 prints "Passed: 5"', __book.logs[1] === "Passed: 5");
__book.check('Line 2 passes two values: the string "Passed:" and the number 5', __book.calls[1]?.[0] === "Passed:" && __book.calls[1]?.[1] === 5);
__book.check('Line 3 prints "Run finished"', __book.logs[2] === "Run finished");
__book.check("Exactly three lines are printed", __book.logs.length === 3);
```

```solution
// Task 1
console.log("Test run started");

// Task 2: two values separated by a comma
console.log("Passed:", 5);

// Task 3: "consol" was a typo for "console"
console.log("Run finished");
```

Run it once **before** changing anything. You'll see the TypeScript problem (`Cannot find name 'consol'. Did you mean 'console'?`) and the `ReferenceError` from this chapter. Then fix all three tasks.

## Quiz

```quiz
[
  {
    "q": "Where does the code in a Playwright test file run?",
    "options": [
      "Inside the web page being tested",
      "In Node.js, which controls a separate browser",
      "Inside the TypeScript compiler",
      "On the Playwright website"
    ],
    "answer": 1,
    "why": "The Playwright test runner is a Node.js program. It controls a browser, but your test code and the page's own scripts run in separate environments."
  },
  {
    "q": "You run `node wrong.ts`, and the file assigns a string to a variable declared as `number`. What happens?",
    "options": [
      "Node.js refuses to run the file",
      "Node.js prints a type error and stops",
      "Node.js removes the types and runs the code anyway",
      "Node.js changes the string into a number"
    ],
    "answer": 2,
    "why": "Node.js only strips type annotations. It does no type checking, so the code runs. Use `npx tsc --noEmit` to find type errors."
  },
  {
    "q": "Which command checks your TypeScript types without creating any `.js` files?",
    "options": [
      "`node --check file.ts`",
      "`npx tsc --noEmit file.ts`",
      "`npx playwright test`",
      "`npm install typescript`"
    ],
    "answer": 1,
    "why": "`tsc` is the TypeScript compiler, and `--noEmit` tells it to only report errors without writing output files."
  },
  {
    "q": "What does this print?",
    "code": "console.log(\"Total:\", 3, true);",
    "options": [
      "`Total:3true`",
      "`Total: 3 true`",
      "`\"Total:\", 3, true`",
      "`Total: 3, true`"
    ],
    "answer": 1,
    "why": "When you pass several values, `console.log` prints them on one line separated by single spaces."
  },
  {
    "q": "A file has three `console.log` lines. Line 2 contains `consol.log(\"x\");`. What gets printed?",
    "options": [
      "Nothing at all",
      "Lines 1 and 3, with a warning about line 2",
      "Line 1, then a `ReferenceError`; line 3 never runs",
      "All three lines"
    ],
    "answer": 2,
    "why": "Line 1 runs, then line 2 throws a `ReferenceError` because `consol` doesn't exist. An unhandled error stops the program, so line 3 never runs."
  },
  {
    "q": "Line 2 of a file is missing a closing `)`. What happens when you run it?",
    "options": [
      "Line 1 prints, then a `SyntaxError`",
      "Nothing runs, and you get a `SyntaxError`",
      "JavaScript adds the missing `)` for you",
      "You get a `TypeError` on line 2"
    ],
    "answer": 1,
    "why": "JavaScript reads the whole file before running it. If it isn't valid JavaScript, nothing runs, not even line 1."
  }
]
```

## Sources

Every fact in this chapter was checked against these sources, and every example was run with Node.js v24.18.0 and TypeScript 7.0.2.

- TypeScript Handbook, *The Basics*: [typescriptlang.org/docs/handbook/2/basic-types.html](https://www.typescriptlang.org/docs/handbook/2/basic-types.html) (erased types; "Type annotations never change the runtime behavior of your program")
- Node.js docs, *Modules: TypeScript*: [nodejs.org/api/typescript.html](https://nodejs.org/api/typescript.html) (type stripping, version history, unsupported syntax such as `enum`, no type checking)
- Node.js, *Introduction to Node.js*: [nodejs.org/en/learn/getting-started/introduction-to-nodejs](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
- Node.js docs, *Console*: [nodejs.org/api/console.html](https://nodejs.org/api/console.html) (stdout and stderr)
- MDN, *console*: [developer.mozilla.org/en-US/docs/Web/API/console](https://developer.mozilla.org/en-US/docs/Web/API/console)
- MDN, *Grammar and types*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types) (case sensitivity, comments, semicolons)
- Playwright, *Installation*: [playwright.dev/docs/intro](https://playwright.dev/docs/intro) (TypeScript is the default choice)
- Playwright, *Evaluating JavaScript*: [playwright.dev/docs/evaluating](https://playwright.dev/docs/evaluating) (test and page environments are separate)
- Playwright, *TypeScript*: [playwright.dev/docs/test-typescript](https://playwright.dev/docs/test-typescript) (Playwright doesn't check types; run `tsc --noEmit`)
- Chrome DevTools, *Open Chrome DevTools*: [developer.chrome.com/docs/devtools/open](https://developer.chrome.com/docs/devtools/open) (keyboard shortcuts)
