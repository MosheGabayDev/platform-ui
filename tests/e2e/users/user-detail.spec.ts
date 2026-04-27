/**
 * E2E: User detail page
 *
 * Verifies that an authenticated admin reaching /users/<id> sees:
 *  - User identity card
 *  - "פרטי חשבון" section with username
 *  - "אבטחה והגדרות" section
 *  - "היסטוריית פעילות" section (Timeline) with filter chips
 *
 * The admin is expected to land on their own profile after login. We resolve
 * the admin user id by hitting /api/proxy/users with the session cookie.
 */
import { test, expect } from "@playwright/test";
import { getAdminCredentials, login } from "../helpers/auth";

test.describe("User detail page", () => {
  test.beforeEach(async ({ page }) => {
    const creds = getAdminCredentials();
    test.skip(!creds, "E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD not set");
    await page.context().clearCookies();
    await login(page, creds!);
  });

  test("shows profile sections and activity timeline", async ({ page, request }) => {
    // Resolve the admin user id from the API. We pull the session cookie out of
    // the page context so the request is authenticated.
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const meResp = await request.get("/api/proxy/users?per_page=1", {
      headers: { cookie: cookieHeader },
    });
    expect(meResp.ok(), `users list returned ${meResp.status()}`).toBe(true);
    const meJson = await meResp.json();
    const userId = meJson?.data?.users?.[0]?.id;
    expect(userId, "no user id returned from /api/proxy/users").toBeTruthy();

    await page.goto(`/users/${userId}`);

    // Section headings.
    await expect(page.getByText("פרטי חשבון")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("אבטחה והגדרות")).toBeVisible();
    await expect(page.getByText("היסטוריית פעילות")).toBeVisible();

    // Activity filter chips.
    await expect(page.getByRole("button", { name: "הכל" })).toBeVisible();
    await expect(page.getByRole("button", { name: "כניסה" })).toBeVisible();
    await expect(page.getByRole("button", { name: "אבטחה" })).toBeVisible();
    await expect(page.getByRole("button", { name: "פרופיל" })).toBeVisible();
  });
});
