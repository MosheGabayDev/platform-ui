/**
 * Component-level a11y smoke for the high-traffic shared primitives.
 *
 * Companion to `tests/e2e/smoke/a11y*.spec.ts` (those run axe in a real
 * browser). This file runs axe-core against the rendered HTML in the
 * vitest happy-dom environment — fast, browserless, runs in CI on every
 * commit.
 *
 * Scope: serious + critical violations only. The default rule set is
 * conservative because happy-dom doesn't implement layout, so any rule
 * that depends on computed style (color-contrast, focusable elements
 * out of the viewport) is disabled.
 *
 * Pattern doc — copy + extend with more components when their failure
 * mode would be a real-world a11y bug.
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { axe } from "vitest-axe";
import { renderWithIntl } from "@/lib/test-utils/intl";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { PublicFooter } from "./public-footer";
import { StatCardSkeleton } from "./skeleton-card";

afterEach(cleanup);

const RUN_OPTIONS = {
  rules: {
    // happy-dom doesn't compute style — color-contrast is a layout rule.
    "color-contrast": { enabled: false },
    // Region rule fires on any fragment that isn't inside <main>/<nav>;
    // these primitives are tested in isolation, not in their layout.
    region: { enabled: false },
  },
};

async function expectNoSeriousViolations(container: HTMLElement) {
  const results = await axe(container, RUN_OPTIONS);
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (blocking.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      "axe violations:",
      blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
    );
  }
  expect(blocking).toEqual([]);
}

describe("shared primitives — a11y", () => {
  it("EmptyState (with action) has no serious violations", async () => {
    const { container } = renderWithIntl(
      <EmptyState
        icon={Inbox}
        title="No items"
        description="Try again later"
        action={{ label: "Reload", onClick: () => {} }}
      />,
    );
    await expectNoSeriousViolations(container);
  });

  it("ErrorState has no serious violations", async () => {
    const { container } = renderWithIntl(
      <ErrorState error={new Error("Something went wrong")} onRetry={() => {}} />,
    );
    await expectNoSeriousViolations(container);
  });

  it("PublicFooter has no serious violations", async () => {
    const { container } = renderWithIntl(<PublicFooter />);
    await expectNoSeriousViolations(container);
  });

  it("StatCardSkeleton has no serious violations", async () => {
    const { container } = renderWithIntl(<StatCardSkeleton />);
    await expectNoSeriousViolations(container);
  });
});
