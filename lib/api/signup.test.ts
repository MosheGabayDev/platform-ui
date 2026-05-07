/**
 * Signup client (mock mode) — public unauthenticated POST.
 */
import { describe, it, expect } from "vitest";
import { submitSignup, MOCK_MODE } from "./signup";

describe("signup client (mock mode)", () => {
  it("MOCK_MODE is true until backend lands", () => {
    expect(MOCK_MODE).toBe(true);
  });

  it("submitSignup returns success envelope with org_id + user_id", async () => {
    const res = await submitSignup({
      org_name: "Acme",
      email: "admin@acme.com",
      password: "Password123",
    });
    expect(res.success).toBe(true);
    expect(res.data?.org_id).toBeGreaterThan(0);
    expect(res.data?.user_id).toBeGreaterThan(0);
    expect(res.data?.email_verification_sent).toBe(true);
  });

  it("submitSignup mock message hints (mock) prefix", async () => {
    const res = await submitSignup({ org_name: "X", email: "x@y.com", password: "Password123" });
    expect(res.message.toLowerCase()).toContain("mock");
  });
});
