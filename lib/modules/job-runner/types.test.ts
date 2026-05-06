import { describe, it, expect } from "vitest";
import { isTerminalStatus, TERMINAL_STATUSES } from "./types";

describe("job-runner status helpers", () => {
  it("recognizes the 6 terminal statuses (5 job-runner + completed lifecycle)", () => {
    expect(isTerminalStatus("success")).toBe(true);
    expect(isTerminalStatus("succeeded")).toBe(true);
    expect(isTerminalStatus("partial")).toBe(true);
    expect(isTerminalStatus("failed")).toBe(true);
    expect(isTerminalStatus("cancelled")).toBe(true);
    // Phase 4 — `completed` (e.g. maintenance windows) is also terminal so
    // polling stops once a window finishes.
    expect(isTerminalStatus("completed")).toBe(true);
  });

  it("rejects non-terminal statuses", () => {
    expect(isTerminalStatus("pending")).toBe(false);
    expect(isTerminalStatus("queued")).toBe(false);
    expect(isTerminalStatus("running")).toBe(false);
    // Phase 4 lifecycle statuses that should keep polling.
    expect(isTerminalStatus("scheduled")).toBe(false);
    expect(isTerminalStatus("in_progress")).toBe(false);
  });

  it("rejects unknown statuses (so polling continues if backend invents one)", () => {
    expect(isTerminalStatus("paused")).toBe(false);
    expect(isTerminalStatus("degraded")).toBe(false);
  });

  it("TERMINAL_STATUSES is a frozen set semantically (readonly intent)", () => {
    expect(TERMINAL_STATUSES.size).toBe(6);
  });
});
