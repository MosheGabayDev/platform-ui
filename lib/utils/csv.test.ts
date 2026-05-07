/**
 * Tests for the browser-side CSV download wrapper (`lib/utils/csv.ts`).
 *
 * The pure serialization (escapeCsvCell, rowsToCsv) lives in
 * lib/platform/export/csv.ts and is tested there. Here we cover the
 * browser-only download path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadCsv, exportToCsv, escapeCsvCell, rowsToCsv } from "./csv";

let createObjectURL: ReturnType<typeof vi.fn>;
let revokeObjectURL: ReturnType<typeof vi.fn>;
let appendChild: ReturnType<typeof vi.fn>;
let removeChild: ReturnType<typeof vi.fn>;
let createElement: ReturnType<typeof vi.fn>;
let clickedLink: HTMLAnchorElement | null;

beforeEach(() => {
  clickedLink = null;
  createObjectURL = vi.fn(() => "blob:mock-url");
  revokeObjectURL = vi.fn();
  appendChild = vi.fn();
  removeChild = vi.fn();
  // happy-dom provides URL/document; spy on the methods we hit.
  Object.defineProperty(globalThis, "URL", {
    value: { ...URL, createObjectURL, revokeObjectURL },
    configurable: true,
  });

  const realCreate = document.createElement.bind(document);
  createElement = vi.fn((tag: string) => {
    const el = realCreate(tag);
    if (tag === "a") {
      const a = el as HTMLAnchorElement;
      // capture .click() so we can assert filename + href before download.
      a.click = vi.fn(() => {
        clickedLink = a;
      });
    }
    return el;
  });
  document.createElement = createElement as unknown as typeof document.createElement;
  document.body.appendChild = appendChild as unknown as typeof document.body.appendChild;
  document.body.removeChild = removeChild as unknown as typeof document.body.removeChild;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("downloadCsv", () => {
  it("creates a blob, generates an object URL, and clicks an <a>", () => {
    downloadCsv("a,b,c\n1,2,3", "demo");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createElement).toHaveBeenCalledWith("a");
    expect(appendChild).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
    expect(clickedLink).not.toBeNull();
    expect(clickedLink!.href).toBe("blob:mock-url");
    expect(clickedLink!.download).toMatch(/^demo-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("revokes the object URL after triggering download", () => {
    downloadCsv("x", "y");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});

describe("exportToCsv", () => {
  it("serializes rows + downloads in one call", () => {
    const rows = [{ a: 1, b: "two, with comma" }];
    const cols = [
      { key: "a" as const, label: "A" },
      { key: "b" as const, label: "B" },
    ];
    exportToCsv(rows, cols, "demo");
    expect(clickedLink).not.toBeNull();
    expect(clickedLink!.download).toMatch(/^demo-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

describe("re-exports — escapeCsvCell + rowsToCsv (smoke)", () => {
  // Just confirms the re-export contract; full behavior is covered by
  // the platform-layer tests in lib/platform/export/csv.test.ts.
  it("escapeCsvCell wraps cells with quotes when they contain commas", () => {
    expect(escapeCsvCell("a, b")).toBe('"a, b"');
  });

  it("rowsToCsv produces header + value rows", () => {
    const out = rowsToCsv(
      [{ a: 1, b: 2 }],
      [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
      ],
    );
    // rowsToCsv prepends a UTF-8 BOM so Excel reads non-ASCII correctly.
    expect(out.split("\n")[0].replace(/^﻿/, "")).toBe("A,B");
  });
});
