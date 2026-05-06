/**
 * E2E smoke for the first-AI-conversation onboarding tour (Phase 3.1).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-onboarding-finish-spec.md §6
 */
import { test, expect } from "../fixtures/base";

test.describe("Onboarding tour — Phase 3.1", () => {
  test("/?tour=first-ai shows the first-AI dialog", async ({ page }) => {
    await page.goto("/?tour=first-ai");
    await expect(page.getByTestId("onboarding-tour-dialog")).toBeVisible();
    await expect(page.getByText(/Try your first AI command/i)).toBeVisible();
  });

  test("Skip closes the dialog and removes the query param", async ({ page }) => {
    await page.goto("/?tour=first-ai");
    await page.getByTestId("onboarding-tour-skip").click();
    await expect(page.getByTestId("onboarding-tour-dialog")).toBeHidden();
    await expect(page).toHaveURL(/\/$|\/\?(?!.*tour=)/);
  });

  test("Open AI assistant opens the drawer", async ({ page }) => {
    await page.goto("/?tour=first-ai");
    await page.getByTestId("onboarding-tour-open").click();
    // Drawer surfaces the assistant message-input — wait for it.
    await expect(page.getByPlaceholder(/Ask|message|prompt/i).first()).toBeVisible();
  });
});
