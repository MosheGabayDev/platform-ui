import { describe, it, expect } from "vitest";
import { isTerminalStatus, TERMINAL_STATUSES } from "./types";

describe("job-runner status helpers", () => {
  it("recognizes the 5 terminal statuses", () => {
    expect(isTerminalStatus("success")).toBe(true);
    expect(isTerminalStatus("succeeded")).toBe(true);
    expect(isTerminalStatus("partial")).toBe(true);
    expect(isTerminalStatus("failed")).toBe(true);
    expect(isTerminalStatus("cancelled")).toBe(true);
  });

  it("rejects non-terminal statuses", () => {
    expect(isTerminalStatus("pending")).toBe(false);
    expect(isTerminalStatus("queued")).toBe(false);
    expect(isTerminalStatus("running")).toBe(false);
  });

  it("rejects unknown statuses (so polling continues if backend invents one)", () => {
    expect(isTerminalStatus("paused")).toBe(false);
    expect(isTerminalStatus("degraded")).toBe(false);
  });

  it("TERMINAL_STATUSES is a frozen set semantically (readonly intent)", () => {
    expect(TERMINAL_STATUSES.size).toBe(5);
  });
});
