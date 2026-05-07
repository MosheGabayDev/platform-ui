import { describe, it, expect } from "vitest";
import { createUserSchema, editUserSchema } from "./schemas";

const validCreate = {
  username: "validuser",
  email: "user@example.com",
  password: "Password123",
  is_admin: false,
  is_manager: false,
};

describe("createUserSchema", () => {
  it("passes for valid input", () => {
    expect(createUserSchema.safeParse(validCreate).success).toBe(true);
  });
  it("rejects username < 3 chars", () => {
    const r = createUserSchema.safeParse({ ...validCreate, username: "ab" });
    expect(r.success).toBe(false);
  });
  it("rejects username > 50 chars", () => {
    const r = createUserSchema.safeParse({ ...validCreate, username: "a".repeat(51) });
    expect(r.success).toBe(false);
  });
  it("rejects invalid email", () => {
    const r = createUserSchema.safeParse({ ...validCreate, email: "not-an-email" });
    expect(r.success).toBe(false);
  });
  it("rejects password < 8 chars", () => {
    const r = createUserSchema.safeParse({ ...validCreate, password: "short" });
    expect(r.success).toBe(false);
  });
  it("rejects password > 128 chars", () => {
    const r = createUserSchema.safeParse({ ...validCreate, password: "x".repeat(129) });
    expect(r.success).toBe(false);
  });
  it("rejects first_name > 100 chars", () => {
    const r = createUserSchema.safeParse({ ...validCreate, first_name: "x".repeat(101) });
    expect(r.success).toBe(false);
  });
  it("accepts optional first_name + last_name", () => {
    const r = createUserSchema.safeParse({ ...validCreate, first_name: "F", last_name: "L" });
    expect(r.success).toBe(true);
  });
  it("accepts null role_id", () => {
    expect(createUserSchema.safeParse({ ...validCreate, role_id: null }).success).toBe(true);
  });
  it("rejects negative role_id", () => {
    expect(createUserSchema.safeParse({ ...validCreate, role_id: -1 }).success).toBe(false);
  });
  it("rejects missing is_admin/is_manager", () => {
    expect(createUserSchema.safeParse({ ...validCreate, is_admin: undefined as never }).success).toBe(false);
  });
});

describe("editUserSchema", () => {
  const valid: Record<string, unknown> = {
    username: "u",
    email: "user@example.com",
    email_notifications: true,
    security_alerts: true,
    system_updates: true,
    is_admin: false,
    is_manager: false,
    is_active: true,
    is_approved: true,
    mfa_enabled: false,
    mfa_exempt: false,
    email_confirmed: false,
    is_system_admin: false,
    auto_approve_commands: false,
  };

  it("rejects username < 3", () => {
    expect(editUserSchema.safeParse({ ...valid, username: "ab" }).success).toBe(false);
  });

  it("passes with valid full payload", () => {
    expect(editUserSchema.safeParse({ ...valid, username: "abc" }).success).toBe(true);
  });

  it("rejects bio > 500", () => {
    expect(
      editUserSchema.safeParse({ ...valid, username: "abc", bio: "x".repeat(501) }).success,
    ).toBe(false);
  });

  it("accepts all optional fields omitted", () => {
    expect(editUserSchema.safeParse({ ...valid, username: "abc" }).success).toBe(true);
  });
});
