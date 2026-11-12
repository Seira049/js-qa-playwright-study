import { test as base, expect, type APIRequestContext } from "@playwright/test";

type User = { id: number; name: string; email: string; role: string };

async function authHeaders(request: APIRequestContext) {
  const login = await request.post("/api/login", {
    data: { email: "qa@test.io", password: "correct-password" },
  });
  expect(login.ok()).toBeTruthy();
  const { token } = await login.json();
  return { Authorization: `Bearer ${token}` };
}

export const test = base.extend<{ tempUser: User }>({
  tempUser: async ({ request }, use) => {
    // Setup: create a unique user through the API
    const headers = await authHeaders(request);
    const response = await request.post("/api/users", {
      headers,
      data: { name: "Temp User", email: `temp-${crypto.randomUUID()}@test.io` },
    });
    expect(response.status()).toBe(201);
    const user: User = await response.json();

    await use(user);

    // Teardown: runs after the test, even if it failed
    await request.delete(`/api/users/${user.id}`, { headers });
  },
});

export { expect };
