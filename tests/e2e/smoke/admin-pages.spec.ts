/**
 * E2E smoke for Phase 1 admin pages + onboarding wizard.
 *
 * One spec per admin surface. Goal: page renders, key elements appear,
 * primary mutation path (toggle / save / step-advance) succeeds against
 * the mock client.
 */
import { test, expect } from "../fixtures/base";

test.describe("Admin pages — Phase 1 smoke", () => {
  test("/admin/feature-flags renders categorized flag tree + toggle works", async ({ page }) => {
    await page.goto("/admin/feature-flags");
    await expect(
      page.getByRole("heading", { name: /^Feature flags$/i }),
    ).toBeVisible();
    // Categories render
    await expect(page.getByText(/Resolution order:/i)).toBeVisible();
    // At least one known flag visible
    await expect(page.getByText(/Helpdesk/i).first()).toBeVisible();
    await expect(page.getByText(/AI Agents/i).first()).toBeVisible();
    // Filter pill (use exact match to avoid colliding with sidebar groups
    // and per-row "Enable AI Agents" buttons).
    await expect(
      page.getByRole("button", { name: "AI", exact: true }),
    ).toBeVisible();
  });

  test("/admin/settings renders categorized settings tree + Edit button", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible();
    await expect(page.getByText(/Resolution order:/i)).toBeVisible();
    // At least one Edit button per row
    const editButtons = page.getByRole("button", { name: /Edit|Replace/i });
    await expect(editButtons.first()).toBeVisible();
  });

  test("/admin/modules shows registered modules + KPI banner", async ({ page }) => {
    await page.goto("/admin/modules");
    await expect(page.getByRole("heading", { name: /^Modules$/i })).toBeVisible();
    await expect(page.getByText(/^Registered$/i)).toBeVisible();
    await expect(page.getByText(/^Enabled$/i).first()).toBeVisible();
    await expect(page.getByText(/^Blocked$/i)).toBeVisible();
    // At least one known module
    await expect(page.getByText(/^Helpdesk$/i).first()).toBeVisible();
  });

  test("/admin/policies renders KPI + policies + tester", async ({ page }) => {
    await page.goto("/admin/policies");
    await expect(
      page.getByRole("heading", { name: /^Policy engine$/i }),
    ).toBeVisible();
    await expect(page.getByText(/Evaluation order:/i)).toBeVisible();
    // System policies render
    await expect(page.getByText(/AI safety baseline/i)).toBeVisible();
    // Policy tester present
    await expect(page.getByText(/^Policy tester$/i)).toBeVisible();
    await expect(page.getByLabel(/^action_id$/i)).toBeVisible();
  });

  test("/admin/ai-providers renders catalog + KPI banner", async ({ page }) => {
    await page.goto("/admin/ai-providers");
    await expect(page.getByRole("heading", { name: /^AI providers$/i })).toBeVisible();
    await expect(page.getByText(/^In catalog$/i)).toBeVisible();
    await expect(page.getByText(/^Enabled$/i).first()).toBeVisible();
    await expect(page.getByText(/^Verified$/i)).toBeVisible();
    await expect(page.getByText(/^Anthropic$/i).first()).toBeVisible();
    await expect(page.getByText(/^OpenAI$/i).first()).toBeVisible();
    await expect(page.getByText(/Sensitive credentials:/i)).toBeVisible();
  });

  test("/admin/ai-skills renders catalog + module filters", async ({ page }) => {
    await page.goto("/admin/ai-skills");
    await expect(page.getByRole("heading", { name: /^AI skills$/i })).toBeVisible();
    await expect(page.getByText(/^Registered$/i).first()).toBeVisible();
    await expect(page.getByText(/^Available to AI$/i).first()).toBeVisible();
    // Helpdesk skill visible
    await expect(page.getByText(/helpdesk\.ticket\.take/i).first()).toBeVisible();
    // Module filter button
    await expect(page.getByRole("button", { name: /helpdesk \(/i })).toBeVisible();
  });

  test("/admin/ai-skills can toggle a skill enablement", async ({ page }) => {
    await page.goto("/admin/ai-skills");
    // users.deactivate is default-off — find its Enable button
    await page.getByRole("button", { name: /users \(/i }).click();
    const enableBtn = page
      .getByRole("button", { name: /^Enable skill users\.deactivate$/ });
    await expect(enableBtn).toBeVisible();
    await enableBtn.click();
    // Toast appears + Disable button replaces Enable
    await expect(
      page.getByRole("button", { name: /^Disable skill users\.deactivate$/ }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("/admin/ai-providers Test button triggers connection test", async ({ page }) => {
    await page.goto("/admin/ai-providers");
    const testBtn = page.getByRole("button", { name: /Test connection to Anthropic/i });
    await expect(testBtn).toBeVisible();
    await testBtn.click();
    // The card's "tested ..." badge should appear (or update timestamp).
    await expect(
      page.getByText(/tested/i).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("/admin/policies tester evaluates a request and shows decision", async ({ page }) => {
    await page.goto("/admin/policies");
    // Default action+params already populated (helpdesk.batch.bulk_status, affected_count=100).
    await page.getByRole("button", { name: /^Evaluate$/i }).click();
    // Decision badge appears with one of the three states
    await expect(
      page.getByText(/Allowed — requires approval|Allowed|Denied/i).first(),
    ).toBeVisible({ timeout: 5_000 });
    // For the default input the rule "approval_large_batch" should fire.
    await expect(
      page.getByText(/approval/i).first(),
    ).toBeVisible();
  });
});

test.describe("Onboarding wizard — Phase 1.5", () => {
  test("renders step 1 with validation gating Next", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByText(/Welcome|ברוך הבא/i).first()).toBeVisible();
    // Step 1 body
    await expect(page.getByLabel(/^Organization name$/i)).toBeVisible();
    // Next disabled with empty name
    const next = page.getByRole("button", { name: /Next step/i });
    await expect(next).toBeVisible();
    await expect(next).toBeDisabled();
  });

  test("advances through steps once name is valid", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/^Organization name$/i).fill("Acme E2E");
    await page.getByRole("button", { name: /Next step/i }).click();
    // Step 2 — AI persona name field appears
    await expect(page.getByLabel(/^AI persona name$/i)).toBeVisible();
  });

  test("step 3 renders modules list (Skip allowed)", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/^Organization name$/i).fill("Acme E2E");
    await page.getByRole("button", { name: /Next step/i }).click();
    // Persona is pre-filled with default valid value, so just advance.
    await page.getByRole("button", { name: /Next step/i }).click();
    // Step 3 — modules. Skip button visible (because step is optional).
    const skip = page.getByRole("button", { name: /Skip step/i });
    await expect(skip).toBeVisible();
  });

  test("Back button navigates to previous step", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/^Organization name$/i).fill("Acme E2E");
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel(/^Organization name$/i)).toBeVisible();
    // Filled value persists when going back
    await expect(page.getByLabel(/^Organization name$/i)).toHaveValue("Acme E2E");
  });

  test("Cancel button is always visible", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(
      page.getByRole("button", { name: /Cancel wizard/i }),
    ).toBeVisible();
  });
});
