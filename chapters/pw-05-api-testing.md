Not every test needs a browser. Playwright can send HTTP requests directly, which is much faster than going through the UI, and lets you test an API's behaviour on its own: status codes, response bodies, validation, and authentication. This chapter tests the practice project's small users API.

**In this chapter you will learn:**

- the HTTP basics every API test relies on
- the `request` fixture: `get`, `post`, `delete`, and friends
- how to check status codes, headers, and JSON bodies
- matching parts of a response with `expect.objectContaining`, `expect.any`, and `toMatchObject`
- sending a token in a header
- negative tests, and keeping API tests safe to run in parallel

All tests are in `practice/tests/api.spec.ts` and were run with Playwright 1.65.0.

## 17.1 HTTP in two minutes

An HTTP **request** has a **method**, a **URL**, optional **headers**, and for some methods a **body**. The **response** has a **status code**, headers, and usually a body.

| Method | Usually means |
|---|---|
| `GET` | read data |
| `POST` | create something, or perform an action (like logging in) |
| `PUT` / `PATCH` | replace / partly update something |
| `DELETE` | remove something |

| Status | Meaning |
|---|---|
| `200` OK | success, with a body |
| `201` Created | something was created |
| `204` No Content | success, with no body |
| `400` Bad Request | the request was invalid (e.g. a missing field) |
| `401` Unauthorized | not authenticated (missing or bad credentials) |
| `403` Forbidden | authenticated, but not allowed |
| `404` Not Found | it doesn't exist |
| `409` Conflict | conflicts with current data (e.g. a duplicate email) |
| `500` Internal Server Error | the server failed |

Codes in the 200s mean success, the 400s mean a problem with the request, and the 500s mean a problem on the server.

### The practice API

| Request | Result |
|---|---|
| `GET /api/users` | `200` with `{ total, users: [...] }`. `?role=qa` filters the list. |
| `GET /api/users/:id` | `200` with the user, or `404` |
| `POST /api/login` with `{ email, password }` | `200` with `{ token }`, or `401` |
| `POST /api/users` with `{ name, email, role? }` | `201` with the new user, `400` if invalid, `409` if the email exists. Needs the token. |
| `DELETE /api/users/:id` | `204`, or `404`. Needs the token. |

## 17.2 The request fixture

Tests can ask for a `request` fixture, just like `page`. It sends HTTP requests without opening a browser, and the Playwright docs say it *"respects configuration options like `baseURL` or `extraHTTPHeaders`"*. So relative paths work:

```ts title="practice/tests/api.spec.ts"
test("GET /api/users returns the user list", async ({ request }) => {
  const response = await request.get("/api/users");

  expect(response.status()).toBe(200);
  expect(response.ok()).toBe(true);                       // true for 200–299
  expect(response.headers()["content-type"]).toContain("application/json");

  const body = await response.json();
  expect(body.total).toBe(body.users.length);
  expect(body.users).toContainEqual(
    expect.objectContaining({ email: "ana@test.io", role: "admin" }),
  );

  for (const user of body.users) {
    expect(user).toEqual({
      id: expect.any(Number),
      name: expect.any(String),
      email: expect.stringMatching(/@/),
      role: expect.any(String),
    });
  }
});
```

What's happening:

- `request.get(url)` returns a response. `request.post`, `put`, `patch`, `delete`, and `head` work the same way.
- `response.status()`, `response.ok()`, and `response.headers()` are read **once**. These are non-retrying `expect(value)` checks (Chapter 15), which is right for data you already have.
- `await response.json()` parses the body (Chapter 5). Its type is `any` (Chapter 11), so the assertions are what actually check the data.
- `expect.objectContaining({...})` matches an object that has **at least** these properties.
- `expect.any(Number)` matches any number, and `expect.stringMatching(regex)` matches a string by pattern. Inside `toEqual`, they let you check the **shape** of each user without knowing exact values.

`toEqual` with every key listed is a strict shape check. If the API adds or removes a field, it fails, which is often what a contract test wants. Use `toMatchObject` or `objectContaining` when extra fields are fine.

### Query parameters

Pass `params` instead of building the query string yourself. Playwright encodes it for you:

```ts title="practice/tests/api.spec.ts"
test("query parameters filter by role", async ({ request }) => {
  const response = await request.get("/api/users", { params: { role: "qa" } });
  const body = await response.json();
  expect(body.users.every((u: { role: string }) => u.role === "qa")).toBe(true);
});
```

This uses `every` from Chapter 5 to check the whole list at once.

## 17.3 Sending data and tokens

