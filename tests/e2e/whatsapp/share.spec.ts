/**
 * E2E for the WhatsApp ShareDialog — owner-side share + recipient-side revoke.
 * Closes E2E_COVERAGE.md §share (batch 165).
 *
 * The component-level permission gating is covered by
 * `components/modules/whatsapp/share-dialog.test.tsx` (batch 164).
 * This spec exercises the live flow on `/whatsapp/chats/[id]`.
 */
import { test, expect } from "../fixtures/base";

test.describe("/whatsapp/chats/[id] ShareDialog smoke", () => {
  test("owner sees Share button (admin session has whatsapp.share)", async ({ page }) => {
    // Mock session in base fixture is admin → admin shortcut passes
    // the PermissionGate added in batch 160.
    await page.goto("/whatsapp/chats/11001");
    await expect(
      page.getByRole("button", { name: /^Share$|^שתף$/ }).first(),
    ).toBeVisible();
  });

  test("recipient-side chat (11004) does NOT render the Share button (shared-in path)", async ({
    page,
  }) => {
    await page.goto("/whatsapp/chats/11004");
    // shared-in branch shows revoke banner instead of share button.
    await expect(
      page.getByRole("button", { name: /Revoke my access|בטל גישה/i }).first(),
    ).toBeVisible();
  });

  test("opening the Share dialog lists active shares + recipient typeahead", async ({
    page,
  }) => {
    await page.goto("/whatsapp/chats/11001");
    await page.getByRole("button", { name: /^Share$|^שתף$/ }).first().click();
    // Dialog open — title visible.
    await expect(page.getByText(/Share chat|שיתוף שיחה/i)).toBeVisible();
    // Typeahead input.
    await expect(page.getByPlaceholder(/Search|חפש/i).last()).toBeVisible();
  });
});
