/**
 * E2E smoke for /admin/feedback — pilot feedback aggregator.
 *
 * Spec: PRODUCT_LAUNCH_PLAN.md §7 task 10.05.
 *
 * Mock session has system_admin role so the Add button is visible.
 * 3 fixture items render via the cap-A localStorage shim.
 */
import { test, expect } from "../fixtures/base";

test.describe("/admin/feedback smoke", () => {
  test("renders title + intro + 3 fixture items + Add button", async ({ page }) => {
    await page.goto("/admin/feedback");
    await expect(
      page.getByRole("heading", { name: /Customer feedback|משוב לקוחות/i }),
    ).toBeVisible();
    // Mock-mode banner
    await expect(page.getByText(/Linear|דמו/).first()).toBeVisible();
    // Fixture items reveal type badges
    await expect(page.getByText(/^Bug$|^באג$/i).first()).toBeVisible();
    await expect(page.getByText(/^Feature$|^תכונה$/i).first()).toBeVisible();
    await expect(page.getByText(/^Insight$|^תובנה$/i).first()).toBeVisible();
    // Add button — system_admin only
    await expect(page.getByTestId("feedback-add")).toBeVisible();
  });

  test("clicking Add opens the sheet form with required fields", async ({ page }) => {
    await page.goto("/admin/feedback");
    await page.getByTestId("feedback-add").click();
    await expect(
      page.getByRole("heading", { name: /Add new feedback|הוספת משוב חדש/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/Source|מקור/i)).toBeVisible();
    await expect(page.getByLabel(/Type|סיווג/i)).toBeVisible();
    await expect(page.getByLabel(/Feedback content|תוכן המשוב/i)).toBeVisible();
  });

  test("submitting a new feedback item adds it to the top of the list", async ({ page }) => {
    await page.goto("/admin/feedback");
    await page.getByTestId("feedback-add").click();
    const content = `E2E smoke test ${Date.now()}`;
    await page.getByLabel(/Source|מקור/i).fill("e2e");
    await page.getByLabel(/Feedback content|תוכן המשוב/i).fill(content);
    // Save button text varies per locale — match the form's submit button.
    await page.getByRole("button", { name: /^Save$|^שמור$/i }).click();
    await expect(page.getByText(content)).toBeVisible();
  });
});
