/**
 * a11y smoke — axe-core scan on the public marketing-style surfaces.
 *
 * Pattern doc: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §a11y.
 *
 * Scans /legal/* + /docs for serious + critical WCAG issues. Other pages
 * (admin / billing / chat) follow the same pattern — copy this file and
 * swap the route list.
 *
 * Excludes color-contrast for now: design system uses HSL CSS variables
 * that axe can't compute pre-render in some browsers; manual review
 * tracked in docs/design/DESIGN_SYSTEM.md.
 */
import { AxeBuilder } from "@axe-core/playwright";
import { test, expect } from "../fixtures/base";

const ROUTES = [
  "/legal",
  "/legal/terms",
  "/legal/privacy",
  "/legal/dpa",
  "/legal/security",
  "/docs",
];

for (const route of ROUTES) {
  test(`${route} has no serious or critical a11y violations`, async ({ page }) => {
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
        "axe violations:",
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
