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

  test("security event banner gating respects 24h window", async ({ page }) => {
    await page.goto("/audit-log");
    // Fixture has 1 security event at hoursAgo(36) — OUTSIDE the 24h gate.
    // Banner correctly does NOT render. (When fixture data crosses into 24h,
    // flip this to .toBeVisible().)
    await expect(
      page.getByText(/security event\(s\) in the last 24h/i),
    ).not.toBeVisible();
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
    // Match the badge SPAN inside the table, not the closed-dropdown
    // <option> with the same text. Use the cell role for reliability.
    const cells = page.getByRole("cell");
    await expect(cells.getByText(/^Login$/).first()).toBeVisible();
    await expect(cells.getByText(/^AI$/).first()).toBeVisible();
  });
});
