/**
 * E2E: Smoke — protected routes
 *
 * Auth-redirect smoke (replaces the scaffold version which was always skipped).
 * Verifies that any unauthenticated GET to a protected route lands on /login,
 * and that the proxy returns 401 instead of HTML for API callers.
 */
import { test, expect } from "@playwright/test";

const PROTECTED_ROUTES = ["/", "/users", "/organizations", "/roles"];

test.describe("Smoke: auth redirect", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  for (const route of PROTECTED_ROUTES) {
    test(`unauthenticated GET ${route} → /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("API proxy rejects unauthenticated request with 401", async ({ request }) => {
    const resp = await request.get("/api/proxy/users");
    expect(resp.status()).toBe(401);
  });
});
