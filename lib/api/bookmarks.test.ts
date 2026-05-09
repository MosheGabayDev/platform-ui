/**
 * Bookmarks client (mock mode) — list + add round-trip via localStorage.
 * URL validation is exercised separately because it's the only "logic"
 * surface in the lite contract.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  fetchBookmarks,
  addBookmark,
  InvalidUrlError,
  MOCK_MODE,
} from "./bookmarks";
import { clearMockState } from "@/lib/api/_mock-storage";
import * as auditModule from "@/lib/api/audit";

beforeEach(() => {
  clearMockState("bookmarks:");
  localStorage.clear();
});

describe("bookmarks client (mock mode)", () => {
  it("MOCK_MODE is true until backend lands", () => {
    expect(MOCK_MODE).toBe(true);
  });

  it("fetchBookmarks returns the seeded fixture (2 items)", async () => {
    const res = await fetchBookmarks();
    expect(res.success).toBe(true);
    expect(res.data.items.length).toBe(2);
  });

  it("addBookmark prepends and persists with normalized URL", async () => {
    await addBookmark({ title: "GitHub", url: "https://github.com" });
    const res = await fetchBookmarks();
    expect(res.data.items.length).toBe(3);
    const top = res.data.items[0]!;
    expect(top.title).toBe("GitHub");
    // URL is normalized via `new URL(...).toString()` (trailing slash for root paths).
    expect(top.url).toBe("https://github.com/");
    expect(top.id).toMatch(/^bm-/);
  });

  it("addBookmark trims whitespace on title", async () => {
    await addBookmark({ title: "  Trimmed  ", url: "https://example.com" });
    const res = await fetchBookmarks();
    expect(res.data.items[0]!.title).toBe("Trimmed");
  });

  it("addBookmark rejects non-http(s) protocols", async () => {
    await expect(
      addBookmark({ title: "ftp", url: "ftp://example.com" }),
    ).rejects.toBeInstanceOf(InvalidUrlError);
  });

  it("addBookmark rejects malformed URLs", async () => {
    await expect(
      addBookmark({ title: "garbage", url: "not a url" }),
    ).rejects.toBeInstanceOf(InvalidUrlError);
  });

  it("multiple addBookmark calls preserve newest-first order", async () => {
    await addBookmark({ title: "A", url: "https://a.com" });
    await addBookmark({ title: "B", url: "https://b.com" });
    const res = await fetchBookmarks();
    expect(res.data.items[0]!.title).toBe("B");
    expect(res.data.items[1]!.title).toBe("A");
  });

  it("addBookmark emits a bookmarks.created audit event with the host", async () => {
    const spy = vi.spyOn(auditModule, "recordAuditEntry").mockResolvedValue({
      success: true,
    } as never);
    await addBookmark({ title: "Wiki", url: "https://wiki.example.com/eng" });
    await Promise.resolve();
    expect(spy).toHaveBeenCalledOnce();
    const arg = spy.mock.calls[0]![0];
    expect(arg.action).toBe("bookmarks.created");
    expect(arg.category).toBe("create");
    expect(arg.resource_type).toBe("bookmark");
    expect(arg.metadata).toMatchObject({ title: "Wiki", host: "wiki.example.com" });
    spy.mockRestore();
  });

  it("addBookmark does NOT emit audit when URL validation fails", async () => {
    const spy = vi.spyOn(auditModule, "recordAuditEntry").mockResolvedValue({
      success: true,
    } as never);
    await expect(
      addBookmark({ title: "bad", url: "ftp://bad.com" }),
    ).rejects.toBeInstanceOf(InvalidUrlError);
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
