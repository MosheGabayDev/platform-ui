/**
 * E2E smoke for AI-shell-A (Stories 1.3, 1.4, 1.5).
 *
 * Verifies:
 *   1.3 — FAB visible on every authenticated dashboard page
 *   1.4 — Click opens drawer; drawer closes via escape
 *   1.5 — Drawer state survives navigation
 *
 * Spec: implementation-artifacts/stories/AI-shell-A-1.{3,4,5}.md
 */
import { test, expect } from "@playwright/test";
import { signIn } from "../helpers/auth";

test.describe("AI shell — FAB + drawer", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("FAB renders on dashboard, users, orgs, roles", async ({ page }) => {
    for (const route of ["/", "/users", "/organizations", "/roles"]) {
      await page.goto(route);
      const fab = page.getByRole("button", { name: /open ai assistant/i });
      await expect(fab).toBeVisible();
    }
  });

  test("clicking FAB opens drawer; escape closes it", async ({ page }) => {
    await page.goto("/");
    const fab = page.getByRole("button", { name: /open ai assistant/i });
    await fab.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/AI assistant coming soon/i);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(fab).toBeVisible();
  });

  test("drawer state persists across navigation (Story 1.5)", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: /open ai assistant/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Navigate to another route
    await page.goto("/organizations");

    // Drawer should still be open
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
