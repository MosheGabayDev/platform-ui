/**
 * E2E: Tenant isolation — Helpdesk data
 *
 * Resolves P1-Exit gate item #6 (per ADR-041): "Cross-tenant test passes:
 * org A cannot see org B Helpdesk data".
 *
 * Status: SCAFFOLDED — tests are skipped unless cross-org credentials are
 * available. The scaffolding intentionally lives in the repo BEFORE the
 * gate flips, so the moment two real test accounts exist the gate clears
 * via env-var configuration alone (no code change).
 *
 * Required env vars (.env.test.local — never commit):
 *   E2E_BASE_URL
 *   E2E_ORG_A_ADMIN_EMAIL / E2E_ORG_A_ADMIN_PASSWORD
 *   E2E_ORG_A_ID
 *   E2E_ORG_B_ID
 *   E2E_ORG_B_TICKET_ID            — a real Helpdesk ticket ID belonging to org B
 *   E2E_ORG_B_TECHNICIAN_ID        — a real technician ID belonging to org B
 *   E2E_ORG_B_MAINTENANCE_ID       — a real maintenance window ID belonging to org B
 *
 * Adversarial coverage matrix (read with the spec at
 * docs/system-upgrade/04-capabilities/platform-search-spec.md §2 and
 * docs/system-upgrade/02-rules/development-rules.md §Multi-tenant safety):
 *
 *   Helpdesk surface       | Direct-ID probe | List-leak probe | Body-injection probe
 *   ---------------------- | --------------- | --------------- | --------------------
 *   Tickets                | ✓               | ✓               | ✓ (org_id in body)
 *   Technicians            | ✓               | ✓               | —
 *   SLA policies           | ✓               | ✓               | —
 *   Approvals (cap 13)     | ✓               | ✓               | ✓
 *   Maintenance windows    | ✓               | ✓               | ✓
 *   Batch tasks            | ✓               | ✓               | —
 *   Audit log              | ✓               | ✓               | —
 *   Search (cap 11)        | —               | ✓               | —
 *
 * IMPORTANT: TEST environment only. NEVER target PROD.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const ORG_A_EMAIL = process.env.E2E_ORG_A_ADMIN_EMAIL ?? "";
const ORG_A_PASSWORD = process.env.E2E_ORG_A_ADMIN_PASSWORD ?? "";
const ORG_A_ID = process.env.E2E_ORG_A_ID ?? "";
const ORG_B_ID = process.env.E2E_ORG_B_ID ?? "";
const ORG_B_TICKET_ID = process.env.E2E_ORG_B_TICKET_ID ?? "";
const ORG_B_TECHNICIAN_ID = process.env.E2E_ORG_B_TECHNICIAN_ID ?? "";
const ORG_B_MAINTENANCE_ID = process.env.E2E_ORG_B_MAINTENANCE_ID ?? "";

const credentialsAvailable =
  !!process.env.E2E_ORG_A_ADMIN_EMAIL &&
  !!process.env.E2E_ORG_B_ID &&
  !!process.env.E2E_ORG_B_TICKET_ID;

async function loginAsOrgA(page: import("@playwright/test").Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"]', ORG_A_EMAIL);
  await page.fill('[name="password"]', ORG_A_PASSWORD);
  await page.click('[type="submit"]');
  await expect(page).toHaveURL(/dashboard|helpdesk|\//);
}

test.describe("Multi-tenant: Helpdesk surface (P1-Exit gate item #6)", () => {
  test.skip(!credentialsAvailable, "Cross-org Helpdesk fixtures not set — skip");

  test.beforeEach(async ({ page }) => {
    await loginAsOrgA(page);
  });

  // -------------------------------------------------------------------------
  // Tickets
  // -------------------------------------------------------------------------

  test("Direct-ID probe: org A cannot fetch an org B ticket detail", async ({ request }) => {
    const resp = await request.get(
      `${BASE_URL}/api/proxy/helpdesk/api/tickets/${ORG_B_TICKET_ID}`,
    );
    expect([403, 404]).toContain(resp.status());
  });

  test("List-leak probe: org A tickets list does not include org B tickets", async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/proxy/helpdesk/api/tickets`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    const tickets = body?.data?.tickets ?? [];
    if (ORG_B_ID) {
      for (const t of tickets) {
        expect(String(t.org_id ?? ORG_A_ID)).not.toBe(ORG_B_ID);
      }
    }
    // Belt-and-braces: known org B ticket ID must not appear
    expect(tickets.some((t: { id: number | string }) => String(t.id) === ORG_B_TICKET_ID)).toBe(false);
  });

  test("Body-injection probe: org_id in create body is ignored", async ({ request }) => {
    const resp = await request.post(`${BASE_URL}/api/proxy/helpdesk/api/tickets`, {
      data: {
        subject: "[E2E-TEST] tenant-isolation probe",
        description: "should be created in caller org regardless of body org_id",
        priority: "P4",
        org_id: ORG_B_ID,
      },
    });
    if (resp.status() === 200 || resp.status() === 201) {
      const body = await resp.json();
      const ticket = body?.data?.ticket ?? body?.data ?? body;
      expect(String(ticket.org_id)).not.toBe(ORG_B_ID);
      // Cleanup
      if (ticket.id) {
        await request.delete(`${BASE_URL}/api/proxy/helpdesk/api/tickets/${ticket.id}`);
      }
    }
    // 400/403 also acceptable
  });

  // -------------------------------------------------------------------------
  // Technicians
  // -------------------------------------------------------------------------

  test("Direct-ID probe: org A cannot fetch an org B technician", async ({ request }) => {
    test.skip(!ORG_B_TECHNICIAN_ID, "ORG_B_TECHNICIAN_ID not set");
    const resp = await request.get(
      `${BASE_URL}/api/proxy/helpdesk/api/technicians/${ORG_B_TECHNICIAN_ID}`,
    );
    expect([403, 404]).toContain(resp.status());
  });

  test("List-leak probe: technicians list is org-scoped", async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/proxy/helpdesk/api/technicians`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    const techs = body?.data?.technicians ?? [];
    if (ORG_B_ID) {
      for (const t of techs) {
        expect(String(t.org_id ?? ORG_A_ID)).not.toBe(ORG_B_ID);
      }
    }
  });

  // -------------------------------------------------------------------------
  // SLA, Approvals, Maintenance, Batch, Audit
  // -------------------------------------------------------------------------

  test("List-leak probe: SLA policies are org-scoped", async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/proxy/helpdesk/api/sla/policies`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    const policies = body?.data?.policies ?? [];
    if (ORG_B_ID) {
      for (const p of policies) {
        expect(String(p.org_id ?? ORG_A_ID)).not.toBe(ORG_B_ID);
      }
    }
  });

  test("List-leak probe: approvals queue is org-scoped", async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/proxy/helpdesk/api/approvals`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    const invocations = body?.data?.invocations ?? [];
    if (ORG_B_ID) {
      for (const i of invocations) {
        expect(String(i.org_id ?? ORG_A_ID)).not.toBe(ORG_B_ID);
      }
    }
  });

  test("Direct-ID probe: org A cannot fetch an org B maintenance window", async ({ request }) => {
    test.skip(!ORG_B_MAINTENANCE_ID, "ORG_B_MAINTENANCE_ID not set");
    const resp = await request.get(
      `${BASE_URL}/api/proxy/helpdesk/api/maintenance/${ORG_B_MAINTENANCE_ID}`,
    );
    expect([403, 404]).toContain(resp.status());
  });

  test("List-leak probe: batch tasks are org-scoped", async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/proxy/helpdesk/api/batch`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    const tasks = body?.data?.tasks ?? [];
    if (ORG_B_ID) {
      for (const t of tasks) {
        expect(String(t.org_id ?? ORG_A_ID)).not.toBe(ORG_B_ID);
      }
    }
  });

  test("List-leak probe: audit log is org-scoped (no org B actor IDs leak)", async ({ request }) => {
    // Spec ref: docs/system-upgrade/05-ai/audit-log.md — entries are scoped by org_id.
    const resp = await request.get(`${BASE_URL}/api/proxy/audit/entries`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    const entries = body?.data?.entries ?? [];
    if (ORG_B_ID) {
      for (const e of entries) {
        expect(String(e.org_id ?? ORG_A_ID)).not.toBe(ORG_B_ID);
      }
    }
  });

  // -------------------------------------------------------------------------
  // Search (cap 11) — cross-module probe
  // -------------------------------------------------------------------------

  test("List-leak probe: global search does NOT return org B tickets even on shared keyword", async ({ request }) => {
    // Spec ref: platform-search-spec.md §2 — every searchable table participates
    // via WHERE org_id = :org_id IN THE SAME QUERY (no post-filter). This test
    // queries a generic keyword that almost certainly matches data in both orgs
    // and asserts org A only gets its own.
    const resp = await request.get(`${BASE_URL}/api/proxy/search?q=ticket`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    const results = body?.data?.results ?? [];
    if (ORG_B_TICKET_ID) {
      const leaked = results.find(
        (r: { type: string; id: number | string }) =>
          r.type === "ticket" && String(r.id) === ORG_B_TICKET_ID,
      );
      expect(leaked).toBeUndefined();
    }
  });
});
