import { describe, it, expect } from "vitest";
import { signupSchema } from "./schemas";

const valid = {
  org_name: "Acme Corp",
  email: "admin@acme.com",
  password: "Password123",
};

describe("signupSchema", () => {
  it("passes for valid input", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects org_name < 2 chars (errors.orgNameTooShort)", () => {
    const r = signupSchema.safeParse({ ...valid, org_name: "A" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]!.message).toBe("errors.orgNameTooShort");
  });

  it("rejects invalid email (errors.emailInvalid)", () => {
    const r = signupSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]!.message).toBe("errors.emailInvalid");
  });

  it("rejects password < 8 chars (errors.passwordTooShort)", () => {
    const r = signupSchema.safeParse({ ...valid, password: "short" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]!.message).toBe("errors.passwordTooShort");
  });

  it("first_name and last_name are optional", () => {
    expect(signupSchema.safeParse({ ...valid, first_name: "F", last_name: "L" }).success).toBe(true);
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects first_name > 100 chars", () => {
    expect(
      signupSchema.safeParse({ ...valid, first_name: "x".repeat(101) }).success,
    ).toBe(false);
  });
});
