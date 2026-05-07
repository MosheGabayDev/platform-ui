import { describe, it, expect } from "vitest";
import {
  hasRole,
  hasAnyRole,
  hasPermission,
  isSystemAdmin,
  getOrgId,
} from "./rbac";
import type { SessionLike } from "./rbac";

const mkUser = (overrides: Partial<SessionLike["user"] & object> = {}): SessionLike => ({
  user: {
    id: 1,
    email: "u@x.com",
    name: "U",
    role: "user",
    is_admin: false,
    is_system_admin: false,
    permissions: [],
    org_id: 7,
    ...overrides,
  } as never,
});

describe("hasRole", () => {
  it("false for null/undefined session", () => {
    expect(hasRole(null, "admin")).toBe(false);
    expect(hasRole(undefined, "admin")).toBe(false);
  });
  it("false for empty session.user", () => {
    expect(hasRole({ user: null }, "admin")).toBe(false);
  });
  it("admins bypass role check", () => {
    expect(hasRole(mkUser({ is_admin: true, role: "user" }), "admin")).toBe(true);
  });
  it("matches by role name", () => {
    expect(hasRole(mkUser({ role: "technician" }), "technician")).toBe(true);
    expect(hasRole(mkUser({ role: "user" }), "technician", "admin")).toBe(false);
  });
});

describe("hasAnyRole", () => {
  it("delegates to hasRole with array", () => {
    expect(hasAnyRole(mkUser({ role: "user" }), ["user", "admin"])).toBe(true);
    expect(hasAnyRole(null, ["admin"])).toBe(false);
  });
});

describe("hasPermission", () => {
  it("false for missing session", () => {
    expect(hasPermission(null, "users.write")).toBe(false);
  });
  it("admins bypass", () => {
    expect(hasPermission(mkUser({ is_admin: true }), "anything")).toBe(true);
  });
  it("checks permissions list", () => {
    expect(hasPermission(mkUser({ permissions: ["users.read"] }), "users.read")).toBe(true);
    expect(hasPermission(mkUser({ permissions: ["users.read"] }), "users.write")).toBe(false);
  });
});

describe("isSystemAdmin", () => {
  it("true only when user.is_system_admin", () => {
    expect(isSystemAdmin(mkUser({ is_system_admin: true }))).toBe(true);
    expect(isSystemAdmin(mkUser())).toBe(false);
    expect(isSystemAdmin(null)).toBe(false);
  });
});

describe("getOrgId", () => {
  it("returns org_id when present", () => {
    expect(getOrgId(mkUser({ org_id: 42 }))).toBe(42);
  });
  it("returns null for missing session/user", () => {
    expect(getOrgId(null)).toBe(null);
    expect(getOrgId({ user: null })).toBe(null);
  });
});
