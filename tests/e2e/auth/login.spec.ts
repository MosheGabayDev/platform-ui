/**
 * E2E: Login flow
 *
 * Covers:
 *  - Login page renders for unauthenticated visitors
 *  - Wrong credentials show an error and stay on /login
 *  - Correct credentials redirect away from /login (positive flow)
 *
 * Skips positive flow if E2E_ADMIN_EMAIL/PASSWORD are not configured.
 */
import { test, expect } from "@playwright/test";
import { getAdminCredentials, login } from "../helpers/auth";

test.describe("Login flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("login page renders form for unauthenticated visitor", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /כניסה/ })).toBeVisible();
  });

  test("wrong credentials show error and stay on /login", async ({ page }) => {
    // AUTH_MOCK_MODE accepts any creds → this test is meaningful only when
    // the real Flask backend is reachable. Skip when mock mode is active.
    const isMockMode = process.env.AUTH_MOCK_MODE !== "false";
    test.skip(isMockMode, "AUTH_MOCK_MODE accepts any credentials in dev");

    await page.goto("/login");
    await page.locator("#email").fill("nobody@example.com");
    await page.locator("#password").fill("wrong-password");
    await page.getByRole("button", { name: /כניסה/ }).click();

    await expect(page.getByText(/כתובת האימייל או הסיסמה שגויים/)).toBeVisible({
      timeout: 8_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });

  test("correct credentials redirect to dashboard", async ({ page }) => {
    const creds = getAdminCredentials();
    test.skip(!creds, "E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD not set");

    await login(page, creds!);

    // The shell is on the dashboard (/) — confirm we're not on /login.
    await expect(page).not.toHaveURL(/\/login/);
  });
});
