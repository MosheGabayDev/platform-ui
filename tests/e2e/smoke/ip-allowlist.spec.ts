/**
 * E2E smoke for /admin/ip-allowlist — Enterprise tier feature.
 *
 * Spec: PRODUCT_LAUNCH_PLAN.md §6 task 9.06.
 *
 * The page wraps in <FeatureGate flag="ip_allowlist.enabled">. We use
 * the base fixture's flagOverrides to enable the gate and exercise the
 * editor; without override we should see the upgrade nudge.
 */
import { test, expect } from "../fixtures/base";

test.describe("/admin/ip-allowlist smoke", () => {
  test.describe("when ip_allowlist.enabled flag is OFF (Free / Pro tier)", () => {
    // Base fixture defaults all unknown flags to TRUE — explicitly disable
    // here so we hit the upgrade-nudge code path.
    test.use({ flagOverrides: { "ip_allowlist.enabled": false } });

    test("shows upgrade nudge linking to /billing", async ({ page }) => {
      await page.goto("/admin/ip-allowlist");
      await expect(
        page.getByRole("heading", { name: /IP Allowlist|רשימת IP/i }),
      ).toBeVisible();
      const upgrade = page.getByRole("link", { name: /Upgrade|שדרג/i });
      await expect(upgrade).toBeVisible();
      await expect(upgrade).toHaveAttribute("href", "/billing");
    });
  });

  test.describe("when ip_allowlist.enabled flag is on (Enterprise)", () => {
    test.use({ flagOverrides: { "ip_allowlist.enabled": true } });

    test("shows the editor with input + Add button", async ({ page }) => {
      await page.goto("/admin/ip-allowlist");
      await expect(page.getByTestId("cidr-input")).toBeVisible();
      await expect(page.getByTestId("cidr-add")).toBeVisible();
      // Empty state until first add
      await expect(
        page.getByText(/All IPs allowed|כל ה-IPs מותרים/i),
      ).toBeVisible();
    });

    test("invalid CIDR surfaces error message; valid one adds + can be removed", async ({ page }) => {
      await page.goto("/admin/ip-allowlist");
      // Invalid first
      await page.getByTestId("cidr-input").fill("not-a-cidr");
      await page.getByTestId("cidr-add").click();
      await expect(page.getByText(/Invalid CIDR|CIDR לא תקין/i)).toBeVisible();
      // Valid one
      await page.getByTestId("cidr-input").fill("10.0.0.0/8");
      await page.getByTestId("cidr-add").click();
      await expect(page.getByText("10.0.0.0/8")).toBeVisible();
      // Remove via trash icon (first row index 0)
      await page.getByTestId("cidr-remove-0").click();
      await expect(page.getByText("10.0.0.0/8")).not.toBeVisible();
    });
  });
});
