/**
 * E2E smoke for Phase C maintenance windows surface.
 */
import { test, expect } from "../fixtures/base";

test.describe("Helpdesk maintenance windows", () => {
  test("page renders with KPI banner + table", async ({ page }) => {
    await page.goto("/helpdesk/maintenance");
    await expect(
      page.getByRole("heading", { name: /^Maintenance$/i }),
    ).toBeVisible();
    await expect(page.getByText(/^In progress$/i).first()).toBeVisible();
    await expect(page.getByText(/^Upcoming$/i)).toBeVisible();
  });

  test("status filter narrows the table to scheduled-only", async ({ page }) => {
    await page.goto("/helpdesk/maintenance");
    await page.getByLabel(/Filter by status/i).selectOption("scheduled");
    // The In-progress fixture (#9001) should NOT be visible after filter
    await expect(
      page.getByText(/Production firewall ruleset upgrade/i),
    ).not.toBeVisible();
    // At least one scheduled window remains
    await expect(
      page.getByText(/Database failover drill|TLS certificate rotation/i).first(),
    ).toBeVisible();
  });

  test("search matches affected service text", async ({ page }) => {
    await page.goto("/helpdesk/maintenance");
    await page.getByLabel(/Search maintenance windows/i).fill("VPN");
    await expect(
      page.getByText(/Production firewall ruleset upgrade/i),
    ).toBeVisible();
  });

  test("Cancel button is hidden for completed windows", async ({ page }) => {
    await page.goto("/helpdesk/maintenance");
    await page.getByLabel(/Filter by status/i).selectOption("completed");
    // Office switch firmware bump is the completed fixture
    await expect(page.getByText(/Office switch firmware bump/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Cancel maintenance window Office switch/i }),
    ).toHaveCount(0);
  });
});
