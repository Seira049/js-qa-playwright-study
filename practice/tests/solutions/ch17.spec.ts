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
  expect((await request.delete("/api/users/99999")).status()).toBe(401);
});
