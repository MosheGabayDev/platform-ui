/**
 * a11y smoke — axe-core scan on the authenticated (dashboard) surfaces.
 *
 * Sister of `a11y.spec.ts` — same pattern, scans the post-login shell
 * + the most-trafficked sub-pages. Mock session is injected by
 * `tests/e2e/fixtures/base.ts` so this exercises the real dashboard
 * layout (sidebar + topbar + bottom-nav).
 *
 * color-contrast disabled — same reason as the public-page sister
 * (HSL CSS variables; tracked in DESIGN_SYSTEM.md for manual review).
 */
import { AxeBuilder } from "@axe-core/playwright";
import { test, expect } from "../fixtures/base";

const ROUTES = [
  "/",
  "/account",
  "/billing",
  "/help",
  "/onboarding",
  "/settings",
];

for (const route of ROUTES) {
  test(`dashboard ${route} has no serious or critical a11y violations`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    if (blocking.length > 0) {
      console.log(
        `axe violations for ${route}:`,
        JSON.stringify(
          blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
          null,
          2,
        ),
      );
    }
    expect(blocking).toEqual([]);
  });
}
