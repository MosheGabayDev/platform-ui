import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn()", () => {
  it("merges plain class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("dedupes conflicting Tailwind classes (twMerge)", () => {
    // twMerge keeps the last conflicting class
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles falsy inputs (clsx semantics)", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("flattens arrays of class values", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("returns empty string when no truthy input", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});