`data` is the request body. The API docs say that if it's an object, *"it will be serialized to json string and `content-type` header will be set to `application/json` if not explicitly set."*

```ts title="practice/tests/api.spec.ts"
test("create, read, and delete a user", async ({ request }) => {
  // 1. Log in to get a token
  const login = await request.post("/api/login", {
    data: { email: "qa@test.io", password: "correct-password" },
  });
  expect(login.ok()).toBeTruthy();
  const { token } = await login.json();
  const headers = { Authorization: `Bearer ${token}` };

  // 2. Create a user. The email is unique, so parallel tests and repeated runs never collide.
  const email = `chen-${Date.now()}@test.io`;
  const created = await request.post("/api/users", { headers, data: { name: "Chen Wu", email } });
  expect(created.status()).toBe(201);
  const user = await created.json();
  expect(user).toMatchObject({ name: "Chen Wu", email, role: "qa" });
  expect(created.headers()["location"]).toBe(`/api/users/${user.id}`);

  // 3. Read it back
  const fetched = await request.get(`/api/users/${user.id}`);
  await expect(fetched).toBeOK();
  expect(await fetched.json()).toEqual(user);

  // 4. A duplicate email is rejected
  const duplicate = await request.post("/api/users", { headers, data: { name: "Chen", email } });
  expect(duplicate.status()).toBe(409);

  // 5. Delete it, and check it's gone
  const deleted = await request.delete(`/api/users/${user.id}`, { headers });
  expect(deleted.status()).toBe(204);
  expect((await request.get(`/api/users/${user.id}`)).status()).toBe(404);
});
```

- `toMatchObject` checks the listed properties and ignores any others (here, the generated `id`).
- `await expect(response).toBeOK()` asserts the status is in the 200–299 range. If it fails, Playwright includes the response details in the error message, which helps more than a bare `expected 200, got 500`.
- **Headers** are passed per request with `headers`. To send a header on every request, set `extraHTTPHeaders` in the config's `use`. Keep real tokens in environment variables (`process.env.API_TOKEN`), never in code.

## 17.4 Negative tests

Most API bugs hide in the error paths. Test that bad requests are rejected **with the right status and message**:

```ts title="practice/tests/api.spec.ts"
test("GET an unknown user returns 404", async ({ request }) => {
  const response = await request.get("/api/users/999");
  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({ error: "User 999 not found" });
});

test("creating a user needs a token", async ({ request }) => {
  const response = await request.post("/api/users", {
    data: { name: "Chen", email: "chen@test.io" },
  });
  expect(response.status()).toBe(401);
});

test("validation errors return 400", async ({ request }) => {
  const { token } = await (
    await request.post("/api/login", { data: { email: "qa@test.io", password: "correct-password" } })
  ).json();
  const headers = { Authorization: `Bearer ${token}` };

  const cases = [
    { data: { email: "x@test.io" }, error: "name is required" },
    { data: { name: "X", email: "not-an-email" }, error: "email is invalid" },
    { data: { name: "  ", email: "y@test.io" }, error: "name is required" },
  ];
  for (const c of cases) {
    const response = await request.post("/api/users", { headers, data: c.data });
    expect(response.status(), JSON.stringify(c.data)).toBe(400);
    expect((await response.json()).error).toBe(c.error);
  }
});
```

The second argument to `expect(value, message)` is a **custom message**, shown when the assertion fails. In a loop it tells you *which* case failed. The `for...of` loop works here because each iteration is awaited (Chapter 10).

Ideas for negative cases: missing required fields, wrong types (`"age": "ten"`), empty strings and whitespace (like `"  "` above), values that are too long, duplicates, unknown IDs, a missing or expired token, and a valid token for a user who isn't allowed to do the action.

## 17.5 Keeping API tests reliable

- **Make data unique.** Tests run in parallel (Chapter 13), and against a shared environment other people's tests run too. Fixed values like `chen@test.io` collide. Add something unique, such as `Date.now()` or `crypto.randomUUID()`.
- **Clean up what you create**, ideally in a fixture's teardown so it runs even when the test fails (Chapter 18).
- **Don't depend on order.** Each test should create what it needs. A test that only passes after another test has created a user breaks when it runs alone or in parallel.
- **Check what matters.** Exact counts like `total === 2` break as soon as someone else adds data. Relationships like `total === users.length`, and the presence of the record you created, are more robust.

## Try it

1. Write a test that logs in with an **empty** body (`data: {}`) and checks the status is `401`.
2. Write a test that creates a user with `role: "admin"` and checks the response has that role. Clean up by deleting the user at the end.
3. Write a test that `DELETE`s a user that doesn't exist and checks for `404`. What does the API return if you forget the token?

