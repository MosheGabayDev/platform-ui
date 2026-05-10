/**
 * @module lib/api/bookmarks
 * Mock client for the Bookmarks module — third vertical (lite).
 * Exercises the minimum module-registry contract: spec + manifest +
 * one mutation (add).
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §1 task 5B.16.
 *
 * Persists via the cap-A `_mock-storage` shim.
 *
 * MOCK_MODE flip checklist (when 5B.16-BE lands):
 *   1. Set NEXT_PUBLIC_MOCK_API=false in env.
 *   2. Backend serves GET  /api/proxy/bookmarks → BookmarkListResponse
 *      (newest-first; org-scoped from JWT).
 *   3. Backend serves POST /api/proxy/bookmarks → BookmarkListResponse
 *      Body: { title, url }. URL validated server-side; FE pre-validates
 *      via `new URL(url)` and surfaces a translated error on bad input.
 *      added_by_id + added_by_name come from JWT — never from body.
 *   4. Backend serves DELETE /api/proxy/bookmarks/:id → BookmarkListResponse
 *      Owner-only delete enforced server-side. UI hides the delete
 *      button when `bookmark.added_by_id !== session.user.id`.
 *   5. Audit: backend MUST write `bookmarks.created` and
 *      `bookmarks.deleted` to the platform audit log (cap R046).
 *      FE doesn't surface audit on this page.
 *   6. Cap-A localStorage state is read-only after the flip — leave
 *      `loadMockState` for one release so existing demo seeds survive,
 *      then remove.
 *   7. Edit is still out of scope for v1 — add when a real consumer
 *      requests it; backend will need PATCH /api/proxy/bookmarks/:id.
 */

import { loadMockState, saveMockState } from "@/lib/api/_mock-storage";
import { recordAuditEntry } from "@/lib/api/audit";
import type { Bookmark } from "@/lib/modules/bookmarks/types";

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API !== "false";

const STORAGE_KEY = "bookmarks:v1";
const STORAGE_VERSION = 1;

const FIXTURE: Bookmark[] = [
  {
    id: "bm-001",
    created_at: "2026-05-08T09:00:00Z",
    title: "Internal — engineering wiki",
    url: "https://wiki.example.com/eng",
    added_by_id: 1,
    added_by_name: "Demo Admin",
  },
  {
    id: "bm-002",
    created_at: "2026-05-09T11:30:00Z",
    title: "Status page",
    url: "https://status.example.com",
    added_by_id: 1,
    added_by_name: "Demo Admin",
  },
];

function load(): Bookmark[] {
  return loadMockState<Bookmark[]>(STORAGE_KEY, STORAGE_VERSION, FIXTURE);
}

export interface BookmarkListResponse {
  success: true;
  data: { items: Bookmark[]; total: number };
}

export interface AddBookmarkInput {
  title: string;
  url: string;
}

export class InvalidUrlError extends Error {
  constructor() {
    super("INVALID_URL");
    this.name = "InvalidUrlError";
  }
}

function validateUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new InvalidUrlError();
    }
    return u.toString();
  } catch {
    throw new InvalidUrlError();
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy/bookmarks${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchBookmarks(): Promise<BookmarkListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    const items = load();
    return { success: true, data: { items, total: items.length } };
  }
  return apiFetch<BookmarkListResponse>("");
}

export async function addBookmark(input: AddBookmarkInput): Promise<BookmarkListResponse> {
  // Pre-validate on both paths so the failure mode is consistent.
  const url = validateUrl(input.url);
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    const item: Bookmark = {
      id: `bm-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
      title: input.title.trim(),
      url,
      added_by_id: 1,
      added_by_name: "Demo Admin",
    };
    const items = load();
    const next = [item, ...items];
    saveMockState(STORAGE_KEY, STORAGE_VERSION, next);
    void recordAuditEntry({
      action: "bookmarks.created",
      category: "create",
      resource_type: "bookmark",
      resource_id: item.id,
      metadata: { title: item.title, host: new URL(url).host },
    }).catch(() => {});
    return { success: true, data: { items: next, total: next.length } };
  }
  return apiFetch<BookmarkListResponse>("", {
    method: "POST",
    body: JSON.stringify({ title: input.title.trim(), url }),
  });
}

export async function deleteBookmark(id: string): Promise<BookmarkListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    const items = load();
    const next = items.filter((b) => b.id !== id);
    saveMockState(STORAGE_KEY, STORAGE_VERSION, next);
    if (items.length !== next.length) {
      void recordAuditEntry({
        action: "bookmarks.deleted",
        category: "delete",
        resource_type: "bookmark",
        resource_id: id,
        metadata: {},
      }).catch(() => {});
    }
    return { success: true, data: { items: next, total: next.length } };
  }
  return apiFetch<BookmarkListResponse>(`/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
