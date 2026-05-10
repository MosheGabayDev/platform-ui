/**
 * E2E smoke for platform-admin list pages: /users, /roles,
 * /organizations, and /data-sources stub.
 *
 * Caught by batch 42 audit (`scripts/test-coverage-audit.mjs`):
 * these pages had neither a vitest page-level test nor an E2E
 * spec. Smoke specs are the cheapest way to close the gap —
 * verify the page renders and a key element is visible. Domain
 * behavior (CRUD, filters) stays in higher-level specs as needed.
 */
import { test, expect } from "../fixtures/base";

test.describe("/users smoke", () => {
  test("renders users list page", async ({ page }) => {
    await page.goto("/users");
    await expect(
      page.getByRole("heading", { name: /Users|משתמשים/i }).first(),
    ).toBeVisible();
  });
});

test.describe("/roles smoke", () => {
  test("renders roles list page", async ({ page }) => {
    await page.goto("/roles");
    await expect(
      page.getByRole("heading", { name: /Roles|תפקידים/i }).first(),
    ).toBeVisible();
  });
});

test.describe("/organizations smoke", () => {
  test("renders organizations list page", async ({ page }) => {
    await page.goto("/organizations");
    await expect(
      page.getByRole("heading", { name: /Organizations|ארגונים/i }).first(),
    ).toBeVisible();
  });
});

test.describe("/data-sources smoke", () => {
  test("renders the FeatureGate fallback when data_sources.enabled is off", async ({
    page,
  }) => {
    // The base fixture mocks all flags as enabled (option default).
    // Override this one to false so we exercise the fallback path
    // — the stub's "module disabled" empty state.
    await page.route("**/api/proxy/feature-flags/data_sources.enabled", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          key: "data_sources.enabled",
          enabled: false,
          source: "system",
        }),
      });
    });
    await page.goto("/data-sources");
    await expect(
      page.getByText(/not enabled|לא מופעלים/i).first(),
    ).toBeVisible();
  });

  test("renders the coming-soon panel when the flag is enabled", async ({
    page,
  }) => {
    await page.goto("/data-sources");
    await expect(
      page.getByText(/Coming soon|בקרוב/i).first(),
    ).toBeVisible();
  });
});
