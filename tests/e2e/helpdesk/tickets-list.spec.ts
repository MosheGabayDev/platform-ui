/**
 * E2E smoke for /helpdesk/tickets list page.
 *
 * Covers:
 *   - Page renders DataTable + 2 filter selects + search input
 *   - Status filter narrows results
 *   - Priority filter narrows results
 *   - Search by ticket title or ticket_number
 *   - Row click navigates to detail page
 *   - FeatureGate fallback when helpdesk.enabled=false
 *
 * Uses the base fixture (mock session + feature-flag stubbing).
 */
import { test, expect } from "../fixtures/base";

test.describe("Helpdesk tickets list", () => {
  test("renders KPI page chrome + filters when flag enabled", async ({ page, errorCapture }) => {
    void errorCapture; // ensure capture is wired
    await page.goto("/helpdesk/tickets");

    await expect(page.getByPlaceholder(/Search ticket title/i)).toBeVisible();
    await expect(page.getByLabel(/Filter by status/i)).toBeVisible();
    await expect(page.getByLabel(/Filter by priority/i)).toBeVisible();
  });

  test("renders all 5 fixture tickets by default", async ({ page }) => {
    await page.goto("/helpdesk/tickets");
    // Wait for the first row's ticket_number badge to appear
    await expect(page.getByText("TKT-2026-01001")).toBeVisible();
    await expect(page.getByText("TKT-2026-01002")).toBeVisible();
    await expect(page.getByText("TKT-2026-01003")).toBeVisible();
    await expect(page.getByText("TKT-2026-01004")).toBeVisible();
    await expect(page.getByText("TKT-2026-01005")).toBeVisible();
  });

  test("status filter narrows to in_progress tickets", async ({ page }) => {
    await page.goto("/helpdesk/tickets");
    await page.getByLabel(/Filter by status/i).selectOption("in_progress");
    // Mock fixtures: 1001 and 1004 are in_progress
    await expect(page.getByText("TKT-2026-01001")).toBeVisible();
    await expect(page.getByText("TKT-2026-01004")).toBeVisible();
    // 1003 is resolved — should not appear
    await expect(page.getByText("TKT-2026-01003")).not.toBeVisible();
  });

  test("priority filter narrows to critical tickets", async ({ page }) => {
    await page.goto("/helpdesk/tickets");
    await page.getByLabel(/Filter by priority/i).selectOption("critical");
    // Only 1004 is critical in fixtures
    await expect(page.getByText("TKT-2026-01004")).toBeVisible();
    await expect(page.getByText("TKT-2026-01001")).not.toBeVisible();
    await expect(page.getByText("TKT-2026-01005")).not.toBeVisible();
  });

  test("search by ticket_number prefix narrows results", async ({ page }) => {
    await page.goto("/helpdesk/tickets");
    await page.getByPlaceholder(/Search ticket title/i).fill("01004");
    await expect(page.getByText("TKT-2026-01004")).toBeVisible();
    await expect(page.getByText("TKT-2026-01001")).not.toBeVisible();
  });

  test("search by title fragment narrows results", async ({ page }) => {
    await page.goto("/helpdesk/tickets");
    await page.getByPlaceholder(/Search ticket title/i).fill("VPN");
    await expect(page.getByText("TKT-2026-01001")).toBeVisible();
    // Other titles don't contain VPN
    await expect(page.getByText("TKT-2026-01005")).not.toBeVisible();
  });

  test("clicking a row navigates to ticket detail", async ({ page }) => {
    await page.goto("/helpdesk/tickets");
    // Click the row containing TKT-2026-01002
    await page.getByText("TKT-2026-01002").click();
    await expect(page).toHaveURL(/\/helpdesk\/tickets\/1002$/);
  });

  test("FeatureGate fallback renders when helpdesk.enabled=false", async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    // Re-stub feature-flags to disable helpdesk
    await page.route("**/api/proxy/feature-flags/**", async (route) => {
      const key = decodeURIComponent(route.request().url().split("/").pop() ?? "");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          key,
          enabled: key === "helpdesk.enabled" ? false : true,
          source: "system",
        }),
      });
    });
    await page.goto("/helpdesk/tickets");
    await expect(page.getByText(/Helpdesk not enabled/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Search ticket title/i)).not.toBeVisible();
  });
});
