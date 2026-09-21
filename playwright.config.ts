import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev:e2e",
    url: "http://localhost:5173",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      E2E_MOCK: "true",
      PORT: "3001",
      BASE_URL: "http://localhost:5173",
      GOOGLE_CLIENT_ID: "e2e-client-id",
      GOOGLE_CLIENT_SECRET: "e2e-client-secret",
      COOKIE_SECRET: "e2e-cookie-secret",
      E2E_TOKEN_ENDPOINT: "http://127.0.0.1:3001/e2e/oauth/token",
      E2E_SUBSCRIPTIONS_ENDPOINT: "http://127.0.0.1:3001/e2e/yt/subscriptions",
    },
  },
});