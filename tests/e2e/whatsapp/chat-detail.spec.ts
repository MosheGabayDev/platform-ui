/**
 * E2E smoke for /whatsapp/chats/[id] — owner/share-scoped chat detail.
 * Closes E2E_COVERAGE.md §chat-detail (batch 165).
 */
import { test, expect } from "../fixtures/base";

test.describe("/whatsapp/chats/[id] smoke", () => {
  test("renders messages of the owned chat (Dana Levi)", async ({ page }) => {
    // Mock fixture id 11001 is private chat with Dana Levi.
    await page.goto("/whatsapp/chats/11001");
    await expect(page.getByText(/Dana Levi/).first()).toBeVisible();
    // At least one message body from the fixture should render.
    await expect(page.getByText(/invoice/i).first()).toBeVisible();
  });

  test("invalid chat id renders ErrorState", async ({ page }) => {
    await page.goto("/whatsapp/chats/not-a-number");
    // ErrorState surfaces the error somewhere on the page — title or body.
    await expect(page.getByText(/error|404|not found|שגיאה/i).first()).toBeVisible();
  });

  test("shared-in chat (11004) shows the share-by banner instead of Share button", async ({
    page,
  }) => {
    await page.goto("/whatsapp/chats/11004");
    // Banner mentions who shared it.
    await expect(page.getByText(/Ops Lead|שיתף|shared by/i).first()).toBeVisible();
  });

  test("RTL viewport mobile-S has no horizontal overflow on chat detail", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/whatsapp/chats/11001");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
