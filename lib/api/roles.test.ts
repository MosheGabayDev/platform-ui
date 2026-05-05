/**
 * Roles client tests (mock mode).
 */
import { describe, it, expect } from "vitest";
import {
  fetchRoles,
  fetchRole,
  fetchAllPermissions,
  createRole,
  updateRole,
  setRolePermissions,
} from "./roles";

describe("roles client (mock mode)", () => {
  it("fetchRoles returns the role list", async () => {
    const res = await fetchRoles();
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data.roles)).toBe(true);
    expect(res.data.roles.length).toBeGreaterThan(0);
  });

  it("fetchRole returns single detail", async () => {
    const list = await fetchRoles();
    const target = list.data.roles[0]!;
    const res = await fetchRole(target.id);
    expect(res.data.role.id).toBe(target.id);
  });

  it("fetchRole throws on unknown id", async () => {
    await expect(fetchRole(99999)).rejects.toBeTruthy();
  });

  it("fetchAllPermissions returns the catalog", async () => {
    const res = await fetchAllPermissions();
    expect(res.success).toBe(true);
    expect(res.data.permissions.length).toBeGreaterThan(0);
  });

  it("createRole returns success", async () => {
    const res = await createRole({
      name: "test-role",
      description: "test",
      permission_ids: [],
    });
    expect(res.success).toBe(true);
  });

  it("updateRole returns success", async () => {
    const list = await fetchRoles();
    const target = list.data.roles[0]!;
    const res = await updateRole(target.id, {
      name: target.name,
      description: "updated",
    });
    expect(res.success).toBe(true);
  });

  it("setRolePermissions returns success", async () => {
    const list = await fetchRoles();
    const target = list.data.roles[0]!;
    const res = await setRolePermissions(target.id, []);
    expect(res.success).toBe(true);
  });
});
