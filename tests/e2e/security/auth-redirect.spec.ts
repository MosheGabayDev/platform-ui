/**
 * E2E: Authentication redirect tests
 * Verifies unauthenticated users are redirected to /login for all protected routes.
 *
 * Status: SCAFFOLDED — tests are skipped until Playwright is configured and
 * test credentials are available. See required env vars below.
 *
 * Required env vars (.env.test.local — never commit):
 *   E2E_BASE_URL
 *   E2E_ORG_A_ADMIN_EMAIL
 *   E2E_ORG_A_ADMIN_PASSWORD
 *
 * Setup:
 *   1. Install Playwright: npx playwright install --with-deps
 *   2. Copy .env.test.local.example → .env.test.local and fill in credentials
 *   3. Remove test.skip annotations below
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/users",
  "/organizations",
  "/roles",
  "/helpdesk",
  "/settings",
];

test.describe("Auth: Unauthenticated redirect", () => {
  test.skip(!process.env.E2E_BASE_URL, "E2E_BASE_URL not set — skip");

  for (const route of PROTECTED_ROUTES) {
    test(`GET ${route} without session → redirects to /login`, async ({ page }) => {
      // Clear all storage to ensure no session
      await page.context().clearCookies();

      await page.goto(`${BASE_URL}${route}`);

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("API proxy /api/proxy/* rejects unauthenticated request with 401", async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/proxy/users`);
    expect(resp.status()).toBe(401);
  });

  test("Login page is accessible without session", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/login`);
    await expect(page).not.toHaveURL(/\/login.*redirect/);
    // Login form must be visible
    await expect(page.locator("form")).toBeVisible();
  });
});
