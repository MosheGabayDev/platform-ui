import { describe, it, expect, beforeEach } from "vitest";
import {
  loadMockState,
  saveMockState,
  clearMockState,
} from "@/lib/api/_mock-storage";

beforeEach(() => {
  window.localStorage.clear();
});

describe("_mock-storage shim", () => {
  it("returns the fallback when the key is absent", () => {
    expect(loadMockState("k", 1, { hello: "world" })).toEqual({ hello: "world" });
  });

  it("round-trips a JSON-serialisable payload", () => {
    saveMockState("k", 1, { a: 1, b: ["x", "y"] });
    expect(loadMockState("k", 1, null)).toEqual({ a: 1, b: ["x", "y"] });
  });

  it("returns the fallback when the version does not match", () => {
    saveMockState("k", 1, { old: true });
    expect(loadMockState("k", 2, { fresh: true })).toEqual({ fresh: true });
  });

  it("returns the fallback for malformed JSON", () => {
    window.localStorage.setItem("k", "not valid json {{{");
    expect(loadMockState("k", 1, { fresh: true })).toEqual({ fresh: true });
  });

  it("returns the fallback when stored shape is missing __v", () => {
    window.localStorage.setItem("k", JSON.stringify({ data: { stale: true } }));
    expect(loadMockState("k", 1, { fresh: true })).toEqual({ fresh: true });
  });

  it("clearMockState removes only keys under the prefix", () => {
    saveMockState("mock:settings:1", 1, { kept: false });
    saveMockState("mock:settings:2", 1, { kept: false });
    saveMockState("mock:other:3", 1, { kept: true });
    clearMockState("mock:settings:");
    expect(loadMockState("mock:settings:1", 1, "gone")).toBe("gone");
    expect(loadMockState("mock:settings:2", 1, "gone")).toBe("gone");
    expect(loadMockState("mock:other:3", 1, "gone")).toEqual({ kept: true });
  });

  it("save is idempotent (overwrites)", () => {
    saveMockState("k", 1, { v: 1 });
    saveMockState("k", 1, { v: 2 });
    expect(loadMockState("k", 1, null)).toEqual({ v: 2 });
  });

  it("survives a quota / storage-disabled error without throwing", () => {
    const original = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new Error("QuotaExceeded");
    };
    expect(() => saveMockState("k", 1, { big: "x" })).not.toThrow();
    window.localStorage.setItem = original;
  });
});
