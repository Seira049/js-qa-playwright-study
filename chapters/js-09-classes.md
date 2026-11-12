A **class** is a blueprint for creating objects that have both **data** and **behaviour**. In test automation, classes are best known from the **Page Object Model**: a `LoginPage` class that knows where the email field is and how to sign in, so your tests don't repeat those details. This chapter teaches classes from the ground up, then shows how they're used for page objects.

**In this chapter you will learn:**

- how to define a class, create objects with `new`, and use `constructor`, fields, and methods
- what `this` means, and the common bug when a method loses its `this`
- getters, static methods, and private `#fields`
- inheritance with `extends` and `super`
- TypeScript's `readonly`, `private`, and parameter properties, and where they work
- how a Playwright page object is built

## 9.1 Defining a class

```js run
class Cart {
  items = [];                      // a field: every Cart starts with its own empty array

  constructor(owner) {             // runs when you write `new Cart(...)`
    this.owner = owner;
  }

  add(name, price) {               // a method
    this.items.push({ name, price });
  }
}

const cart = new Cart("Ana");      // create an object (an "instance") from the class
cart.add("Pen", 2);
cart.add("Book", 10);
console.log(cart);
console.log(cart.items.length, cart instanceof Cart);
```

```output
Cart {
  items: [ { name: 'Pen', price: 2 }, { name: 'Book', price: 10 } ],
  owner: 'Ana'
}
2 true
```

- **`new Cart("Ana")`** creates a new object and runs the `constructor` with `"Ana"`.
- **`this`** inside the class means "the object this method was called on". In `cart.add(...)`, `this` is `cart`.
- **Fields** (`items = []`) give each new object its own starting values.
- **Methods** (`add`) are functions that belong to the class.

Each `new` creates a **separate** object with its own data. Two carts never share `items`.

Forgetting `new` is an error: `Cart("Ana")` throws `TypeError: Class constructor Cart cannot be invoked without 'new'`.

### Methods that return this

If a method returns `this`, calls can be chained:

```js run
class RequestBuilder {
  headers = {};
  path = "/";

  to(path) {
    this.path = path;
    return this;
  }
  header(name, value) {
    this.headers[name] = value;
    return this;
  }
}

const req = new RequestBuilder().to("/api/users").header("accept", "application/json");
console.log(req.path, req.headers);
```

```output
/api/users { accept: 'application/json' }
```

## 9.2 Getters and static methods

A **getter** looks like a property but is calculated each time it's read. A **static** method belongs to the class itself, not to individual objects:

```js run
class Cart {
  items = [];

  add(price) {
    this.items.push(price);
    return this;
  }

  get total() {                    // read as cart.total, no parentheses
    return this.items.reduce((sum, p) => sum + p, 0);
  }

  static withItems(...prices) {    // called as Cart.withItems(...)
    const cart = new Cart();
    for (const p of prices) cart.add(p);
    return cart;
  }
}

const cart = Cart.withItems(5, 10, 2.5);
console.log(cart.total);
```

```output
17.5
```

A getter without a setter is read-only: `cart.total = 5` throws `TypeError: Cannot set property total of #<Cart> which has only a getter`.

## 9.3 Private fields

A field whose name starts with `#` is **private**: only code inside the class can read or change it.

```js run
class Account {
  #balance = 0;

  deposit(amount) {
    this.#balance += amount;
  }

  get balance() {
    return this.#balance;
  }
}

const account = new Account();
account.deposit(50);
console.log(account.balance);
console.log(Object.keys(account)); // #balance doesn't show up
```

```output
50
[]
```

Trying to read `account.#balance` from outside the class is a `SyntaxError`, so the code doesn't even run.

## 9.4 Inheritance: extends and super

A class can **extend** another, inheriting its fields and methods. `super(...)` calls the parent's constructor, and `super.method()` calls the parent's version of a method:

```js run
class BasePage {
  constructor(path) {
    this.path = path;
  }
  describe() {
    return `Page at ${this.path}`;
  }
}

class LoginPage extends BasePage {
  constructor() {
    super("/login");             // must run before using `this`
    this.heading = "Sign in";
  }
  describe() {                   // replaces (overrides) the parent's method
    return `${super.describe()} (${this.heading})`;
  }
}

const page = new LoginPage();
console.log(page.describe());
console.log(page instanceof LoginPage, page instanceof BasePage);
```

```output
Page at /login (Sign in)
true true
```

> **Use inheritance sparingly.** A small base class for things every page shares can help. Deep chains (`BasePage` → `AuthPage` → `AdminPage` → …) get hard to follow. Often it's simpler to give a page object *another* object to use (for example, a `Header` component) than to inherit from it.

## 9.5 The lost-this bug

`this` is set by **how a method is called**, not where it's defined. If you take a method off its object and call it on its own, `this` is `undefined`:

```js run
class Counter {
  count = 0;
  increment() {
    this.count++;
  }
}

const counter = new Counter();
const increment = counter.increment; // just the function, detached from counter
increment();
```

