/**
 * E2E smoke for /helpdesk/technicians.
 */
import { test, expect } from "../fixtures/base";

test.describe("Helpdesk technicians page", () => {
  test("renders KPI tiles + 3 fixture technicians", async ({ page }) => {
    await page.goto("/helpdesk/technicians");

    // 3 KPI tiles
    await expect(page.getByText(/Total$/i).first()).toBeVisible();
    await expect(page.getByText(/Available now/i)).toBeVisible();
    await expect(page.getByText(/Avg utilization/i)).toBeVisible();

    // 3 fixture technicians
    await expect(page.getByText("Tech Tim")).toBeVisible();
    await expect(page.getByText("OnCall Olivia")).toBeVisible();
    await expect(page.getByText("Help Hilda")).toBeVisible();
  });

  test("availability badge differentiates available vs off-shift", async ({ page }) => {
    await page.goto("/helpdesk/technicians");
    // Help Hilda is off-shift in fixtures
    const offShift = page.getByText(/Off-shift/i);
    await expect(offShift).toBeVisible();
    // At least one Available badge for the other two
    const available = page.getByText(/Available$/i).first();
    await expect(available).toBeVisible();
  });

  test("skill chips render for at least one technician", async ({ page }) => {
    await page.goto("/helpdesk/technicians");
    // Tech Tim's first skill
    await expect(page.getByText("VPN").first()).toBeVisible();
  });
});
