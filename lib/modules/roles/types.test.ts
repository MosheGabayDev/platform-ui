import { describe, it, expect } from "vitest";
import { groupPermissions, type RolePermission } from "./types";

const mkPerm = (id: number, name: string): RolePermission => ({
  id,
  name,
  description: null,
});

describe("groupPermissions", () => {
  it("groups by prefix before first dot", () => {
    const out = groupPermissions([
      mkPerm(1, "users.view"),
      mkPerm(2, "users.create"),
      mkPerm(3, "helpdesk.assign"),
    ]);
    expect(out.get("users")).toHaveLength(2);
    expect(out.get("helpdesk")).toHaveLength(1);
  });

  it("uses 'general' bucket for permissions without dots", () => {
    const out = groupPermissions([mkPerm(1, "loose"), mkPerm(2, "another")]);
    expect(out.get("general")).toHaveLength(2);
  });

  it("returns empty Map for empty input", () => {
    const out = groupPermissions([]);
    expect(out.size).toBe(0);
  });

  it("preserves insertion order within group", () => {
    const out = groupPermissions([
      mkPerm(1, "users.b"),
      mkPerm(2, "users.a"),
    ]);
    const arr = out.get("users")!;
    expect(arr[0]!.name).toBe("users.b");
    expect(arr[1]!.name).toBe("users.a");
  });

  it("multiple dots — only first is split point", () => {
    const out = groupPermissions([mkPerm(1, "a.b.c")]);
    expect(out.get("a")).toBeDefined();
    expect(out.get("a")![0]!.name).toBe("a.b.c");
  });
});
