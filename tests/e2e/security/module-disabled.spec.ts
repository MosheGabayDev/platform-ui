/**
 * E2E: Module availability tests
 * Verifies that disabled modules are blocked in navigation and direct URL access.
 *
 * Status: SCAFFOLDED — tests are skipped until:
 *   1. Playwright is configured
 *   2. Navigation is driven by DB (R044 NavAPI round)
 *   3. A test org with a known-disabled module is available
 *
 * Required env vars (.env.test.local — never commit):
 *   E2E_BASE_URL
 *   E2E_ORG_A_ADMIN_EMAIL / E2E_ORG_A_ADMIN_PASSWORD
 *   E2E_DISABLED_MODULE_KEY  — module key that is disabled for org_a (e.g., "billing")
 *   E2E_DISABLED_MODULE_PATH — frontend route for that module (e.g., "/billing")
 *
 * Blocker: Tests §3 and §4 require R044 Navigation API (nav driven by OrgModule state).
 * Until R044, navigation is hardcoded and cannot reflect module-disabled state.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.E2E_ORG_A_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ORG_A_ADMIN_PASSWORD ?? "";
const DISABLED_MODULE_PATH = process.env.E2E_DISABLED_MODULE_PATH ?? "";

const credentialsAvailable =
  !!process.env.E2E_ORG_A_ADMIN_EMAIL && !!process.env.E2E_DISABLED_MODULE_PATH;

test.describe("Module availability: disabled module is blocked", () => {
  test.skip(!credentialsAvailable, "Module-disabled credentials/env vars not set — skip");

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[name="email"]', ADMIN_EMAIL);
    await page.fill('[name="password"]', ADMIN_PASSWORD);
    await page.click('[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);
  });

  test(
    "Disabled module is not visible in sidebar navigation",
    // Blocked until R044 NavAPI — nav is hardcoded
    { annotation: { type: "blocked", description: "Requires R044 Navigation API" } },
    async ({ page }) => {
      test.skip(true, "Blocked: R044 Navigation API not implemented");
      const moduleName = process.env.E2E_DISABLED_MODULE_KEY ?? "";
      const navLink = page.getByRole("link", { name: new RegExp(moduleName, "i") });
      await expect(navLink).not.toBeVisible();
    }
  );

  test("Disabled module direct URL returns unavailable state", async ({ page }) => {
    await page.goto(`${BASE_URL}${DISABLED_MODULE_PATH}`);
    // Must show module-unavailable, not the module content
    const blocked = page.getByText(/unavailable|disabled|not enabled|access denied/i);
    await expect(blocked).toBeVisible();
  });

  test("Disabled module API route returns 403 module_unavailable", async ({ request }) => {
    const moduleKey = process.env.E2E_DISABLED_MODULE_KEY ?? "billing";
    const resp = await request.get(`${BASE_URL}/api/proxy/${moduleKey}`);
    expect(resp.status()).toBe(403);
    if (resp.status() === 403) {
      const body = await resp.json();
      // Response must indicate module is unavailable, not a generic 403
      const errorStr = JSON.stringify(body).toLowerCase();
      expect(errorStr).toMatch(/module_unavailable|module.*disabled|not.*enabled/);
    }
  });
});
