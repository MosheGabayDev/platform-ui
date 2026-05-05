/**
 * Base Playwright fixture for platform-ui E2E suite.
 *
 * Every spec should import `test` and `expect` from this module instead of
 * `@playwright/test`. The fixture:
 *   - injects a mock NextAuth session cookie (offline / mock-mode demo)
 *     — this happens UNCONDITIONALLY via a context override, so specs that
 *     don't destructure `errorCapture` still get the session.
 *   - mocks the feature-flag endpoint as enabled (R045 backend not yet live)
 *   - attaches an ErrorCapture to the page and persists captured errors per test
 *
 * For tests that REQUIRE real Flask login (full RBAC, audit trail, billing),
 * import directly from "@playwright/test" and use helpers/auth.ts instead.
 */
import { test as base, expect } from "@playwright/test";
import { injectMockSession } from "../helpers/mock-session";
import { ErrorCapture, type CapturedError } from "../helpers/error-capture";

export type FlagOverride = Record<string, boolean>;

interface PlatformFixtures {
  errorCapture: ErrorCapture;
  flagOverrides: FlagOverride;
}

export const test = base.extend<PlatformFixtures>({
  flagOverrides: [{}, { option: true }],

  // Override `context` so the mock session is injected for EVERY test that
  // uses the base fixture, regardless of which fixtures it destructures.
  // Pre-existing tests that only destructured `{ page }` were silently
  // landing on /login. (Round 1 E2E hardening — 2026-05-06.)
  context: async ({ context }, use) => {
    await injectMockSession(context);
    await use(context);
  },

  // Override `page` so the feature-flag mock is wired before any navigation.
  page: async ({ page, flagOverrides }, use) => {
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
    await use(page);
  },

  errorCapture: async ({ page }, use, testInfo) => {
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
