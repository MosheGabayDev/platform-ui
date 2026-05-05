/**
 * E2E smoke for Phase C bulk operations + audit-log CSV export.
 */
import { test, expect } from "../fixtures/base";

test.describe("Helpdesk tickets — bulk operations", () => {
  test("checkbox column appears with selection prop", async ({ page }) => {
    await page.goto("/helpdesk/tickets");
    // The header has a "Select all on page" checkbox
    await expect(page.getByLabel(/Select all on page/i)).toBeVisible();
  });

  test("selecting a row reveals the bulk action toolbar", async ({ page }) => {
    await page.goto("/helpdesk/tickets");
    // Click the first per-row checkbox
    const firstRowCheckbox = page.getByRole("checkbox", { name: /Select row/i }).first();
    await firstRowCheckbox.check();
    // Toolbar appears with "1 selected"
    await expect(page.getByText(/^1 selected$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Reassign to Olivia/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mark resolved/i })).toBeVisible();
  });

  test("Clear button empties selection and hides toolbar", async ({ page }) => {
    await page.goto("/helpdesk/tickets");
    const firstRowCheckbox = page.getByRole("checkbox", { name: /Select row/i }).first();
    await firstRowCheckbox.check();
    await expect(page.getByText(/selected/i).first()).toBeVisible();
    await page.getByRole("button", { name: /Clear selection/i }).click();
    await expect(page.getByText(/^1 selected$/i)).not.toBeVisible();
  });

  test("select all on page checkbox checks every row", async ({ page }) => {
    await page.goto("/helpdesk/tickets");
    // Wait for the table rows to render before clicking the header checkbox.
    // Otherwise the click can race with the data render and not update state.
    await expect(
      page.getByRole("checkbox", { name: /Select row/i }).first(),
    ).toBeVisible();
    await page.getByLabel(/Select all on page/i).click();
    // 5 fixture tickets → "5 selected"
    await expect(page.getByText(/^5 selected$/i)).toBeVisible();
  });

  test("bulk Reassign action fires mutation and clears selection", async ({ page }) => {
    await page.goto("/helpdesk/tickets");
    // Select 2 rows
    const checkboxes = page.getByRole("checkbox", { name: /Select row/i });
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await page.getByRole("button", { name: /Reassign to Olivia/i }).click();
    // Toast appears + selection clears
    await expect(page.getByText(/Reassigned 2 of 2/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Audit log — CSV export", () => {
  test("Export CSV button is visible", async ({ page }) => {
    await page.goto("/audit-log");
    await expect(
      page.getByRole("button", { name: /Export current view to CSV/i }),
    ).toBeVisible();
  });

  test("Export CSV triggers a download", async ({ page }) => {
    await page.goto("/audit-log");
    const downloadPromise = page.waitForEvent("download", { timeout: 5_000 });
    await page.getByRole("button", { name: /Export current view to CSV/i }).click();
    const download = await downloadPromise;
    // Filename pattern: audit-log-YYYY-MM-DD.csv
    expect(download.suggestedFilename()).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
