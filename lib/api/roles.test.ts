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

  it("fetchRoles search matches role name (case-insensitive)", async () => {
    const res = await fetchRoles({ search: "ADMIN" });
    expect(res.data.roles.length).toBeGreaterThan(0);
    expect(
      res.data.roles.every((r) => r.name.toLowerCase().includes("admin")),
    ).toBe(true);
  });

  it("fetchRoles search returns empty when no match", async () => {
    const res = await fetchRoles({ search: "no-match-zzzz" });
    expect(res.data.roles).toHaveLength(0);
    expect(res.data.total).toBe(0);
  });

  it("fetchRole detail includes permissions list with length matching count", async () => {
    const list = await fetchRoles();
    const target = list.data.roles[0]!;
    const res = await fetchRole(target.id);
    expect(res.data.role.permissions).toHaveLength(target.permission_count);
  });

  it("createRole defaults description to null when missing", async () => {
    const res = await createRole({ name: "no-desc", permission_ids: [] } as never);
    expect(res.success).toBe(true);
    expect(res.data.role.description).toBeNull();
  });

  it("updateRole unknown id falls back to first role", async () => {
    const res = await updateRole(99999, { name: "Renamed", description: "x" });
    expect(res.success).toBe(true);
    expect(res.data.role.name).toBe("Renamed");
  });

  it("updateRole keeps existing fields when input omits them", async () => {
    const list = await fetchRoles();
    const target = list.data.roles[0]!;
    const res = await updateRole(target.id, {} as never);
    expect(res.data.role.name).toBe(target.name);
  });

  it("setRolePermissions with non-empty list returns matching permissions", async () => {
    const list = await fetchRoles();
    const target = list.data.roles[0]!;
    const res = await setRolePermissions(target.id, [1, 2, 3]);
    expect(res.data.role.permission_count).toBe(3);
    expect(res.data.role.permissions.map((p) => p.id).sort()).toEqual([1, 2, 3]);
  });

  it("setRolePermissions unknown id falls back to first role", async () => {
    const res = await setRolePermissions(99999, [1]);
    expect(res.success).toBe(true);
    expect(res.data.role.permission_count).toBe(1);
  });
});
