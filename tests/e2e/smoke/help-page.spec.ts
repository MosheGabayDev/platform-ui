/**
 * E2E smoke for the /help surface (Phase 3.3).
 */
import { test, expect } from "../fixtures/base";

test.describe("Help page — Phase 3.3", () => {
  test("renders header, search box, and tabs", async ({ page }) => {
    await page.goto("/help");
    await expect(
      page.getByRole("heading", { name: /^Help & documentation$/i }),
    ).toBeVisible();
    await expect(page.getByTestId("help-search-input")).toBeVisible();
    await expect(page.getByTestId("help-tab-all")).toBeVisible();
    await expect(page.getByTestId("help-tab-quick-start")).toBeVisible();
    await expect(page.getByTestId("help-tab-ai-cheatsheet")).toBeVisible();
    await expect(page.getByTestId("help-tab-shortcuts")).toBeVisible();
  });

  test("All tab shows quick starts, AI shortcuts, and keyboard shortcuts", async ({ page }) => {
    await page.goto("/help");
    await expect(page.getByTestId("doc-article-quick-start-helpdesk")).toBeVisible();
    await expect(page.getByTestId("ai-shortcut-helpdesk.ticket.take")).toBeVisible();
    await expect(page.getByText(/^Keyboard shortcuts$/i)).toBeVisible();
  });

  test("search filters down to a known phrase", async ({ page }) => {
    await page.goto("/help");
    await page.getByTestId("help-search-input").fill("take ticket");
    // The matching AI shortcut row stays visible.
    await expect(page.getByTestId("ai-shortcut-helpdesk.ticket.take")).toBeVisible();
    // An unrelated article (billing) should be hidden.
    await expect(page.getByTestId("doc-article-quick-start-billing")).toHaveCount(0);
  });

  test("quick-start tab hides AI shortcut rows", async ({ page }) => {
    await page.goto("/help");
    await page.getByTestId("help-tab-quick-start").click();
    await expect(page.getByTestId("doc-article-quick-start-helpdesk")).toBeVisible();
    await expect(page.getByTestId("ai-shortcut-helpdesk.ticket.take")).toHaveCount(0);
  });

  test("nonsense query shows the empty-state message", async ({ page }) => {
    await page.goto("/help");
    await page.getByTestId("help-search-input").fill("zzzz-no-match-zzzz");
    await expect(page.getByText(/No results for/i)).toBeVisible();
  });
});
