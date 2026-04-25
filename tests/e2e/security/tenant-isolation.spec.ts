/**
 * E2E: Tenant isolation tests
 * Verifies that Org A users cannot access Org B data through the UI or API.
 *
 * Status: SCAFFOLDED — tests are skipped until Playwright is configured and
 * two separate org test accounts are available. See required env vars below.
 *
 * Required env vars (.env.test.local — never commit):
 *   E2E_BASE_URL
 *   E2E_ORG_A_ADMIN_EMAIL / E2E_ORG_A_ADMIN_PASSWORD
 *   E2E_ORG_B_ADMIN_EMAIL / E2E_ORG_B_ADMIN_PASSWORD
 *
 * Fixture preparation:
 *   1. Create org_a and org_b as separate test organizations in the TEST environment
 *   2. Record a resource ID that belongs to org_b (e.g., a user ID)
 *   3. Set E2E_ORG_B_RESOURCE_USER_ID to that ID
 *
 * IMPORTANT: Use TEST environment only. Never target PROD.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const ORG_A_EMAIL = process.env.E2E_ORG_A_ADMIN_EMAIL ?? "";
const ORG_A_PASSWORD = process.env.E2E_ORG_A_ADMIN_PASSWORD ?? "";
// A user ID that belongs to org_b. Must be set as an env var — not hardcoded.
const ORG_B_USER_ID = process.env.E2E_ORG_B_RESOURCE_USER_ID ?? "";

const credentialsAvailable =
  !!process.env.E2E_ORG_A_ADMIN_EMAIL && !!process.env.E2E_ORG_B_RESOURCE_USER_ID;

test.describe("Multi-tenant: Org A cannot access Org B data", () => {
  test.skip(!credentialsAvailable, "Cross-org credentials/resource ID not set — skip");

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[name="email"]', ORG_A_EMAIL);
    await page.fill('[name="password"]', ORG_A_PASSWORD);
    await page.click('[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);
  });

  test("Org A user cannot fetch Org B user by direct ID via API", async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/proxy/users/${ORG_B_USER_ID}`);
    // Must return 403 or 404 — never 200 with cross-org data
    expect([403, 404]).toContain(resp.status());
  });

  test("Org A user list does not include Org B users", async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/proxy/users`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    const users = body.data ?? body.users ?? [];
    // None of the returned users should have an org_id belonging to org_b
    // This assertion requires org_b's org_id to be known — set E2E_ORG_B_ID
    const orgBId = process.env.E2E_ORG_B_ID;
    if (orgBId) {
      for (const user of users) {
        expect(String(user.org_id)).not.toBe(orgBId);
      }
    }
  });

  test("Org A user cannot navigate to Org B user detail page", async ({ page }) => {
    await page.goto(`${BASE_URL}/users/${ORG_B_USER_ID}`);
    // Must show denied/not-found state, not the user detail
    const denied = page.getByText(/not found|forbidden|access denied|permission/i);
    await expect(denied).toBeVisible();
  });

  test("Sending org_id in body is ignored — resource created in Org A, not Org B", async ({ request }) => {
    const orgBId = process.env.E2E_ORG_B_ID ?? "9999";
    const resp = await request.post(`${BASE_URL}/api/proxy/roles`, {
      data: {
        name: "[E2E-TEST] isolation-probe",
        org_id: orgBId, // must be ignored; derived from JWT
      },
    });
    if (resp.status() === 200 || resp.status() === 201) {
      const body = await resp.json();
      const created = body.data ?? body;
      expect(String(created.org_id)).not.toBe(orgBId);
      // Clean up: delete the test role
      const id = created.id;
      if (id) {
        await request.delete(`${BASE_URL}/api/proxy/roles/${id}`);
      }
    }
    // 403 is also acceptable (viewer cannot create roles)
  });
});
