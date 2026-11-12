import { test, expect } from "../fixtures/data";

test("a temporary user exists while the test runs", async ({ tempUser, request }) => {
  const response = await request.get(`/api/users/${tempUser.id}`);
  await expect(response).toBeOK();
  expect(await response.json()).toEqual(tempUser);
});
