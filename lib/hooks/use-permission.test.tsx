/**
 * use-permission tests — RBAC wrapper for Client Components.
 *
 * Critical surface: PermissionGate + every dashboard page consult this
 * hook for role/permission checks. Backend re-checks independently, but
 * frontend correctness here matters for UX truth and for the AI shell's
 * `availableActions` declarations.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const sessionState = vi.hoisted(() => ({
  data: null as null | { user: Record<string, unknown> },
  status: "authenticated" as "authenticated" | "loading" | "unauthenticated",
}));

vi.mock("next-auth/react", () => ({
  useSession: () => sessionState,
}));

import { usePermission } from "./use-permission";

beforeEach(() => {
  sessionState.data = {
    user: {
      id: 7,
      email: "tim@example.com",
      role: "technician",
      roles: ["technician"],
      permissions: ["helpdesk.view", "helpdesk.assign"],
      org_id: 1,
      is_admin: false,
      is_system_admin: false,
    },
  };
  sessionState.status = "authenticated";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePermission", () => {
  it("isLoading reflects session status='loading'", () => {
    sessionState.status = "loading";
    sessionState.data = null;
    const { result } = renderHook(() => usePermission());
    expect(result.current.isLoading).toBe(true);
  });

  it("isAdmin reflects session.user.is_admin", () => {
    sessionState.data!.user.is_admin = true;
    const { result } = renderHook(() => usePermission());
    expect(result.current.isAdmin).toBe(true);
  });

  it("isAdmin defaults to false when session.user.is_admin is missing", () => {
    delete sessionState.data!.user.is_admin;
    const { result } = renderHook(() => usePermission());
    expect(result.current.isAdmin).toBe(false);
  });

  it("isRole returns true for the user's role", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.isRole("technician")).toBe(true);
  });

  it("isRole returns false for a role the user does NOT have", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.isRole("system_admin", "admin")).toBe(false);
  });

  it("admins always pass isRole even without explicit role membership", () => {
    sessionState.data!.user.is_admin = true;
    sessionState.data!.user.roles = [];
    sessionState.data!.user.role = "user";
    const { result } = renderHook(() => usePermission());
    expect(result.current.isRole("system_admin")).toBe(true);
  });

  it("can() returns true for an explicit permission", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("helpdesk.assign")).toBe(true);
  });

  it("can() returns false for a permission the user lacks", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("users.delete")).toBe(false);
  });

  it("admins always pass can() (RBAC override)", () => {
    sessionState.data!.user.is_admin = true;
    sessionState.data!.user.permissions = [];
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("users.delete")).toBe(true);
  });

  it("isSystemAdmin reflects session.user.is_system_admin", () => {
    sessionState.data!.user.is_system_admin = true;
    const { result } = renderHook(() => usePermission());
    expect(result.current.isSystemAdmin).toBe(true);
  });

  it("returns safe defaults when session is null", () => {
    sessionState.data = null;
    sessionState.status = "unauthenticated";
    const { result } = renderHook(() => usePermission());
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSystemAdmin).toBe(false);
    expect(result.current.isRole("any")).toBe(false);
    expect(result.current.can("anything")).toBe(false);
  });
});
