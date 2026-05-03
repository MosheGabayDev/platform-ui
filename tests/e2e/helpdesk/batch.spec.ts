/**
 * E2E smoke for Phase C batch tasks queue.
 */
import { test, expect } from "../fixtures/base";

test.describe("Helpdesk batch tasks", () => {
  test("page renders KPI banner + task list", async ({ page }) => {
    await page.goto("/helpdesk/batch");
    await expect(
      page.getByRole("heading", { name: /^Batch tasks$/i }),
    ).toBeVisible();
    await expect(page.getByText(/^Running$/i).first()).toBeVisible();
    await expect(page.getByText(/^Queued$/i).first()).toBeVisible();
    // The running fixture's label should appear
    await expect(
      page.getByText(/Reassign 14 tickets to OnCall Olivia/i),
    ).toBeVisible();
  });

  test("status filter narrows to succeeded only", async ({ page }) => {
    await page.goto("/helpdesk/batch");
    await page.getByLabel(/Filter by status/i).selectOption("succeeded");
    await expect(
      page.getByText(/Export Q1 resolved tickets to CSV/i),
    ).toBeVisible();
    // Running fixture should disappear
    await expect(
      page.getByText(/Reassign 14 tickets to OnCall Olivia/i),
    ).not.toBeVisible();
  });

  test("succeeded export task exposes a Download link", async ({ page }) => {
    await page.goto("/helpdesk/batch");
    await page.getByLabel(/Filter by status/i).selectOption("succeeded");
    await expect(
      page.getByLabel(/Download artifact for batch task 7003/i),
    ).toBeVisible();
  });

  test("partial-status filter expands failure details", async ({ page }) => {
    await page.goto("/helpdesk/batch");
    await page.getByLabel(/Filter by status/i).selectOption("partial");
    // The expandable <details> summary appears
    await expect(
      page.getByText(/Sweep close 18 onboarding tickets older than 30d/i),
    ).toBeVisible();
    await expect(page.getByText(/3 item failures/i)).toBeVisible();
  });
});
