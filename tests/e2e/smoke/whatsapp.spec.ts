/**
 * E2E smoke for /whatsapp/sessions — self-service link/unlink flow.
 *
 * The base fixture mocks the feature-flag endpoint as enabled by default
 * (see tests/e2e/fixtures/base.ts), so the FeatureGate around the page
 * resolves and the inner content renders.
 */
import { test, expect } from "../fixtures/base";

test.describe("/whatsapp/sessions smoke", () => {
  test("renders title + link CTA + capture-status sidebar", async ({ page }) => {
    await page.goto("/whatsapp/sessions");
    await expect(
      page.getByRole("heading", { name: /^WhatsApp$/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Link WhatsApp|חבר WhatsApp/ }),
    ).toBeVisible();
    await expect(page.getByText(/Capture Status|מצב לכידה/)).toBeVisible();
  });

  test("clicking Link WhatsApp opens the QR dialog with a needs_qr session", async ({
    page,
  }) => {
    await page.goto("/whatsapp/sessions");
    await page
      .getByRole("button", { name: /Link WhatsApp|חבר WhatsApp/ })
      .click();
    await expect(
      page.getByRole("heading", { name: /WhatsApp QR/ }),
    ).toBeVisible();
  });

  test("unlink uses a confirm dialog (no native confirm)", async ({ page }) => {
    // First create a session so the unlink button exists.
    await page.goto("/whatsapp/sessions");
    await page
      .getByRole("button", { name: /Link WhatsApp|חבר WhatsApp/ })
      .click();
    // Close the QR dialog.
    await page.keyboard.press("Escape");
    // The session panel is now active. Click unlink.
    const unlinkBtn = page.getByTestId("whatsapp-unlink");
    await expect(unlinkBtn).toBeVisible();
    await unlinkBtn.click();
    await expect(page.getByTestId("whatsapp-unlink-confirm")).toBeVisible();
  });
});
