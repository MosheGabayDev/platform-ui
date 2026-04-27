import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — platform-ui E2E.
 *
 * Local dev assumptions:
 *  - Next.js dev server running on http://localhost:3001
 *  - Flask backend reachable via FLASK_API_URL (NEXTAUTH proxies to it)
 *  - Test credentials in tests/e2e/.env.test.local (gitignored)
 *
 * The dev server is NOT auto-started by Playwright; the developer must run
 * `npm run dev` in another terminal before invoking `npx playwright test`.
 * This avoids long startup times and prevents tests from hanging when the
 * server fails to start cleanly.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "he-IL",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
