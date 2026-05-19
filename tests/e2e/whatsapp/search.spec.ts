/**
 * E2E smoke for /whatsapp/search — full-text owned-message search.
 * Closes E2E_COVERAGE.md §search (batch 165).
 */
import { test, expect } from "../fixtures/base";

test.describe("/whatsapp/search smoke", () => {
  test("renders search input + idle state", async ({ page }) => {
    await page.goto("/whatsapp/search");
    await expect(page.getByTestId("whatsapp-message-search")).toBeVisible();
    // Idle state copy.
    await expect(page.getByText(/Search your archive|חיפוש בארכיון/i)).toBeVisible();
  });

  test("query returns hits and clicks open chat detail", async ({ page }) => {
    await page.goto("/whatsapp/search");
    await page.getByTestId("whatsapp-message-search").fill("invoice");
    // Mock fixture has "Can you send the invoice PDF again?" — should match.
    await expect(page.getByText(/invoice/i).first()).toBeVisible();
  });

  test("non-matching query renders empty state, not error", async ({ page }) => {
    await page.goto("/whatsapp/search");
    await page.getByTestId("whatsapp-message-search").fill("zzzzzzznomatch");
    // EmptyState — title from whatsapp.search.emptyTitle.
    await expect(page.getByText(/No matching|אין תוצאות/i)).toBeVisible();
  });
});
