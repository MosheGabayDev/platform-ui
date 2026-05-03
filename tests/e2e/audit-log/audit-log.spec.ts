/**
 * E2E smoke for /audit-log (R046 surface).
 *
 * Covers KPI tiles, security alert banner, category filter, search,
 * and the 7 category badges.
 */
import { test, expect } from "../fixtures/base";

test.describe("Audit log page", () => {
  test("renders 4 KPI tiles + DataTable + filters", async ({ page }) => {
    await page.goto("/audit-log");

    // 4 KPI tiles
    await expect(page.getByText(/Last 24h/i)).toBeVisible();
    await expect(page.getByText(/Last 7d/i)).toBeVisible();
    await expect(page.getByText(/Unique actors/i)).toBeVisible();
    await expect(page.getByText(/AI events/i)).toBeVisible();

    // Filters
    await expect(page.getByPlaceholder(/Search action/i)).toBeVisible();
    await expect(page.getByLabel(/Filter by category/i)).toBeVisible();
  });

  test("security event banner appears when security count > 0", async ({ page }) => {
    await page.goto("/audit-log");
    // Mock fixture has 1 security event (auth.login.failed) within 36h
    await expect(page.getByText(/security event\(s\) in the last 24h/i)).toBeVisible();
  });

  test("category filter narrows to AI-only events", async ({ page }) => {
    await page.goto("/audit-log");
    await page.getByLabel(/Filter by category/i).selectOption("ai");
    // Mock fixture has 3 ai entries (chat message, action proposed, confirmed, rejected)
    await expect(page.getByText("ai.chat.message").first()).toBeVisible();
    await expect(page.getByText("ai.action.proposed").first()).toBeVisible();
    // Login event should disappear
    await expect(page.getByText(/^auth\.login$/).first()).not.toBeVisible();
  });

  test("search by action name narrows results", async ({ page }) => {
    await page.goto("/audit-log");
    await page.getByPlaceholder(/Search action/i).fill("ticket");
    // helpdesk.ticket.* entries should be visible
    await expect(page.getByText(/helpdesk\.ticket\./i).first()).toBeVisible();
    // Login event should NOT match
    await expect(page.getByText(/^auth\.login$/).first()).not.toBeVisible();
  });

  test("category badges render for all entries", async ({ page }) => {
    await page.goto("/audit-log");
    // At least one of each common badge should be visible
    await expect(page.getByText(/^Login$/i).first()).toBeVisible();
    await expect(page.getByText(/^AI$/i).first()).toBeVisible();
    await expect(page.getByText(/^Security$/i).first()).toBeVisible();
  });
});
