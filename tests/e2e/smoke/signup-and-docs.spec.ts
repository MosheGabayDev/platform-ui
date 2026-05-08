/**
 * E2E smoke for /signup + /docs — public surfaces.
 *
 * Spec: PRODUCT_LAUNCH_PLAN.md §3 task 6.07 + §7 task 10.07.
 *
 * Both routes are public (under (auth) and /docs respectively). The
 * mock session from the base fixture is harmless here — these pages
 * don't gate on auth.
 */
import { test, expect } from "../fixtures/base";

test.describe("/signup smoke", () => {
  test("renders the signup form + legal links", async ({ page }) => {
    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: /Sign up|הרשמה/i }),
    ).toBeVisible();
    // Required fields
    await expect(page.getByLabel(/Organization name|שם הארגון/i)).toBeVisible();
    await expect(page.getByLabel(/Admin email|אימייל מנהל/i)).toBeVisible();
    await expect(page.getByLabel(/^Password$|^סיסמה$/i)).toBeVisible();
    // Legal cross-links from the footer below the form
    await expect(page.getByRole("link", { name: /Terms|תנאי שימוש/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Privacy|פרטיות/i })).toBeVisible();
  });

  test("Zod validation surfaces field errors before backend call", async ({ page }) => {
    await page.goto("/signup");
    // Fill invalid values
    await page.getByLabel(/Organization name|שם הארגון/i).fill("A"); // too short
    await page.getByLabel(/Admin email|אימייל מנהל/i).fill("not-an-email");
    await page.getByLabel(/^Password$|^סיסמה$/i).fill("short");
    await page.getByRole("button", { name: /Create organization|צור ארגון/i }).click();
    // At least one field error visible
    await expect(page.locator(".text-destructive").first()).toBeVisible();
  });

  test("successful submission shows the email-verify next-step state", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/Organization name|שם הארגון/i).fill("Acme Test");
    await page.getByLabel(/Admin email|אימייל מנהל/i).fill("admin@acme.test");
    await page.getByLabel(/^Password$|^סיסמה$/i).fill("Password123");
    await page.getByRole("button", { name: /Create organization|צור ארגון/i }).click();
    // Mock client returns success → success card with email verify message
    await expect(
      page.getByRole("heading", { name: /Organization created|הארגון נוצר/i }),
    ).toBeVisible();
  });
});

test.describe("/docs smoke", () => {
  test("renders the docs index with 5 section cards", async ({ page }) => {
    await page.goto("/docs");
    await expect(
      page.getByRole("heading", { name: /^Documentation$|מרכז תיעוד/i }),
    ).toBeVisible();
    for (const [key, href] of [
      ["gettingStarted", "/docs/getting-started"],
      ["adminGuide", "/docs/admin"],
      ["aiGuide", "/docs/ai"],
      ["apiReference", "/docs/api"],
      ["releaseNotes", "/docs/releases"],
    ] as const) {
      await expect(page.getByTestId(`docs-section-${key}`)).toHaveAttribute("href", href);
    }
  });

  test("coming-soon banner notes content is pilot-program work", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.getByText(/pilot|תוכנית.*pilot|תוכן מלא/i)).toBeVisible();
  });

  test("public footer mounted on /docs (links to legal + back to /docs)", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.getByTestId("footer-link-legal")).toHaveAttribute("href", "/legal");
    await expect(page.getByTestId("footer-link-docs")).toHaveAttribute("href", "/docs");
  });
});
