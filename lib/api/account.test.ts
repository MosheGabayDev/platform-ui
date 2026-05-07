/**
 * Account client (mock mode) — GDPR data export + account delete.
 */
import { describe, it, expect } from "vitest";
import {
  requestDataExport,
  requestAccountDelete,
  MOCK_MODE,
} from "./account";

describe("account client (mock mode)", () => {
  it("MOCK_MODE is true until backend lands", () => {
    expect(MOCK_MODE).toBe(true);
  });

  it("requestDataExport returns a request_id and ETA email timestamp", async () => {
    const before = Date.now();
    const res = await requestDataExport();
    expect(res.success).toBe(true);
    expect(res.data.request_id).toMatch(/^exp_/);
    const eta = new Date(res.data.estimated_email_at).getTime();
    // ETA should be within ~24 hours of now (allow 1 minute slack).
    expect(eta).toBeGreaterThan(before + 23 * 3600_000);
    expect(eta).toBeLessThan(before + 25 * 3600_000);
  });

  it("requestAccountDelete returns deletion request with 7-day effective_at", async () => {
    const before = Date.now();
    const res = await requestAccountDelete({ email_confirmation: "user@example.com" });
    expect(res.success).toBe(true);
    expect(res.data.request_id).toMatch(/^del_/);
    const effective = new Date(res.data.effective_at).getTime();
    expect(effective).toBeGreaterThan(before + 6.5 * 86400_000);
    expect(effective).toBeLessThan(before + 7.5 * 86400_000);
  });

  it("requestAccountDelete still resolves in mock — backend will validate the email match", async () => {
    // FE owns the typed-name match check (UX); backend re-validates.
    // Mock just acknowledges receipt regardless of input.
    const res = await requestAccountDelete({ email_confirmation: "anything@x.com" });
    expect(res.success).toBe(true);
  });
});
