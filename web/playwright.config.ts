import { defineConfig, devices } from "@playwright/test";
import { E2E_APP_ORIGIN, E2E_APP_PORT, E2E_AUTH_SECRET, E2E_DB_URL, E2E_ENCRYPTION_SECRET } from "./e2e/fixtures";

// E2E runs against a production build on :3100 (never the dev server's :3000).
// global-setup boots a disposable embedded Postgres, applies migrations and
// seeds the auth fixtures before any test runs.
const externalBase = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: externalBase ?? E2E_APP_ORIGIN,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run start",
        url: externalBase ?? E2E_APP_ORIGIN,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          PORT: String(E2E_APP_PORT),
          DATABASE_URL: E2E_DB_URL,
          AUTH_SECRET: E2E_AUTH_SECRET,
          AUTH_URL: E2E_APP_ORIGIN,
          AUTH_TRUST_HOST: "true",
          GOPHISH_KEY_ENCRYPTION_SECRET: E2E_ENCRYPTION_SECRET,
          NODE_ENV: "production",
        },
      },
});
