/**
 * E2E smoke for the /legal/* family — public, unauthenticated pages.
 *
 * Spec: PRODUCT_LAUNCH_PLAN.md §4 tasks 7.01 + 7.02 + 7.04 + 7.10 + 7.13
 * + §6 task 9.07 + cross-cutting legal index.
 *
 * These pages render without auth — the base fixture's mock session
 * is harmless here (the layout doesn't gate). All 6 routes verified:
 * /legal, /legal/terms, /legal/privacy, /legal/sla, /legal/security,
 * /legal/subprocessors.
 */
import { test, expect } from "../fixtures/base";

test.describe("/legal/* smoke (public pages)", () => {
  test("/legal index lists all 5 legal sub-pages with correct hrefs", async ({ page }) => {
    await page.goto("/legal");
    await expect(
      page.getByRole("heading", { name: /Legal documents|מסמכים משפטיים/i }),
    ).toBeVisible();
    for (const [key, href] of [
      ["terms", "/legal/terms"],
      ["privacy", "/legal/privacy"],
      ["sla", "/legal/sla"],
      ["security", "/legal/security"],
      ["subprocessors", "/legal/subprocessors"],
    ] as const) {
      await expect(page.getByTestId(`legal-card-${key}`)).toHaveAttribute("href", href);
    }
  });

  test("/legal/terms renders DRAFT banner + 7 policy sections", async ({ page }) => {
    await page.goto("/legal/terms");
    await expect(
      page.getByRole("heading", { name: /Terms of Service|תנאי שימוש/i }),
    ).toBeVisible();
    await expect(page.getByText(/DRAFT|טיוטה/i)).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(7);
  });

  test("/legal/privacy renders DRAFT banner + 7 GDPR sections", async ({ page }) => {
    await page.goto("/legal/privacy");
    await expect(
      page.getByRole("heading", { name: /Privacy Policy|מדיניות פרטיות/i }),
    ).toBeVisible();
    await expect(page.getByText(/DRAFT|טיוטה/i)).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(7);
  });

  test("/legal/sla renders the 3-tier availability matrix + DRAFT banner", async ({ page }) => {
    await page.goto("/legal/sla");
    await expect(
      page.getByRole("heading", { name: /Service Level Agreement|הסכם רמת שירות/i }),
    ).toBeVisible();
    await expect(page.getByText(/DRAFT|טיוטה/i)).toBeVisible();
    // Matrix has Free + Pro + Enterprise rows
    await expect(page.getByText(/^Free$/i).first()).toBeVisible();
    await expect(page.getByText(/^Pro$/i).first()).toBeVisible();
    await expect(page.getByText(/^Enterprise$/i).first()).toBeVisible();
  });

  test("/legal/security renders sections + security@ mailto + PGP block", async ({ page }) => {
    await page.goto("/legal/security");
    await expect(
      page.getByRole("heading", { name: /Vulnerability Disclosure|חשיפת פגיעויות/i }),
    ).toBeVisible();
    const mailto = page.getByRole("link", { name: /security@platform\.local/i });
    await expect(mailto).toHaveAttribute("href", "mailto:security@platform.local");
  });

  test("/legal/subprocessors lists all 6 known providers", async ({ page }) => {
    await page.goto("/legal/subprocessors");
    await expect(
      page.getByRole("heading", { name: /Subprocessors|ספקי משנה/i }),
    ).toBeVisible();
    for (const provider of ["OpenAI", "Anthropic", "Amazon Web Services", "Stripe", "Sentry", "Postmark"]) {
      await expect(page.getByText(provider)).toBeVisible();
    }
  });

  test("public footer is visible on every legal page (links to all 5)", async ({ page }) => {
    await page.goto("/legal/privacy");
    // Footer is mounted via app/legal/layout.tsx
    for (const key of ["legal", "privacy", "terms", "security", "docs"] as const) {
      await expect(page.getByTestId(`footer-link-${key}`)).toBeVisible();
    }
  });
});
