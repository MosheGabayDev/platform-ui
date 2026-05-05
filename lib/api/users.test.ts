/**
 * Users client tests (mock mode). Covers list filtering, pagination,
 * stats, pending list, approve flow, mutations.
 */
import { describe, it, expect } from "vitest";
import {
  fetchUsers,
  fetchUserStats,
  fetchPendingUsers,
  fetchUser,
  approveUser,
  fetchRoles,
  createUser,
  updateUser,
  setUserActive,
} from "./users";

describe("users client (mock mode)", () => {
  it("fetchUsers returns paginated list with required fields", async () => {
    const res = await fetchUsers({ page: 1, per_page: 50 });
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data.users)).toBe(true);
    expect(res.data.users.length).toBeGreaterThan(0);
    const u = res.data.users[0]!;
    expect(typeof u.id).toBe("number");
    expect(typeof u.email).toBe("string");
    expect(typeof u.role).toBe("string");
  });

  it("fetchUsers respects pagination per_page", async () => {
    const res = await fetchUsers({ page: 1, per_page: 2 });
    expect(res.data.users.length).toBeLessThanOrEqual(2);
  });

  it("fetchUserStats returns numeric counters", async () => {
    const res = await fetchUserStats();
    expect(res.success).toBe(true);
    expect(typeof res.data.total).toBe("number");
    expect(res.data.total).toBeGreaterThanOrEqual(0);
  });

  it("fetchPendingUsers returns only is_approved=false rows", async () => {
    const res = await fetchPendingUsers();
    expect(res.success).toBe(true);
    expect(res.data.users.every((u) => u.is_approved === false)).toBe(true);
  });

  it("fetchUser returns a single detail by id", async () => {
    const list = await fetchUsers({ page: 1, per_page: 50 });
    const first = list.data.users[0]!;
    const res = await fetchUser(first.id);
    expect(res.data.user.id).toBe(first.id);
  });

  it("fetchUser throws for unknown id", async () => {
    await expect(fetchUser(99999)).rejects.toBeTruthy();
  });

  it("approveUser returns success message", async () => {
    const pending = await fetchPendingUsers();
    if (pending.data.users.length === 0) return;
    const target = pending.data.users[0]!;
    const res = await approveUser(target.id);
    expect(res.success).toBe(true);
  });

  it("fetchRoles returns role list", async () => {
    const res = await fetchRoles();
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data.roles)).toBe(true);
    expect(res.data.roles.length).toBeGreaterThan(0);
  });

  it("createUser returns success with expected response shape", async () => {
    // Mock client is stateless for mutations — backend will be authoritative.
    const res = await createUser({
      email: `e2e-${Date.now()}@platform.local`,
      username: "e2euser",
      password: "Password123!",
      is_admin: false,
      is_manager: false,
    });
    expect(res.success).toBe(true);
  });

  it("setUserActive returns success", async () => {
    const list = await fetchUsers({ page: 1, per_page: 200 });
    const target = list.data.users[0]!;
    const res = await setUserActive(target.id, false);
    expect(res.success).toBe(true);
  });

  // updateUser requires the full EditUserInput (20+ fields). The setUserActive
  // / approveUser paths cover the common admin actions; full-form edits are
  // covered by component-level tests on the Edit User page.
  void updateUser; // referenced to keep the import alive
});
