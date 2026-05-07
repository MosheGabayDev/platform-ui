import { describe, it, expect } from "vitest";
import { createOrgSchema, editOrgSchema } from "./schemas";

describe("createOrgSchema", () => {
  const valid = { name: "Acme Co", slug: "acme", is_active: true };

  it("passes for valid input", () => {
    expect(createOrgSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects name < 2", () => {
    expect(createOrgSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });
  it("rejects name > 100", () => {
    expect(createOrgSchema.safeParse({ ...valid, name: "a".repeat(101) }).success).toBe(false);
  });
  it("rejects empty slug", () => {
    expect(createOrgSchema.safeParse({ ...valid, slug: "" }).success).toBe(false);
  });
  it("rejects slug > 50", () => {
    expect(createOrgSchema.safeParse({ ...valid, slug: "a".repeat(51) }).success).toBe(false);
  });
  it("rejects slug with uppercase", () => {
    expect(createOrgSchema.safeParse({ ...valid, slug: "Acme" }).success).toBe(false);
  });
  it("rejects slug with underscore", () => {
    expect(createOrgSchema.safeParse({ ...valid, slug: "ac_me" }).success).toBe(false);
  });
  it("rejects slug with leading/trailing dash", () => {
    expect(createOrgSchema.safeParse({ ...valid, slug: "-acme" }).success).toBe(false);
    expect(createOrgSchema.safeParse({ ...valid, slug: "acme-" }).success).toBe(false);
  });
  it("accepts single-char slug", () => {
    expect(createOrgSchema.safeParse({ ...valid, slug: "a" }).success).toBe(true);
  });
  it("accepts slug with internal dashes and digits", () => {
    expect(createOrgSchema.safeParse({ ...valid, slug: "ac-me-1" }).success).toBe(true);
  });
  it("rejects description > 500", () => {
    expect(
      createOrgSchema.safeParse({ ...valid, description: "x".repeat(501) }).success,
    ).toBe(false);
  });
  it("accepts optional description", () => {
    expect(createOrgSchema.safeParse({ ...valid, description: "ok" }).success).toBe(true);
  });
});

describe("editOrgSchema", () => {
  const valid = { name: "Acme", is_active: true };

  it("passes valid input", () => {
    expect(editOrgSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects name < 2", () => {
    expect(editOrgSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });
  it("does not require slug (slugs are immutable)", () => {
    expect(editOrgSchema.safeParse({ name: "Acme Co", is_active: true }).success).toBe(true);
  });
});
