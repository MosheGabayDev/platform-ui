/**
 * E2E smoke for /helpdesk/approvals (Phase C — PlatformApprovalFlow).
 */
import { test, expect } from "../fixtures/base";

test.describe("Helpdesk approvals page", () => {
  test("renders KPI banner + filters + DataTable", async ({ page }) => {
    await page.goto("/helpdesk/approvals");
    await expect(page.getByText(/^Pending$/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/Search tool name/i)).toBeVisible();
    await expect(page.getByLabel(/Filter by status/i)).toBeVisible();
  });

  test("default filter is pending_approval — shows 3 fixture pending entries", async ({ page }) => {
    await page.goto("/helpdesk/approvals");
    // Three pending tools in fixtures
    await expect(page.getByText("deactivate_user")).toBeVisible();
    await expect(page.getByText("ticket.bulk_reassign")).toBeVisible();
    await expect(page.getByText("execute_remote_command")).toBeVisible();
  });

  test("Approve + Reject buttons render only on pending rows", async ({ page }) => {
    await page.goto("/helpdesk/approvals");
    // Default filter shows only pending; both buttons should appear at least once
    await expect(page.getByRole("button", { name: /^Approve$/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Reject$/i }).first()).toBeVisible();
  });

  test("status filter narrows to rejected entries", async ({ page }) => {
    await page.goto("/helpdesk/approvals");
    await page.getByLabel(/Filter by status/i).selectOption("rejected");
    await expect(page.getByText("drop_database_table")).toBeVisible();
    // Pending entries should NOT appear
    await expect(page.getByText("deactivate_user")).not.toBeVisible();
  });

  test("status filter to approved shows the approved entry", async ({ page }) => {
    await page.goto("/helpdesk/approvals");
    await page.getByLabel(/Filter by status/i).selectOption("approved");
    await expect(page.getByText("send_notification")).toBeVisible();
  });

  test("risk badges visible (Critical for execute_remote_command)", async ({ page }) => {
    await page.goto("/helpdesk/approvals");
    // execute_remote_command has risk_level=critical
    await expect(page.getByText(/^Critical$/i).first()).toBeVisible();
  });

  test("search by tool name fragment narrows results", async ({ page }) => {
    await page.goto("/helpdesk/approvals");
    await page.getByPlaceholder(/Search tool name/i).fill("bulk");
    await expect(page.getByText("ticket.bulk_reassign")).toBeVisible();
    await expect(page.getByText("deactivate_user")).not.toBeVisible();
  });
});
