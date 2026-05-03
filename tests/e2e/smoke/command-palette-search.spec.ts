/**
 * E2E smoke for PlatformSearch (cap 11) integration in the command palette.
 */
import { test, expect } from "../fixtures/base";

test.describe("Command palette — global search", () => {
  test("Ctrl+K opens palette with nav groups visible", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+K");
    await expect(page.getByPlaceholder(/חפש דף, כרטיס/)).toBeVisible();
    // Hebrew nav heading "ניווט" is shown when no search is active
    await expect(page.getByText("ניווט", { exact: true }).first()).toBeVisible();
  });

  test("typing a query shows search results grouped by type", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+K");
    const input = page.getByPlaceholder(/חפש דף, כרטיס/);
    await input.fill("VPN");
    // Wait past the 200ms debounce + mock 60ms latency
    await expect(page.getByText("כרטיסים")).toBeVisible({ timeout: 2_000 });
    await expect(
      page.getByText(/VPN clients failing handshake/i),
    ).toBeVisible();
    await expect(page.getByText("בסיס ידע")).toBeVisible();
  });

  test("selecting a search result navigates to its href", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+K");
    await page.getByPlaceholder(/חפש דף, כרטיס/).fill("VPN");
    await expect(
      page.getByText(/VPN clients failing handshake/i),
    ).toBeVisible({ timeout: 2_000 });
    await page.getByText(/VPN clients failing handshake/i).click();
    await expect(page).toHaveURL(/\/helpdesk\/tickets\/1004/);
  });

  test("nav groups hide while a search is active", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+K");
    await page.getByPlaceholder(/חפש דף, כרטיס/).fill("VPN");
    await expect(page.getByText("כרטיסים")).toBeVisible({ timeout: 2_000 });
    // The "ניווט" heading from the nav groups should NOT be visible while
    // search results are shown.
    await expect(page.getByText("ניווט", { exact: true })).not.toBeVisible();
  });
});
