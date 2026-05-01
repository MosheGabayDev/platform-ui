/**
 * Base Playwright fixture for platform-ui E2E suite.
 *
 * Every spec should import `test` and `expect` from this module instead of
 * `@playwright/test`. The fixture:
 *   - injects a mock NextAuth session cookie (offline / mock-mode demo)
 *   - mocks the feature-flag endpoint as enabled (R045 backend not yet live)
 *   - attaches an ErrorCapture to the page and persists captured errors per test
 *
 * For tests that REQUIRE real Flask login (full RBAC, audit trail, billing),
 * import directly from "@playwright/test" and use helpers/auth.ts instead.
 *
 * Add module-specific fixtures (e.g. seeded ticket id) by extending `test`
 * again in tests/e2e/modules/<module>/fixtures.ts.
 */
import { test as base, expect } from "@playwright/test";
import { injectMockSession } from "../helpers/mock-session";
import { ErrorCapture, type CapturedError } from "../helpers/error-capture";

export type FlagOverride = Record<string, boolean>;

interface PlatformFixtures {
  /** Captured browser errors for the current test. */
  errorCapture: ErrorCapture;
  /** Override feature-flag values; default = all true. */
  flagOverrides: FlagOverride;
}

export const test = base.extend<PlatformFixtures>({
  flagOverrides: [{}, { option: true }],

  errorCapture: async ({ page, context, flagOverrides }, use, testInfo) => {
    await injectMockSession(context);

    await page.route("**/api/proxy/feature-flags/**", async (route) => {
      const url = route.request().url();
      const key = decodeURIComponent(url.split("/").pop() ?? "");
      const enabled = flagOverrides[key] ?? true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ key, enabled, source: "system" }),
      });
    });

    const capture = new ErrorCapture(page);

    await use(capture);

    const file = capture.persist(`${testInfo.titlePath.join("__")}`);
    if (file && capture.errors.length > 0) {
      await testInfo.attach("captured-errors", {
        path: file,
        contentType: "application/json",
      });
    }
  },
});

export { expect };
export type { CapturedError };