<details>
<summary>Show solutions</summary>

```ts
import { test, expect, type APIRequestContext } from "@playwright/test";

async function authHeaders(request: APIRequestContext) {
  const login = await request.post("/api/login", {
    data: { email: "qa@test.io", password: "correct-password" },
  });
  const { token } = await login.json();
  return { Authorization: `Bearer ${token}` };
}

test("login with an empty body is rejected", async ({ request }) => {
  const response = await request.post("/api/login", { data: {} });
  expect(response.status()).toBe(401);
});

test("create an admin user", async ({ request }) => {
  const headers = await authHeaders(request);
  const created = await request.post("/api/users", {
    headers,
    data: { name: "Dee Admin", email: `dee-${Date.now()}@test.io`, role: "admin" },
  });
  expect(created.status()).toBe(201);
  const user = await created.json();
  expect(user.role).toBe("admin");
  await request.delete(`/api/users/${user.id}`, { headers });
});

test("deleting an unknown user", async ({ request }) => {
  const headers = await authHeaders(request);
  expect((await request.delete("/api/users/99999", { headers })).status()).toBe(404);
  // Without the token, the API checks authentication first:
  expect((await request.delete("/api/users/99999")).status()).toBe(401);
});
```

`APIRequestContext` is the type of the `request` fixture.

</details>

## Quiz

```quiz
[
  {
    "q": "Which status code means \"you're not authenticated\"?",
    "options": ["`400`", "`401`", "`403`", "`404`"],
    "answer": 1,
    "why": "`401` means missing or invalid credentials. `403` means authenticated but not allowed."
  },
  {
    "q": "What does `request.post(\"/api/users\", { data: { name: \"Ana\" } })` send?",
    "options": [
      "A form with a field `data`",
      "The object as a JSON body, with `content-type: application/json` set automatically",
      "Nothing; `data` is ignored for POST",
      "A query string `?name=Ana`"
    ],
    "answer": 1,
    "why": "Objects passed as `data` are serialised to JSON, and the content type is set if you didn't set one."
  },
  {
    "q": "What does `expect(user).toMatchObject({ name: \"Ana\" })` check?",
    "options": [
      "That `user` has exactly one property",
      "That `user.name` is `\"Ana\"`, ignoring other properties",
      "That `user` is the same object",
      "That `user` is a string"
    ],
    "answer": 1,
    "why": "`toMatchObject` checks the listed properties only. `toEqual` with every key would also fail on extra properties."
  },
  {
    "q": "Why use `email: `user-${Date.now()}@test.io`` in a create test?",
    "options": [
      "Emails must contain numbers",
      "So parallel tests and repeated runs don't collide on the same email",
      "To make the test slower",
      "It's required by Playwright"
    ],
    "answer": 1,
    "why": "Unique data keeps tests independent of each other and of earlier runs."
  },
  {
    "q": "What does `await expect(response).toBeOK()` check?",
    "options": ["Status is exactly 200", "Status is between 200 and 299", "The body is valid JSON", "The response arrived in under 1 second"],
    "answer": 1,
    "why": "It asserts a 2xx status, and includes response details in the error when it fails."
  }
]
```

## Sources

Every test shown, including the solutions, was run with Playwright Test 1.65.0 against the practice API, and repeated three times in parallel (`--repeat-each=3`) to confirm the tests don't interfere with each other.

- Playwright, *API testing* (the `request` fixture respects `baseURL` and `extraHTTPHeaders`): [playwright.dev/docs/api-testing](https://playwright.dev/docs/api-testing)
- Playwright, *APIRequestContext* (`get`, `post`, `delete`, `params`, `data` serialisation): [playwright.dev/docs/api/class-apirequestcontext](https://playwright.dev/docs/api/class-apirequestcontext)
- Playwright, *APIResponse* (`status`, `ok`, `headers`, `json`): [playwright.dev/docs/api/class-apiresponse](https://playwright.dev/docs/api/class-apiresponse)
- Playwright, *APIResponseAssertions* (`toBeOK`: status in 200..299): [playwright.dev/docs/api/class-apiresponseassertions](https://playwright.dev/docs/api/class-apiresponseassertions)
- Playwright, *GenericAssertions* (`toEqual`, `toMatchObject`, `toContainEqual`, `objectContaining`, `any`, `stringMatching`, custom messages): [playwright.dev/docs/api/class-genericassertions](https://playwright.dev/docs/api/class-genericassertions)
- MDN, *HTTP request methods* and *HTTP response status codes*: [developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods), [developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)
