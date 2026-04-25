/**
 * E2E: Permission denial tests
 * Verifies that users without required permissions cannot perform admin actions,
 * both through UI (button hidden) and direct API calls (403 returned).
 *
 * Status: SCAFFOLDED — tests are skipped until Playwright is configured and
 * test credentials are available. See required env vars below.
 *
 * Required env vars (.env.test.local — never commit):
 *   E2E_BASE_URL
 *   E2E_ORG_A_ADMIN_EMAIL / E2E_ORG_A_ADMIN_PASSWORD
 *   E2E_ORG_A_VIEWER_EMAIL / E2E_ORG_A_VIEWER_PASSWORD
 *
 * IMPORTANT: All tests use test-only accounts. Never use production users.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const VIEWER_EMAIL = process.env.E2E_ORG_A_VIEWER_EMAIL ?? "";
const VIEWER_PASSWORD = process.env.E2E_ORG_A_VIEWER_PASSWORD ?? "";

const credentialsAvailable = !!process.env.E2E_ORG_A_VIEWER_EMAIL;

test.describe("RBAC: Permission denial — viewer role", () => {
  test.skip(!credentialsAvailable, "Viewer credentials not set — skip");

  test.beforeEach(async ({ page }) => {
    // Log in as a viewer (no admin permissions)
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[name="email"]', VIEWER_EMAIL);
    await page.fill('[name="password"]', VIEWER_PASSWORD);
    await page.click('[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);
  });

  test("Viewer does not see 'Create User' button on /users", async ({ page }) => {
    await page.goto(`${BASE_URL}/users`);
    // Admin-only action must not be visible to viewer
    const createButton = page.getByRole("button", { name: /create user/i });
    await expect(createButton).not.toBeVisible();
  });

  test("Viewer cannot access /users/new directly", async ({ page }) => {
    await page.goto(`${BASE_URL}/users/new`);
    // Must see an access-denied state, not the form
    await expect(page.getByText(/permission|forbidden|access denied/i)).toBeVisible();
  });

  test("Direct API call for user creation returns 403 for viewer", async ({ page, request }) => {
    // Get the viewer's session token via page context (cookies already set)
    // Then try a POST that requires admin — must get 403
    const resp = await request.post(`${BASE_URL}/api/proxy/users`, {
      data: { name: "injected", email: "injected@test.com" },
    });
    expect(resp.status()).toBe(403);
  });

  test("Viewer does not see 'Delete Organization' button", async ({ page }) => {
    await page.goto(`${BASE_URL}/organizations`);
    const deleteButton = page.getByRole("button", { name: /delete/i });
    await expect(deleteButton).not.toBeVisible();
  });

  test("Direct API DELETE for organization returns 403 for viewer", async ({ request }) => {
    const resp = await request.delete(`${BASE_URL}/api/proxy/organizations/1`);
    expect(resp.status()).toBe(403);
  });
});