That throws `TypeError: Cannot read properties of undefined (reading 'count')`. It happens when you pass a method as a callback, for example `buttons.forEach(counter.increment)`.

Two fixes:

```js run
class Counter {
  count = 0;
  increment = () => {        // an arrow function field keeps `this` fixed to the object
    this.count++;
  };
}

const counter = new Counter();
const increment = counter.increment;
increment();
[1, 2].forEach(() => counter.increment()); // or wrap the call in an arrow function
console.log(counter.count);
```

```output
3
```

Arrow functions don't have their own `this`. They use the `this` from where they were written, which is why the arrow field works.

## 9.6 Classes in TypeScript

### Declaring fields

In TypeScript, every field must be declared with its type. With `strict` on, a field must also be given a value, either where it's declared or in the constructor. Otherwise you get `Property 'name' has no initializer and is not definitely assigned in the constructor.`

### readonly, private, public

```ts run
class LoginPage {
  readonly path: string = "/login";
  private attempts = 0;

  constructor(readonly baseUrl: string) {}   // a "parameter property" (see below)

  fullUrl(): string {
    return this.baseUrl + this.path;
  }
}

const page = new LoginPage("https://shop.test");
page.path = "/other";         // readonly
console.log(page.attempts);   // private
console.log(page.fullUrl());
```

TypeScript reports `Cannot assign to 'path' because it is a read-only property.` and `Property 'attempts' is private and only accessible within class 'LoginPage'.`

- `readonly` stops a field from being reassigned after the constructor.
- `private` (TypeScript) and `#private` (JavaScript) both hide a field. TypeScript's `private` is only checked by TypeScript and is removed when the code runs. `#private` is enforced by JavaScript itself.
- `public` is the default, so you rarely write it.

### Parameter properties, and where they work

`constructor(readonly baseUrl: string) {}` is a TypeScript shortcut. It declares the field and assigns it in one go. It's the same as:

```ts
readonly baseUrl: string;
constructor(baseUrl: string) {
  this.baseUrl = baseUrl;
}
```

Because the shortcut **generates** JavaScript, it isn't plain type annotation, and **Node.js's type stripping refuses it**: `node file.ts` fails with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX: TypeScript parameter property is not supported in strip-only mode`. Playwright Test transforms TypeScript itself, so parameter properties **do** work in Playwright tests (checked with Playwright 1.65.0), and so does the playground. If you want code that also runs with `node file.ts`, write the field and the assignment out in full, as the official Playwright docs do.

## 9.7 A Playwright page object

Here's the shape of the page object from the Playwright docs. You'll build real ones in Part 2. For now, notice that it uses everything from this chapter: `export`, a class, `readonly` typed fields, a constructor that stores `page`, and methods.

```ts title="pages/login-page.ts (read-only example)"
import { type Page, type Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.signInButton = page.getByRole("button", { name: "Sign in" });
  }

  async goto() {
    await this.page.goto("/login");
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}
```

A test then reads like a description of what the user does:

```ts title="tests/login.spec.ts (read-only example)"
import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login-page";

test("user can sign in", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.signIn("qa@test.io", "correct-password");
  await expect(page).toHaveURL(/dashboard/);
});
```

`async` and `await` are next, in Chapter 10.

## Exercises

```exercise ts title="Build a ShoppingCart class"
// Write a ShoppingCart class:
//  - addItem(name: string, price: number, qty = 1) adds an item and returns the cart (so calls can chain)
//  - itemCount: a GETTER returning the total quantity of all items
//  - total: a GETTER returning the sum of price * qty, rounded to 2 decimal places
//  - clear() removes all items
//  - items must not be changeable from outside: use a #private field
class ShoppingCart {
}

