import { describe, it, expect } from "vitest";
import {
  DANGER_LEVEL_CONFIG,
  isDestructiveLevel,
  requiresTypedConfirmation,
  requiresReason,
  normalizeDangerLevel,
} from "./danger-level";

describe("DANGER_LEVEL_CONFIG", () => {
  it("covers all levels", () => {
    expect(Object.keys(DANGER_LEVEL_CONFIG).sort()).toEqual([
      "critical",
      "high",
      "low",
      "medium",
      "none",
    ]);
  });
  it("only critical requires typed confirmation", () => {
    expect(DANGER_LEVEL_CONFIG.critical.requiresTypedConfirmation).toBe(true);
    expect(DANGER_LEVEL_CONFIG.high.requiresTypedConfirmation).toBe(false);
  });
});

describe("isDestructiveLevel", () => {
  it("high and critical are destructive", () => {
    expect(isDestructiveLevel("high")).toBe(true);
    expect(isDestructiveLevel("critical")).toBe(true);
  });
  it("low/medium/none are not destructive", () => {
    expect(isDestructiveLevel("none")).toBe(false);
    expect(isDestructiveLevel("low")).toBe(false);
    expect(isDestructiveLevel("medium")).toBe(false);
  });
});

describe("requiresTypedConfirmation", () => {
  it("true only for critical", () => {
    expect(requiresTypedConfirmation("critical")).toBe(true);
    expect(requiresTypedConfirmation("high")).toBe(false);
    expect(requiresTypedConfirmation("low")).toBe(false);
  });
});

describe("requiresReason", () => {
  it("true for high and critical", () => {
    expect(requiresReason("high")).toBe(true);
    expect(requiresReason("critical")).toBe(true);
  });
  it("false for none/low/medium", () => {
    expect(requiresReason("none")).toBe(false);
    expect(requiresReason("low")).toBe(false);
    expect(requiresReason("medium")).toBe(false);
  });
});

describe("normalizeDangerLevel", () => {
  it("undefined → none", () => {
    expect(normalizeDangerLevel(undefined)).toBe("none");
  });
  it("'default' → none", () => {
    expect(normalizeDangerLevel("default")).toBe("none");
  });
  it("'destructive' → high", () => {
    expect(normalizeDangerLevel("destructive")).toBe("high");
  });
  it("passes through valid levels", () => {
    expect(normalizeDangerLevel("low")).toBe("low");
    expect(normalizeDangerLevel("medium")).toBe("medium");
    expect(normalizeDangerLevel("high")).toBe("high");
    expect(normalizeDangerLevel("critical")).toBe("critical");
    expect(normalizeDangerLevel("none")).toBe("none");
  });
});
