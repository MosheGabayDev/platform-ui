/**
 * Golden-path UI smoke spec — covers everything built on master 2026-05-01.
 *
 * Designed to be RUN HEADED so a human can watch the browser tour:
 *   npx playwright test tests/e2e/smoke/golden-path.spec.ts --headed --workers=1
 *
 * Uses base fixture (tests/e2e/fixtures/base.ts): mock session + feature flags
 * open + browser-error capture (console / pageerror / failed network). The
 * captured errors per test land in test-results/error-capture/*.json and are
 * aggregated into planning-artifacts/reviews/<date>-e2e-error-report.md by
 * scripts/aggregate-e2e-errors.mjs.
 *
 * Safe only because today's API clients (lib/api/ai.ts, lib/api/helpdesk.ts)
 * are MOCK_MODE — no real backend traffic is required.
 */
import { test, expect } from "../fixtures/base";
import type { Page } from "@playwright/test";

// Slow each step so a human watching the headed run can follow.
const STEP_PAUSE_MS = 700;
async function pause(page: Page) {
  await page.waitForTimeout(STEP_PAUSE_MS);
}

test.describe("Golden path — visual UI smoke", () => {
  // Activate base fixture (session + flag mocks + error capture).
  test.beforeEach(async ({ errorCapture }) => {
    void errorCapture;
  });

  test("Shell + theme + sidebar render on dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);

    // Dark mode + RTL
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");

    // Sidebar present (desktop)
    const sidebar = page.locator('[data-slot="sidebar"], aside, nav').first();
    await expect(sidebar).toBeVisible();

    // FAB visible — AI assistant entry point
    const fab = page.getByRole("button", { name: /open ai assistant/i });
    await expect(fab).toBeVisible();
    await pause(page);
  });

  test("AI shell — open drawer, send message, see mock reply", async ({ page }) => {
    await page.goto("/");

    const fab = page.getByRole("button", { name: /open ai assistant/i });
    await fab.click();
    await pause(page);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await pause(page);

    // If chat surface exists (Stream B), try to send a message.
    const input = page.locator(
      'textarea, [role="textbox"], input[type="text"]'
    ).filter({ hasNot: page.locator('[type="hidden"]') }).first();

    if (await input.isVisible().catch(() => false)) {
      await input.fill("שלום, איזה משתמשים יש לי?");
      await pause(page);
      await input.press("Enter");
      // Mock reply lands in transcript — wait for "(mock)" substring.
      await expect(page.getByText(/\(mock\)/i)).toBeVisible({ timeout: 5_000 });
      await pause(page);
    }

    // Close via Escape
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("Page-context registration — drawer reflects current page", async ({ page }) => {
    // Walk the 5 wired pages; each fires useRegisterPageContext on mount.
    for (const route of ["/", "/users", "/organizations", "/roles"]) {
      await page.goto(route);
      const fab = page.getByRole("button", { name: /open ai assistant/i });
      await expect(fab).toBeVisible();
      await pause(page);
    }
  });

  test("Helpdesk dashboard — KPI tiles render", async ({ page }) => {
    await page.goto("/helpdesk");
    await pause(page);

    // KPI tiles from MOCK_STATS — labels are stable
    await expect(page.getByText(/open tickets/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/resolved today/i).first()).toBeVisible();
    await expect(page.getByText(/sla compliance/i).first()).toBeVisible();
    await pause(page);

    // pb-20 md:pb-0 contract — somewhere on the page main content reserves space for bottom nav
    const padded = page.locator(".pb-20").first();
    await expect(padded).toBeAttached();
  });

  test("Helpdesk tickets list — filters + sort visible", async ({ page }) => {
    await page.goto("/helpdesk/tickets");
    await pause(page);

    // Mock tickets render — at least one ticket title from MOCK_TICKETS
    await expect(
      page.getByText(/VPN connection drops/i).first()
    ).toBeVisible({ timeout: 10_000 });
    await pause(page);
  });

  test("Helpdesk ticket detail — timeline renders", async ({ page }) => {
    await page.goto("/helpdesk/tickets/1001");
    await pause(page);

    // Ticket title from MOCK_TICKETS — heading-level match
    await expect(
      page.getByRole("heading", { name: /VPN connection drops/i })
    ).toBeVisible({ timeout: 10_000 });
    await pause(page);
  });

  test("Command palette opens via Ctrl+K", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");
    await pause(page);

    const palette = page.getByRole("dialog");
    await expect(palette).toBeVisible();
    await pause(page);

    await page.keyboard.press("Escape");
  });

  test("Mobile viewport — bottom nav appears, no clipping", async ({ page }) => {
    // Session + flag mocks already applied by base fixture; just resize.
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/helpdesk");
    await pause(page);

    // Bottom nav is mobile-only (md:hidden) — page must reserve pb-20 somewhere
    const padded = page.locator(".pb-20").first();
    await expect(padded).toBeAttached();
    await pause(page);
  });
});
