import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatBytes,
} from "./format";

afterEach(() => vi.useRealTimers());

describe("formatDate", () => {
  it("formats valid ISO as he-IL medium date", () => {
    expect(formatDate("2026-04-24T10:00:00Z")).toMatch(/2026/);
  });
  it("returns em-dash for null/undefined", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
  });
  it("returns em-dash on invalid input", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("includes time component", () => {
    const out = formatDateTime("2026-04-24T10:30:00Z");
    expect(out).toMatch(/\d/);
  });
  it("returns em-dash for null", () => {
    expect(formatDateTime(null)).toBe("—");
  });
  it("returns em-dash on invalid", () => {
    expect(formatDateTime("xx")).toBe("—");
  });
});

describe("formatRelativeTime", () => {
  it("returns em-dash for null", () => {
    expect(formatRelativeTime(null)).toBe("—");
  });
  it("returns 'עכשיו' for <60s past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T12:00:30Z"));
    expect(formatRelativeTime("2026-05-07T12:00:00Z")).toBe("עכשיו");
  });
  it("future date falls back to formatDateTime", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T12:00:00Z"));
    const out = formatRelativeTime("2026-05-07T13:00:00Z");
    expect(out).not.toBe("—");
    expect(out).not.toBe("עכשיו");
  });
  it("formats minutes ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T12:30:00Z"));
    const out = formatRelativeTime("2026-05-07T12:00:00Z");
    expect(out).toMatch(/30/);
  });
  it("formats hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T15:00:00Z"));
    const out = formatRelativeTime("2026-05-07T12:00:00Z");
    expect(out).toMatch(/3/);
  });
  it("formats days ago for <7d", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T12:00:00Z"));
    const out = formatRelativeTime("2026-05-07T12:00:00Z");
    expect(out).toMatch(/3/);
  });
  it("falls back to formatDate for >=7d", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    const out = formatRelativeTime("2026-05-01T12:00:00Z");
    expect(out).toMatch(/2026/);
  });
  it("returns em-dash on bad input", () => {
    expect(formatRelativeTime("xx")).toBe("—");
  });
});

describe("formatNumber", () => {
  it("formats integer", () => {
    expect(formatNumber(1234)).toMatch(/1.?234/);
  });
  it("returns em-dash for null", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
  });
  it("accepts options", () => {
    const out = formatNumber(0.5, { style: "percent" });
    expect(out).toMatch(/50/);
  });
});

describe("formatCurrency", () => {
  it("formats ILS by default", () => {
    const out = formatCurrency(100);
    expect(out).toMatch(/100/);
  });
  it("accepts other currencies", () => {
    const out = formatCurrency(100, "USD");
    expect(out).toMatch(/100/);
  });
  it("returns em-dash for null", () => {
    expect(formatCurrency(null)).toBe("—");
  });
});

describe("formatBytes", () => {
  it("returns em-dash for null", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(undefined)).toBe("—");
  });
  it("formats 0 as '0 B'", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
  it("formats KB", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });
  it("formats MB", () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });
  it("formats GB", () => {
    expect(formatBytes(3 * 1024 ** 3)).toBe("3.0 GB");
  });
});
