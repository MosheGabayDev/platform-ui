/**
 * E2E smoke for /notes — second vertical module that proves the
 * platform plumbing is generic.
 *
 * Spec: PRODUCT_LAUNCH_PLAN.md §1 task 5B.15.
 *
 * Covers the rule §3 floor:
 *   - page renders + key elements visible
 *   - Add-note mutation round-trips and the new note appears
 *   - Delete confirms via dialog and the note disappears
 *
 * Mock session has author_id matching the fixture authors → all 3
 * seeded notes show the delete button.
 */
import { test, expect } from "../fixtures/base";

test.describe("/notes smoke", () => {
  test("renders title + intro + 3 fixture notes + Add button", async ({ page }) => {
    await page.goto("/notes");

    await expect(
      page.getByRole("heading", { name: /^Notes$|^פתקים$/i }).first(),
    ).toBeVisible();

    // Mock-mode banner
    await expect(page.getByRole("status").first()).toBeVisible();

    // Fixture titles
    await expect(page.getByText(/Pilot kickoff agenda/)).toBeVisible();
    await expect(page.getByText(/Q3 OKR draft/)).toBeVisible();
    await expect(page.getByText(/Helpdesk → Notes API parity/)).toBeVisible();

    // Add CTA
    await expect(page.getByTestId("notes-add")).toBeVisible();
  });

  test("Add sheet exposes title + body + tags fields", async ({ page }) => {
    await page.goto("/notes");
    await page.getByTestId("notes-add").click();
    await expect(page.getByLabel(/^Title$|^כותרת$/i)).toBeVisible();
    await expect(page.getByLabel(/^Body$|^תוכן$/i)).toBeVisible();
    await expect(page.getByLabel(/Tags|תגיות/i)).toBeVisible();
  });

  test("submitting a note prepends it to the list", async ({ page }) => {
    await page.goto("/notes");
    await page.getByTestId("notes-add").click();

    const title = `E2E note ${Date.now()}`;
    await page.getByLabel(/^Title$|^כותרת$/i).fill(title);
    await page.getByLabel(/^Body$|^תוכן$/i).fill("Body for the e2e note.");
    await page.getByLabel(/Tags|תגיות/i).fill("e2e, smoke");

    await page.getByRole("button", { name: /^Save$|^שמור$/i }).click();

    await expect(page.getByText(title)).toBeVisible();
    // Tag chip rendered
    await expect(page.getByText("#smoke").first()).toBeVisible();
  });

  test("edit flow: edit Sheet rewrites the note title", async ({ page }) => {
    await page.goto("/notes");
    const editBtn = page.getByTestId("notes-edit-n-002");
    await editBtn.click();
    const newTitle = `Edited ${Date.now()}`;
    // Title field is pre-filled — clear then type.
    const titleField = page.getByLabel(/^Title$|^כותרת$/i);
    await titleField.fill(newTitle);
    await page.getByRole("button", { name: /^Save$|^שמור$/i }).click();
    await expect(page.getByText(newTitle)).toBeVisible();
  });

  test("delete flow: confirm dialog removes the note", async ({ page }) => {
    await page.goto("/notes");

    // Pick the first seeded note's delete button (id = "n-001").
    const deleteBtn = page.getByTestId("notes-delete-n-001");
    await deleteBtn.click();

    // Confirm dialog opens; confirm button has the same data-testid pattern.
    const confirmBtn = page.getByTestId("notes-delete-confirm-n-001");
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await expect(page.getByText(/Pilot kickoff agenda/)).toHaveCount(0);
  });
});
