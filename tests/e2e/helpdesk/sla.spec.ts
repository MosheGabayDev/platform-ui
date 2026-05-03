/**
 * E2E smoke for /helpdesk/sla.
 */
import { test, expect } from "../fixtures/base";

test.describe("Helpdesk SLA page", () => {
  test("renders 4 KPI tiles + 4 policies + compliance breakdown", async ({ page }) => {
    await page.goto("/helpdesk/sla");

    // KPI tiles
    await expect(page.getByText(/^Overall$/i)).toBeVisible();
    await expect(page.getByText(/Response SLA/i).first()).toBeVisible();
    await expect(page.getByText(/Resolution SLA/i).first()).toBeVisible();
    await expect(page.getByText(/Active breaches/i)).toBeVisible();

    // 4 policy names
    await expect(page.getByText(/Critical incident — 24\/7/i)).toBeVisible();
    await expect(page.getByText(/High priority — business hours/i)).toBeVisible();
    await expect(page.getByText(/Standard — business hours/i)).toBeVisible();
    await expect(page.getByText(/Low priority — best effort/i)).toBeVisible();

    // Compliance breakdown section
    await expect(page.getByText(/Compliance by priority/i)).toBeVisible();
  });

  test("Default badge appears next to the standard policy", async ({ page }) => {
    await page.goto("/helpdesk/sla");
    await expect(page.getByText(/^Default$/i)).toBeVisible();
  });

  test("policies table shows 24/7 marker for P1 policy", async ({ page }) => {
    await page.goto("/helpdesk/sla");
    await expect(page.getByText(/24\/7/i).first()).toBeVisible();
  });

  test("response/resolution time formatting (e.g. 15m, 4h, 1d)", async ({ page }) => {
    await page.goto("/helpdesk/sla");
    // P1 critical: 15m response, 4h resolution
    await expect(page.getByText("15m")).toBeVisible();
    await expect(page.getByText("4h")).toBeVisible();
  });
});
