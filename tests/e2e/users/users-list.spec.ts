/**
 * E2E: Users list page
 *
 * Verifies that an authenticated admin can:
 *  - Reach /users
 *  - See the page header in Hebrew
 *  - See at least one row in the users table
 *
 * Skips entirely if E2E credentials are not configured.
 */
import { test, expect } from "@playwright/test";
import { getAdminCredentials, login } from "../helpers/auth";

test.describe("Users list page", () => {
  test.beforeEach(async ({ page }) => {
    const creds = getAdminCredentials();
    test.skip(!creds, "E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD not set");
    await page.context().clearCookies();
    await login(page, creds!);
  });

  test("renders the users list with at least one user", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL(/\/users$/);

    // Page heading — Hebrew label "משתמשים".
    await expect(page.getByRole("heading", { name: /משתמשים/ })).toBeVisible({
      timeout: 10_000,
    });

    // Table contains user rows. We accept any row that contains an email-like
    // string — the seed data has at least one admin.
    const emailCell = page.locator("td", { hasText: /@/ }).first();
    await expect(emailCell).toBeVisible({ timeout: 10_000 });
  });
});
