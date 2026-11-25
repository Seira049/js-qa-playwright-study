import { defineConfig, devices } from "@playwright/test";

// PORT lets you use another port if 3000 is busy:  PORT=3100 npx playwright test
const PORT = process.env.PORT ?? "3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "node server.mjs",
    url: `http://localhost:${PORT}/practice/login.html`,
    reuseExistingServer: !process.env.CI && !process.env.BUG,
  },
});
