/**
 * useTenantContext — combines next-auth session + billing tier + tier
 * entitlements into one shape. Tests cover the loading / anonymous /
 * authenticated transitions and the "fail-closed to free tier" rule.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const sessionMock = vi.hoisted(() => ({ data: null as unknown, status: "loading" as string }));
vi.mock("next-auth/react", () => ({
  useSession: () => sessionMock,
}));

const fetchBillingMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/billing", () => ({
  fetchBillingOverview: fetchBillingMock,
}));

import { useTenantContext } from "./use-tenant-context";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  fetchBillingMock.mockReset();
  sessionMock.data = null;
  sessionMock.status = "loading";
});
afterEach(() => vi.restoreAllMocks());

describe("useTenantContext", () => {
  it("returns isLoading=true while session loading", () => {
    sessionMock.status = "loading";
    const { result } = renderHook(() => useTenantContext(), { wrapper: makeWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.tier).toBe("free");
    expect(result.current.org_id).toBeNull();
  });

  it("returns isAnonymous=true when unauthenticated", () => {
    sessionMock.status = "unauthenticated";
    const { result } = renderHook(() => useTenantContext(), { wrapper: makeWrapper() });
    expect(result.current.isAnonymous).toBe(true);
    expect(result.current.org_id).toBeNull();
    expect(result.current.user_id).toBeNull();
    expect(fetchBillingMock).not.toHaveBeenCalled();
  });

  it("exposes session identity once authenticated", async () => {
    sessionMock.status = "authenticated";
    sessionMock.data = {
      user: { id: 7, org_id: 3, role: "admin", is_admin: true, is_system_admin: false },
    };
    fetchBillingMock.mockResolvedValue({ data: { plan: { tier: "pro" } } });
    const { result } = renderHook(() => useTenantContext(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.org_id).toBe(3);
    expect(result.current.user_id).toBe(7);
    expect(result.current.role).toBe("admin");
    expect(result.current.is_admin).toBe(true);
  });

  it("resolves tier + entitlements when billing returns pro", async () => {
    sessionMock.status = "authenticated";
    sessionMock.data = { user: { id: 1, org_id: 1, role: "user", is_admin: false, is_system_admin: false } };
    fetchBillingMock.mockResolvedValue({ data: { plan: { tier: "pro" } } });
    const { result } = renderHook(() => useTenantContext(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.tier).toBe("pro"));
    expect(result.current.entitlements.features.audit_log_export).toBe(true);
    expect(result.current.entitlements.features.sso_saml).toBe(false);
  });

  it("resolves tier + entitlements for enterprise", async () => {
    sessionMock.status = "authenticated";
    sessionMock.data = { user: { id: 1, org_id: 1, role: "user", is_admin: false, is_system_admin: false } };
    fetchBillingMock.mockResolvedValue({ data: { plan: { tier: "enterprise" } } });
    const { result } = renderHook(() => useTenantContext(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.tier).toBe("enterprise"));
    expect(result.current.entitlements.features.sso_saml).toBe(true);
    expect(result.current.entitlements.features.byok).toBe(true);
    expect(result.current.entitlements.limits.seats).toBe(-1);
  });

  it("fails closed to free tier while billing is loading", async () => {
    sessionMock.status = "authenticated";
    sessionMock.data = { user: { id: 1, org_id: 1, role: "user", is_admin: false, is_system_admin: false } };
    // Resolve never — simulate slow query.
    let resolve: (v: unknown) => void = () => {};
    fetchBillingMock.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const { result } = renderHook(() => useTenantContext(), { wrapper: makeWrapper() });
    expect(result.current.tier).toBe("free");
    expect(result.current.entitlements.features.audit_log_export).toBe(false);
    // Cleanup so the promise doesn't hang.
    resolve({ data: { plan: { tier: "free" } } });
  });

  it("fails closed when billing rejects (no premium leak)", async () => {
    sessionMock.status = "authenticated";
    sessionMock.data = { user: { id: 1, org_id: 1, role: "user", is_admin: false, is_system_admin: false } };
    fetchBillingMock.mockRejectedValue(new Error("billing-down"));
    const { result } = renderHook(() => useTenantContext(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tier).toBe("free");
  });
});
