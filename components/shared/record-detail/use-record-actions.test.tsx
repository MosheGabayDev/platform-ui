/**
 * Tests for useRecordActions (Track C). Hook is the source of truth for
 * RBAC + visibleWhen filtering, destructive-confirm gating, and the
 * pending-state machine. Testing it directly avoids fighting Radix's
 * portal rendering in happy-dom.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup, waitFor } from "@testing-library/react";
import { useRecordActions } from "./use-record-actions";
import type { RecordAction } from "./types";

let mockSession: { user?: { is_admin?: boolean; is_system_admin?: boolean; roles?: string[]; permissions?: string[] } } | null = {
  user: { is_admin: false, is_system_admin: false, roles: ["org_admin"], permissions: ["users.update"] },
};

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: mockSession, status: "authenticated" }),
}));

interface DemoRecord {
  id: number;
  name: string;
  status: "active" | "archived";
}

const ACTIVE: DemoRecord = { id: 1, name: "Demo", status: "active" };
const ARCHIVED: DemoRecord = { id: 2, name: "Old", status: "archived" };

beforeEach(() => {
  mockSession = {
    user: {
      is_admin: false,
      is_system_admin: false,
      roles: ["org_admin"],
      permissions: ["users.update"],
    },
  };
});

afterEach(cleanup);

describe("useRecordActions — visibility filtering", () => {
  it("returns all actions when no gates are set", () => {
    const actions: RecordAction<DemoRecord>[] = [
      { id: "view", kind: "view", label: "View", onInvoke: () => {} },
      { id: "edit", kind: "edit", label: "Edit", onInvoke: () => {} },
    ];
    const { result } = renderHook(() => useRecordActions(actions));
    expect(result.current.visibleActions(ACTIVE)).toHaveLength(2);
  });

  it("hides actions whose requiredRoles do not match the session", () => {
    mockSession = {
      user: { is_admin: false, is_system_admin: false, roles: ["viewer"], permissions: [] },
    };
    const actions: RecordAction<DemoRecord>[] = [
      { id: "view", kind: "view", label: "View", onInvoke: () => {} },
      {
        id: "delete",
        kind: "delete",
        label: "Delete",
        requiredRoles: ["system_admin"],
        destructive: true,
        onInvoke: () => {},
      },
    ];
    const { result } = renderHook(() => useRecordActions(actions));
    const visible = result.current.visibleActions(ACTIVE);
    expect(visible.map((a) => a.id)).toEqual(["view"]);
  });

  it("hides actions whose requiredPermission is missing", () => {
    mockSession = {
      user: { is_admin: false, is_system_admin: false, roles: ["viewer"], permissions: [] },
    };
    const actions: RecordAction<DemoRecord>[] = [
      {
        id: "edit",
        kind: "edit",
        label: "Edit",
        requiredPermission: "users.update",
        onInvoke: () => {},
      },
    ];
    const { result } = renderHook(() => useRecordActions(actions));
    expect(result.current.visibleActions(ACTIVE)).toHaveLength(0);
  });

  it("admins bypass requiredRoles + requiredPermission", () => {
    mockSession = {
      user: { is_admin: true, is_system_admin: true, roles: [], permissions: [] },
    };
    const actions: RecordAction<DemoRecord>[] = [
      {
        id: "delete",
        kind: "delete",
        label: "Delete",
        requiredRoles: ["system_admin"],
        requiredPermission: "users.delete",
        destructive: true,
        onInvoke: () => {},
      },
    ];
    const { result } = renderHook(() => useRecordActions(actions));
    expect(result.current.visibleActions(ACTIVE)).toHaveLength(1);
  });

  it("filters out actions whose visibleWhen returns false", () => {
    const actions: RecordAction<DemoRecord>[] = [
      {
        id: "archive",
        kind: "custom",
        label: "Archive",
        visibleWhen: (r) => r.status === "active",
        onInvoke: () => {},
      },
    ];
    const { result } = renderHook(() => useRecordActions(actions));
    expect(result.current.visibleActions(ACTIVE)).toHaveLength(1);
    expect(result.current.visibleActions(ARCHIVED)).toHaveLength(0);
  });
});

describe("useRecordActions — invocation flow", () => {
  it("invokes a non-destructive action immediately without confirm state", async () => {
    const onInvoke = vi.fn();
    const actions: RecordAction<DemoRecord>[] = [
      { id: "view", kind: "view", label: "View", onInvoke },
    ];
    const { result } = renderHook(() => useRecordActions(actions));
    act(() => result.current.invoke(actions[0], ACTIVE));
    await waitFor(() => expect(onInvoke).toHaveBeenCalledWith(ACTIVE));
    expect(result.current.confirmState).toBeNull();
  });

  it("destructive action defers onInvoke until acceptConfirm", () => {
    const onInvoke = vi.fn();
    const actions: RecordAction<DemoRecord>[] = [
      {
        id: "delete",
        kind: "delete",
        label: "Delete",
        destructive: true,
        onInvoke,
      },
    ];
    const { result } = renderHook(() => useRecordActions(actions));
    act(() => result.current.invoke(actions[0], ACTIVE));
    expect(result.current.confirmState).not.toBeNull();
    expect(onInvoke).not.toHaveBeenCalled();
    act(() => result.current.acceptConfirm());
    expect(result.current.confirmState).toBeNull();
  });

  it("cancelConfirm closes the dialog without invoking", () => {
    const onInvoke = vi.fn();
    const actions: RecordAction<DemoRecord>[] = [
      {
        id: "delete",
        kind: "delete",
        label: "Delete",
        destructive: true,
        onInvoke,
      },
    ];
    const { result } = renderHook(() => useRecordActions(actions));
    act(() => result.current.invoke(actions[0], ACTIVE));
    expect(result.current.confirmState).not.toBeNull();
    act(() => result.current.cancelConfirm());
    expect(result.current.confirmState).toBeNull();
    expect(onInvoke).not.toHaveBeenCalled();
  });

  it("pendingActionId tracks the running action", async () => {
    let release: (() => void) | null = null;
    const onInvoke = vi.fn(() => new Promise<void>((res) => { release = res; }));
    const actions: RecordAction<DemoRecord>[] = [
      { id: "view", kind: "view", label: "View", onInvoke },
    ];
    const { result } = renderHook(() => useRecordActions(actions));
    act(() => result.current.invoke(actions[0], ACTIVE));
    await waitFor(() => expect(result.current.pendingActionId).toBe("view"));
    act(() => release?.());
    await waitFor(() => expect(result.current.pendingActionId).toBeNull());
  });

  it("pending state clears even when onInvoke throws", async () => {
    const onInvoke = vi.fn(() => {
      throw new Error("kaboom");
    });
    const actions: RecordAction<DemoRecord>[] = [
      { id: "fail", kind: "custom", label: "Fail", onInvoke },
    ];
    const { result } = renderHook(() => useRecordActions(actions));
    act(() => result.current.invoke(actions[0], ACTIVE));
    await waitFor(() => expect(result.current.pendingActionId).toBeNull());
  });
});
