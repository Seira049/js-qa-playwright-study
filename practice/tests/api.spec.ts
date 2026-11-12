import { test, expect } from "@playwright/test";

test.describe("users API", () => {
  test("GET /api/users returns the user list", async ({ request }) => {
    const response = await request.get("/api/users");
    expect(response.status()).toBe(200);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/json");

    const body = await response.json();
    expect(body.total).toBe(body.users.length);
    expect(body.users).toContainEqual(expect.objectContaining({ email: "ana@test.io", role: "admin" }));
    for (const user of body.users) {
      expect(user).toEqual({
        id: expect.any(Number),
        name: expect.any(String),
        email: expect.stringMatching(/@/),
        role: expect.any(String),
      });
    }
  });

  test("query parameters filter by role", async ({ request }) => {
    const response = await request.get("/api/users", { params: { role: "qa" } });
    const body = await response.json();
    expect(body.users.every((u: { role: string }) => u.role === "qa")).toBe(true);
  });

  test("GET an unknown user returns 404", async ({ request }) => {
    const response = await request.get("/api/users/999");
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: "User 999 not found" });
  });

  test("creating a user needs a token", async ({ request }) => {
    const response = await request.post("/api/users", { data: { name: "Chen", email: "chen@test.io" } });
    expect(response.status()).toBe(401);
  });

  test("create, read, and delete a user", async ({ request }) => {
    const login = await request.post("/api/login", { data: { email: "qa@test.io", password: "correct-password" } });
    expect(login.ok()).toBeTruthy();
    const { token } = await login.json();
    const headers = { Authorization: `Bearer ${token}` };

    // A unique email, so parallel tests and repeated runs never collide
    const email = `chen-${Date.now()}@test.io`;
    const created = await request.post("/api/users", { headers, data: { name: "Chen Wu", email } });
    expect(created.status()).toBe(201);
    const user = await created.json();
    expect(user).toMatchObject({ name: "Chen Wu", email, role: "qa" });
    expect(created.headers()["location"]).toBe(`/api/users/${user.id}`);

    const fetched = await request.get(`/api/users/${user.id}`);
    await expect(fetched).toBeOK();
    expect(await fetched.json()).toEqual(user);

    const duplicate = await request.post("/api/users", { headers, data: { name: "Chen", email } });
    expect(duplicate.status()).toBe(409);

    const deleted = await request.delete(`/api/users/${user.id}`, { headers });
    expect(deleted.status()).toBe(204);
    expect((await request.get(`/api/users/${user.id}`)).status()).toBe(404);
  });

  test("validation errors return 400", async ({ request }) => {
    const { token } = await (await request.post("/api/login", { data: { email: "qa@test.io", password: "correct-password" } })).json();
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
});

test("wrong password returns 401", async ({ request }) => {
  const response = await request.post("/api/login", { data: { email: "qa@test.io", password: "nope" } });
  expect(response.status()).toBe(401);
  await expect(response).not.toBeOK();
});
