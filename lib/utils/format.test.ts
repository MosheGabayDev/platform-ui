/**
 * Smoke tests for the browser-facing format re-export.
 *
 * Pure logic is tested in lib/platform/formatting/format.test.ts; here
 * we assert the re-export contract holds so a future refactor of the
 * platform module doesn't silently break web imports.
 */
import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatBytes,
} from "./format";

describe("lib/utils/format re-exports", () => {
  it("re-exports all six formatter functions", () => {
    expect(typeof formatDate).toBe("function");
    expect(typeof formatDateTime).toBe("function");
    expect(typeof formatRelativeTime).toBe("function");
    expect(typeof formatNumber).toBe("function");
    expect(typeof formatCurrency).toBe("function");
    expect(typeof formatBytes).toBe("function");
  });

  it("formatNumber round-trips a small integer", () => {
    expect(formatNumber(42)).toContain("42");
  });

  it("formatBytes returns a string with size + unit", () => {
    expect(formatBytes(1024)).toMatch(/KB|kb|בייט|KiB/i);
  });

  it("formatDate handles ISO strings without throwing", () => {
    expect(() => formatDate("2026-05-07T00:00:00Z")).not.toThrow();
  });
});
