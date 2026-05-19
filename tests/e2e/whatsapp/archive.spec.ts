/**
 * E2E smoke for /whatsapp — owner-scoped chat archive list.
 * Closes E2E_COVERAGE.md §archive (batch 165).
 */
import { test, expect } from "../fixtures/base";

test.describe("/whatsapp archive smoke", () => {
  test("renders title, search input, and 3 kind filters", async ({ page }) => {
    await page.goto("/whatsapp");
    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toBeVisible();
    await expect(page.getByTestId("whatsapp-chat-search")).toBeVisible();
    await expect(page.getByTestId("whatsapp-kind-all")).toBeVisible();
    await expect(page.getByTestId("whatsapp-kind-private")).toBeVisible();
    await expect(page.getByTestId("whatsapp-kind-group")).toBeVisible();
  });

  test("kind filter narrows to groups only", async ({ page }) => {
    await page.goto("/whatsapp");
    // Fixture has 1 group ("Ops handoff") + 1 group ("Shared escalation"
    // shared-in) + 2 private. Click the group filter.
    await page.getByTestId("whatsapp-kind-group").click();
    await expect(page.getByText(/Ops handoff/i)).toBeVisible();
    // Private chat names should be filtered out — Dana Levi is private.
    await expect(page.getByText("Dana Levi")).not.toBeVisible();
  });

  test("search filters by display name", async ({ page }) => {
    await page.goto("/whatsapp");
    await page.getByTestId("whatsapp-chat-search").fill("Dana");
    await expect(page.getByText("Dana Levi")).toBeVisible();
    // Other names should not be visible.
    await expect(page.getByText("Ops handoff")).not.toBeVisible();
  });

  test("RTL viewport mobile-S has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/whatsapp");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    // Some browsers report 1px sub-pixel rounding — accept ≤ 2px.
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