const cart = new ShoppingCart();
cart.addItem("Pen", 1.5, 2).addItem("Notebook", 3.25);
console.log(cart.itemCount, cart.total);
```

```checks
__book.test("addItem returns the cart", () => { const c = new ShoppingCart(); return c.addItem("A", 1) === c; });
__book.test("itemCount adds up quantities (2 + 1 = 3)", () => new ShoppingCart().addItem("Pen", 1.5, 2).addItem("Notebook", 3.25).itemCount === 3);
__book.test("total is 6.25", () => new ShoppingCart().addItem("Pen", 1.5, 2).addItem("Notebook", 3.25).total === 6.25);
__book.test("total rounds to 2 decimal places (0.1 + 0.2 = 0.3)", () => new ShoppingCart().addItem("A", 0.1).addItem("B", 0.2).total === 0.3);
__book.test("clear() empties the cart", () => { const c = new ShoppingCart().addItem("A", 5); c.clear(); return c.itemCount === 0 && c.total === 0; });
__book.test("two carts don't share items", () => { const a = new ShoppingCart().addItem("A", 1); const b = new ShoppingCart(); return a.itemCount === 1 && b.itemCount === 0; });
__book.test("items are stored in a #private field", () => /#\w+/.test(__book.source) && Object.keys(new ShoppingCart().addItem("A", 1)).length === 0);
```

```solution
class ShoppingCart {
  #items: { name: string; price: number; qty: number }[] = [];

  addItem(name: string, price: number, qty = 1): this {
    this.#items.push({ name, price, qty });
    return this;
  }

  get itemCount(): number {
    return this.#items.reduce((sum, item) => sum + item.qty, 0);
  }

  get total(): number {
    const raw = this.#items.reduce((sum, item) => sum + item.price * item.qty, 0);
    return Math.round(raw * 100) / 100;
  }

  clear(): void {
    this.#items = [];
  }
}

const cart = new ShoppingCart();
cart.addItem("Pen", 1.5, 2).addItem("Notebook", 3.25);
console.log(cart.itemCount, cart.total);
```

```exercise js title="Fix the lost this"
// reporter.log is passed to forEach as a callback, and it crashes.
// Fix the Reporter class so this code works and lines contains all three messages.
class Reporter {
  lines = [];
  log(message) {
    this.lines.push(`[report] ${message}`);
  }
}

const reporter = new Reporter();
["start", "step 1", "done"].forEach(reporter.log);
console.log(reporter.lines);
```

```checks
__book.test("lines has all three messages", () => JSON.stringify(reporter.lines) === JSON.stringify(["[report] start", "[report] step 1", "[report] done"]));
```

```solution
class Reporter {
  lines = [];
  // An arrow function field keeps `this` bound to the object,
  // so it works even when passed around as a callback.
  log = (message) => {
    this.lines.push(`[report] ${message}`);
  };
}

const reporter = new Reporter();
["start", "step 1", "done"].forEach(reporter.log);
console.log(reporter.lines);

// Alternative: keep log as a method and call it inside an arrow function:
// ["start", "step 1", "done"].forEach((m) => reporter.log(m));
```

## Quiz

```quiz
[
  {
    "q": "What does `this` refer to inside a method called as `cart.add(5)`?",
    "options": ["The `Cart` class", "The `cart` object", "The `add` function", "The global object"],
    "answer": 1,
    "why": "`this` is the object the method was called on, here `cart`."
  },
  {
    "q": "Two objects are created with `new Cart()`. One adds an item. How many items does the other have?",
    "options": ["The same as the first", "0", "It depends on the order", "It throws an error"],
    "answer": 1,
    "why": "Each `new` creates a separate object, and field initialisers like `items = []` run for each one."
  },
  {
    "q": "What happens here?",
    "code": "class A {\n  n = 1;\n  show() { return this.n; }\n}\nconst show = new A().show;\nshow();",
    "options": ["Returns `1`", "Returns `undefined`", "Throws `TypeError` because `this` is `undefined`", "Returns the class"],
    "answer": 2,
    "why": "The method was detached from its object, so `this` is `undefined` and reading `.n` throws. Use an arrow function field or call it as `obj.show()`."
  },
  {
    "q": "What's the difference between TypeScript's `private x` and JavaScript's `#x`?",
    "options": [
      "No difference",
      "`private` is only checked by TypeScript and removed at runtime; `#x` is enforced by JavaScript itself",
      "`#x` only works in TypeScript",
      "`private` makes the field read-only"
    ],
    "answer": 1,
    "why": "TypeScript's access modifiers are erased like other types. `#` private fields are a JavaScript feature enforced when the code runs."
  },
  {
    "q": "Why does `node page.ts` fail on `constructor(private page: Page) {}`?",
    "options": [
      "Classes aren't allowed in `.ts` files",
      "Parameter properties generate JavaScript, so Node.js's type stripping doesn't support them",
      "`private` is a reserved word",
      "Node.js doesn't support constructors"
    ],
    "answer": 1,
    "why": "Node.js only strips types. Parameter properties need code generation, so it reports `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. Playwright Test supports them because it transforms TypeScript itself."
  },
  {
    "q": "In a subclass constructor, what must happen before you use `this`?",
    "options": ["Call `super(...)`", "Call `new`", "Declare every field", "Nothing"],
    "answer": 0,
    "why": "In a class that `extends` another, `super(...)` must run before `this` can be used."
  }
]
```

## Sources

Every example was run with Node.js v24.18.0, and the TypeScript messages were produced by TypeScript 7.0.2. Parameter-property support was checked with Node.js type stripping and with Playwright Test 1.65.0.

- MDN, *Classes*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes) (fields, getters, `static`, `extends`, `super`)
- MDN, *Private elements*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements)
- MDN, *this*: [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)
- TypeScript Handbook, *Classes*: [typescriptlang.org/docs/handbook/2/classes.html](https://www.typescriptlang.org/docs/handbook/2/classes.html) (`readonly`, `private`, parameter properties, `strictPropertyInitialization`)
- Node.js docs, *Modules: TypeScript* (parameter properties unsupported in strip-only mode): [nodejs.org/api/typescript.html](https://nodejs.org/api/typescript.html)
- Playwright, *Page object models*: [playwright.dev/docs/pom](https://playwright.dev/docs/pom)
