/**
 * E2E smoke for the four core detail pages.
 *
 * Each fixture id is the first row in its mock client; if the fixtures change,
 * update the constants below — that's the contract this spec enforces.
 *
 * Batch 56: shrinks the test-coverage allowlist (batch 55) by 4 routes.
 */
import { test, expect } from "../fixtures/base";

test.describe("Detail pages — smoke", () => {
  test('/users/1 renders user detail header', async ({ page }) => {
    await page.goto("/users/1");
    // DetailHeaderCard renders user.name as <h1>; mock fixture id=1 is "System Admin".
    await expect(page.getByRole("heading", { name: /System Admin/i })).toBeVisible();
    await expect(page.getByText(/admin@/i).first()).toBeVisible();
  });

  test('/organizations/1 renders organization detail header', async ({ page }) => {
    await page.goto("/organizations/1");
    // Mock fixture id=1 → name "Platform Demo Org", slug "demo".
    await expect(page.getByRole("heading", { name: /Platform Demo Org/i })).toBeVisible();
    await expect(page.getByText(/demo/).first()).toBeVisible();
  });

  test('/roles/1 renders role detail header', async ({ page }) => {
    await page.goto("/roles/1");
    // Mock fixture id=1 → name "system_admin".
    await expect(page.getByRole("heading", { name: /system_admin/i })).toBeVisible();
  });

  test('/helpdesk/tickets/1001 renders ticket detail header', async ({ page }) => {
    await page.goto("/helpdesk/tickets/1001");
    // Mock fixture id=1001 → title "VPN connection drops every 30 minutes".
    await expect(page.getByRole("heading", { name: /VPN connection drops/i })).toBeVisible();
    await expect(page.getByText(/TKT-2026-01001/i)).toBeVisible();
  });
});
