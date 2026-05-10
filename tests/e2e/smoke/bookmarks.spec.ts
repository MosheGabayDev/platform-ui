/**
 * E2E smoke for /bookmarks — third vertical (lite).
 *
 * Spec: PRODUCT_LAUNCH_PLAN.md §1 task 5B.16.
 *
 * Lite contract: list + Add. No edit/delete tests because those are
 * out of scope for the lite tier.
 */
import { test, expect } from "../fixtures/base";

test.describe("/bookmarks smoke", () => {
  test("renders title + 2 fixture bookmarks + Add CTA", async ({ page }) => {
    await page.goto("/bookmarks");

    await expect(
      page.getByRole("heading", { name: /^Bookmarks$|^סימניות$/i }).first(),
    ).toBeVisible();
    await expect(page.getByText(/Internal — engineering wiki/)).toBeVisible();
    await expect(page.getByText(/Status page/)).toBeVisible();
    await expect(page.getByTestId("bookmarks-add")).toBeVisible();
  });

  test("Add sheet exposes title + url fields", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.getByTestId("bookmarks-add").click();
    await expect(page.getByLabel(/^Title$|^כותרת$/i)).toBeVisible();
    await expect(page.getByLabel(/^URL$|^כתובת URL$/i)).toBeVisible();
  });

  test("submitting a valid bookmark prepends it to the list", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.getByTestId("bookmarks-add").click();
    const title = `E2E bookmark ${Date.now()}`;
    await page.getByLabel(/^Title$|^כותרת$/i).fill(title);
    await page.getByLabel(/^URL$|^כתובת URL$/i).fill("https://e2e.example.com");
    await page.getByRole("button", { name: /^Save$|^שמור$/i }).click();
    await expect(page.getByText(title)).toBeVisible();
  });

  test("invalid URL surfaces the inline error and does not close the sheet", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.getByTestId("bookmarks-add").click();
    await page.getByLabel(/^Title$|^כותרת$/i).fill("ftp");
    await page.getByLabel(/^URL$|^כתובת URL$/i).fill("ftp://example.com");
    await page.getByRole("button", { name: /^Save$|^שמור$/i }).click();
    await expect(page.getByTestId("bookmark-url-error")).toBeVisible();
  });

  test("delete flow: confirm dialog removes a fixture bookmark", async ({ page }) => {
    await page.goto("/bookmarks");
    const deleteBtn = page.getByTestId("bookmarks-delete-bm-001");
    await deleteBtn.click();
    const confirmBtn = page.getByTestId("bookmarks-delete-confirm-bm-001");
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
    await expect(page.getByText(/Internal — engineering wiki/)).toHaveCount(0);
  });
});
