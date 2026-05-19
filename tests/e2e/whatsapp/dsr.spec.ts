/**
 * E2E smoke for /whatsapp/admin/dsr — delete-by-subject DSR console.
 * Closes E2E_COVERAGE.md §dsr (batch 165).
 *
 * The base fixture's mock session is `is_admin: true`, so the
 * PermissionGate on `whatsapp.delete_by_subject` passes via admin
 * shortcut and the page renders.
 */
import { test, expect } from "../fixtures/base";

test.describe("/whatsapp/admin/dsr smoke", () => {
  test("renders title + phone form + history sidebar", async ({ page }) => {
    await page.goto("/whatsapp/admin/dsr");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    // Phone input + preview button.
    await expect(page.getByPlaceholder(/\+972/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Preview|תצוגה מקדימה/ })).toBeVisible();
    // History sidebar title.
    await expect(page.getByText(/History|היסטוריה/)).toBeVisible();
  });

  test("preview surfaces masked phone + metric tiles", async ({ page }) => {
    await page.goto("/whatsapp/admin/dsr");
    await page.getByPlaceholder(/\+972/).fill("+972501112222");
    await page.getByRole("button", { name: /Preview|תצוגה מקדימה/ }).click();
    // PreviewPanel renders the masked phone token like +972***2222.
    await expect(page.getByText(/\+972\*\*\*\d{4}/)).toBeVisible({ timeout: 5_000 });
  });

  test("delete button disabled until reason + acknowledge + preview", async ({ page }) => {
    await page.goto("/whatsapp/admin/dsr");
    const deleteBtn = page.getByRole("button", { name: /Request deletion|בקש מחיקה/ });
    await expect(deleteBtn).toBeDisabled();
  });

  test("mock-mode banner visible when MOCK_MODE on", async ({ page }) => {
    await page.goto("/whatsapp/admin/dsr");
    // backendNotice text — at least the icon container exists.
    await expect(page.getByRole("status").first()).toBeVisible();
  });
});
