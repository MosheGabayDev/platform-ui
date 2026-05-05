/**
 * AI demo slice E2E (Phase 2.5, ADR-038 P1-Exit gate item #8).
 *
 * Asserts the chain end-to-end against the dev server:
 *   user opens FAB → sends "take ticket NNNN" → mock LLM responds with
 *   text + proposal → ActionPreviewCard renders → user clicks Confirm →
 *   toast notification fires → assistant transcript shows ✅ result.
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-ai-demo-slice-spec.md
 */
import { test, expect } from "../fixtures/base";

test.describe("AI demo slice (ADR-038)", () => {
  test("recognized phrase produces proposal + Confirm runs executor + toast fires", async ({ page }) => {
    await page.goto("/helpdesk");
    // Open the AI shell drawer via the floating button
    const fab = page.getByRole("button", { name: /open ai assistant/i });
    await expect(fab).toBeVisible();
    await fab.click();

    // Drawer renders the chat input
    const input = page.getByLabel(/^Message input$/i);
    await expect(input).toBeVisible();

    // Send a recognized phrase
    await input.fill("take ticket 1002");
    await page.getByRole("button", { name: /^Send message$/i }).click();

    // Wait for the mock LLM response — proposal card renders
    const card = page.getByTestId("action-preview-card");
    await expect(card).toBeVisible({ timeout: 5_000 });
    await expect(card).toContainText(/Take ticket #1002/i);

    // Confirm the action
    const confirm = page.getByRole("button", { name: /^Confirm$/i });
    await confirm.click();

    // Toast notification fires (Sonner toaster is a region with role=region)
    await expect(
      page.getByText(/took ticket|assigned|✅/i).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("unrecognized text returns plain reply with no proposal", async ({ page }) => {
    await page.goto("/helpdesk");
    await page.getByRole("button", { name: /open ai assistant/i }).click();

    const input = page.getByLabel(/^Message input$/i);
    await input.fill("hello there");
    await page.getByRole("button", { name: /^Send message$/i }).click();

    // No action preview card should render for plain chat
    await expect(page.getByTestId("action-preview-card")).toHaveCount(0, {
      timeout: 3_000,
    });
  });

  test("destructive intent (cancel maintenance) shows DESTRUCTIVE badge", async ({ page }) => {
    await page.goto("/helpdesk");
    await page.getByRole("button", { name: /open ai assistant/i }).click();

    const input = page.getByLabel(/^Message input$/i);
    await input.fill("cancel maintenance 9001");
    await page.getByRole("button", { name: /^Send message$/i }).click();

    const card = page.getByTestId("action-preview-card");
    await expect(card).toBeVisible({ timeout: 5_000 });
    await expect(card.getByText(/Destructive/i)).toBeVisible();
  });

  test("rejected proposal hides the card without running the executor", async ({ page }) => {
    await page.goto("/helpdesk");
    await page.getByRole("button", { name: /open ai assistant/i }).click();

    const input = page.getByLabel(/^Message input$/i);
    await input.fill("take ticket 1004");
    await page.getByRole("button", { name: /^Send message$/i }).click();

    const card = page.getByTestId("action-preview-card");
    await expect(card).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /^Reject$/i }).click();
    await expect(card).toHaveCount(0);
  });
});
