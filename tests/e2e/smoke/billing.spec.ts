/**
 * E2E smoke for /billing — plan tier + usage + invoices + chart.
 *
 * Spec: PRODUCT_LAUNCH_PLAN.md §3 tasks 6.05 + 6.11.
 *
 * Asserts:
 *   - Plan tier badge renders (mock org is "pro")
 *   - 3 usage gauges visible (tokens / api_calls / seats) with progressbar role
 *   - Invoices table has at least one row
 *   - Usage chart card mounts (after rAF)
 *   - "Manage payment" button is disabled in mock-mode (portal_url null)
 */
import { test, expect } from "../fixtures/base";

test.describe("/billing smoke", () => {
  test("renders title + plan tier + monthly price", async ({ page }) => {
    await page.goto("/billing");
    await expect(page.getByRole("heading", { name: /Billing|חיוב/i })).toBeVisible();
    // Mock org is on Pro tier per lib/api/billing.ts MOCK_OVERVIEW.
    await expect(page.getByText(/^Pro$|^מקצועי$/i).first()).toBeVisible();
    await expect(page.getByText(/\$99/)).toBeVisible();
  });

  test("renders 3 usage progressbar gauges", async ({ page }) => {
    await page.goto("/billing");
    const bars = page.getByRole("progressbar");
    await expect(bars).toHaveCount(3);
  });

  test("renders the invoices table with at least one row + paid status", async ({ page }) => {
    await page.goto("/billing");
    await expect(page.getByText(/Paid|שולם/i).first()).toBeVisible();
  });

  test("Manage payment CTA is disabled in mock-mode (portal_url null)", async ({ page }) => {
    await page.goto("/billing");
    const cta = page.getByRole("button", { name: /Manage payment|נהל אמצעי תשלום/i });
    await expect(cta).toBeDisabled();
  });

  test("usage chart mounts after rAF (Recharts ResponsiveContainer)", async ({ page }) => {
    await page.goto("/billing");
    // Wait for the chart container which only appears after rAF + query settle.
    await expect(page.getByTestId("usage-chart")).toBeVisible({ timeout: 5000 });
  });
});
