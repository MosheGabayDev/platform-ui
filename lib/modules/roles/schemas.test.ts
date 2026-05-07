import { describe, it, expect } from "vitest";
import { createRoleSchema, editRoleSchema } from "./schemas";

describe("createRoleSchema", () => {
  it("passes for valid input", () => {
    expect(
      createRoleSchema.safeParse({ name: "Manager", permission_ids: [1, 2] }).success,
    ).toBe(true);
  });
  it("rejects name < 2", () => {
    expect(createRoleSchema.safeParse({ name: "A" }).success).toBe(false);
  });
  it("rejects name > 64", () => {
    expect(createRoleSchema.safeParse({ name: "x".repeat(65) }).success).toBe(false);
  });
  it("rejects description > 255", () => {
    expect(
      createRoleSchema.safeParse({ name: "ok", description: "x".repeat(256) }).success,
    ).toBe(false);
  });
  it("rejects negative permission ids", () => {
    expect(createRoleSchema.safeParse({ name: "ok", permission_ids: [-1] }).success).toBe(false);
  });
  it("accepts permission_ids omitted", () => {
    expect(createRoleSchema.safeParse({ name: "ok" }).success).toBe(true);
  });
});

describe("editRoleSchema", () => {
  it("passes valid input", () => {
    expect(
      editRoleSchema.safeParse({ name: "Manager", permission_ids: [] }).success,
    ).toBe(true);
  });
  it("requires permission_ids array", () => {
    expect(editRoleSchema.safeParse({ name: "ok" }).success).toBe(false);
  });
  it("rejects non-integer permission_ids", () => {
    expect(
      editRoleSchema.safeParse({ name: "ok", permission_ids: [1.5] }).success,
    ).toBe(false);
  });
});
