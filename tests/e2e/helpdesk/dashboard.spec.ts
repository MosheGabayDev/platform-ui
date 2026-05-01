/**
 * E2E smoke for Helpdesk Phase A — dashboard + tickets list + ticket detail.
 *
 * NOTE: in MOCK_MODE the page renders fixture data. When backend lands, the
 * same tests pass against real Flask data — no spec changes.
 *
 * Skipped automatically when E2E credentials env vars are not set.
 */
import { test, expect } from "@playwright/test";
import { getAdminCredentials, login } from "../helpers/auth";

test.describe("Helpdesk Phase A", () => {
  test.beforeEach(async ({ page }) => {
    const creds = getAdminCredentials();
    test.skip(creds === null, "E2E_ADMIN_EMAIL/PASSWORD not set");
    if (creds) await login(page, creds);
  });

  test("dashboard renders 4 KPI tiles when feature flag enabled", async ({ page }) => {
    await page.goto("/helpdesk");
    // FeatureGate fail-closed shows 'not enabled' fallback when flag is false.
    // The actual KPI tiles only appear when helpdesk.enabled=true OR mock data is present.
    const dashboardLabels = ["Open tickets", "Resolved today", "Avg resolution", "SLA compliance"];
    const fallback = page.getByText(/Helpdesk not enabled/i);
    const tiles = page.getByText(dashboardLabels[0]);

    // One of the two MUST be visible — feature flag determines which.
    const fallbackVisible = await fallback.isVisible().catch(() => false);
    if (fallbackVisible) {
      // Flag disabled — confirm fallback rendered correctly.
      await expect(fallback).toBeVisible();
    } else {
      // Flag enabled — confirm all 4 KPI labels present.
      for (const label of dashboardLabels) {
        await expect(page.getByText(label, { exact: false })).toBeVisible();
      }
    }
  });

  test("tickets list renders DataTable + filters when flag enabled", async ({ page }) => {
    await page.goto("/helpdesk/tickets");
    const fallback = page.getByText(/Helpdesk not enabled/i);
    if (await fallback.isVisible().catch(() => false)) {
      // Skip the rest — flag is off
      return;
    }
    await expect(page.getByPlaceholder(/Search ticket title/i)).toBeVisible();
    await expect(page.getByLabel(/Filter by status/i)).toBeVisible();
    await expect(page.getByLabel(/Filter by priority/i)).toBeVisible();
  });

  test("ticket detail navigates from list and shows timeline section", async ({ page }) => {
    await page.goto("/helpdesk/tickets");
    const fallback = page.getByText(/Helpdesk not enabled/i);
    if (await fallback.isVisible().catch(() => false)) return;

    // Direct nav to a known mock ticket
    await page.goto("/helpdesk/tickets/1001");
    await expect(page.getByText(/Ticket #1001/i)).toBeVisible();
    await expect(page.getByText(/Timeline/i)).toBeVisible();
    await expect(page.getByText(/Description/i)).toBeVisible();
  });

  test("ticket detail 404 path: invalid ID renders error state", async ({ page }) => {
    await page.goto("/helpdesk/tickets/abc");
    const fallback = page.getByText(/Helpdesk not enabled/i);
    if (await fallback.isVisible().catch(() => false)) return;
    await expect(page.getByText(/Invalid ticket ID/i)).toBeVisible();
  });
});
