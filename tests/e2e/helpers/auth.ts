/**
 * E2E auth helpers — login flow and session reuse.
 *
 * Credentials are read from env so the same suite runs against any environment:
 *   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD — required for tests that need a session.
 * Tests that don't need a session must skip when these are absent.
 */
import { Page, expect } from "@playwright/test";

export interface E2ECredentials {
  email: string;
  password: string;
}

export function getAdminCredentials(): E2ECredentials | null {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

/**
 * Performs a UI login and waits for the dashboard to load.
 * Throws if credentials are missing or login fails.
 */
export async function login(page: Page, creds: E2ECredentials): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(creds.email);
  await page.locator("#password").fill(creds.password);
  await page.getByRole("button", { name: /כניסה/ }).click();

  // After successful login the user is redirected away from /login.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
}
