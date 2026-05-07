/**
 * PermissionGate — visibility gating with hide/disable modes.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const helpers = vi.hoisted(() => ({
  isRole: vi.fn(() => false),
  can: vi.fn(() => false),
  isAdmin: false,
  isSystemAdmin: false,
  isLoading: false,
}));

vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => helpers,
}));

import { PermissionGate } from "./permission-gate";

beforeEach(() => {
  helpers.isRole = vi.fn(() => false);
  helpers.can = vi.fn(() => false);
  helpers.isAdmin = false;
  helpers.isSystemAdmin = false;
  helpers.isLoading = false;
});
afterEach(cleanup);

describe("PermissionGate", () => {
  it("renders nothing while session loading", () => {
    helpers.isLoading = true;
    const { container } = render(
      <PermissionGate>
        <span>hidden</span>
      </PermissionGate>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders children when no constraints set", () => {
    render(
      <PermissionGate>
        <span>OK</span>
      </PermissionGate>,
    );
    expect(screen.getByText("OK")).toBeTruthy();
  });

  it("renders fallback when role does not match (mode=hide)", () => {
    render(
      <PermissionGate role="admin" fallback={<span>FB</span>}>
        <span>OK</span>
      </PermissionGate>,
    );
    expect(screen.getByText("FB")).toBeTruthy();
    expect(screen.queryByText("OK")).toBeNull();
  });

  it("renders children when role matches", () => {
    helpers.isRole = vi.fn((...roles: string[]) => roles.includes("admin"));
    render(
      <PermissionGate role="admin">
        <span>OK</span>
      </PermissionGate>,
    );
    expect(screen.getByText("OK")).toBeTruthy();
  });

  it("supports role array", () => {
    helpers.isRole = vi.fn((...roles: string[]) => roles.includes("manager"));
    render(
      <PermissionGate role={["admin", "manager"]}>
        <span>OK</span>
      </PermissionGate>,
    );
    expect(screen.getByText("OK")).toBeTruthy();
  });

  it("permission constraint: blocks when can() returns false", () => {
    render(
      <PermissionGate permission="users.write">
        <span>OK</span>
      </PermissionGate>,
    );
    expect(screen.queryByText("OK")).toBeNull();
  });

  it("permission constraint: allows when can() returns true", () => {
    helpers.can = vi.fn(() => true);
    render(
      <PermissionGate permission="users.write">
        <span>OK</span>
      </PermissionGate>,
    );
    expect(screen.getByText("OK")).toBeTruthy();
  });

  it("adminOnly blocks non-admins", () => {
    render(
      <PermissionGate adminOnly>
        <span>OK</span>
      </PermissionGate>,
    );
    expect(screen.queryByText("OK")).toBeNull();
  });

  it("adminOnly allows admins", () => {
    helpers.isAdmin = true;
    render(
      <PermissionGate adminOnly>
        <span>OK</span>
      </PermissionGate>,
    );
    expect(screen.getByText("OK")).toBeTruthy();
  });

  it("systemAdminOnly blocks non-sysadmins", () => {
    render(
      <PermissionGate systemAdminOnly>
        <span>OK</span>
      </PermissionGate>,
    );
    expect(screen.queryByText("OK")).toBeNull();
  });

  it("systemAdminOnly allows sysadmins", () => {
    helpers.isSystemAdmin = true;
    render(
      <PermissionGate systemAdminOnly>
        <span>OK</span>
      </PermissionGate>,
    );
    expect(screen.getByText("OK")).toBeTruthy();
  });

  it("mode=disable wraps children with pointer-events-none + aria-disabled", () => {
    const { container } = render(
      <PermissionGate role="admin" mode="disable">
        <span>OK</span>
      </PermissionGate>,
    );
    const wrapper = container.querySelector("[aria-disabled]");
    expect(wrapper?.classList.contains("pointer-events-none")).toBe(true);
    expect(screen.getByText("OK")).toBeTruthy();
  });
});
