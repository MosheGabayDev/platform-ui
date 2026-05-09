/**
 * @module lib/api/notes
 * Mock client for the Notes module — second vertical that proves the
 * platform plumbing is module-agnostic.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §1 task 5B.15.
 *
 * State persists via the cap-A `_mock-storage` shim so the demo
 * round-trips on reload.
 *
 * MOCK_MODE flip checklist (when 5B.15-BE lands):
 *   1. Set NEXT_PUBLIC_MOCK_API=false in env.
 *   2. Backend serves GET    /api/proxy/notes       → NoteListResponse
 *      (newest-first; org-scoped from JWT).
 *   3. Backend serves POST   /api/proxy/notes       → NoteListResponse
 *      Body: { title, body, tags?: string[] }. author_id + author_name
 *      come from the JWT — never from the request body.
 *   4. Backend serves DELETE /api/proxy/notes/:id   → NoteListResponse
 *      Owner-only delete enforced server-side; UI hides the button when
 *      `note.author_id !== session.user.id`.
 *   5. Tag autocomplete is a future enhancement: GET /api/proxy/notes/tags
 *      returns the distinct tag list. FE already accepts `string[]` so
 *      no shape change.
 *   6. Cap-A localStorage state is read-only after the flip — leave
 *      `loadMockState` for one release so existing demo seeds survive,
 *      then remove.
 *   7. Audit: backend MUST write `notes.created` + `notes.deleted`
 *      events to the platform audit log (cap R046). FE doesn't surface
 *      audit on this page yet — covered by /audit-log.
 */

import { loadMockState, saveMockState } from "@/lib/api/_mock-storage";
import { recordAuditEntry } from "@/lib/api/audit";
import type { Note } from "@/lib/modules/notes/types";

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API !== "false";

const STORAGE_KEY = "notes:v1";
const STORAGE_VERSION = 1;

const FIXTURE: Note[] = [
  {
    id: "n-001",
    created_at: "2026-05-08T09:00:00Z",
    updated_at: "2026-05-08T09:00:00Z",
    title: "Pilot kickoff agenda",
    body:
      "Acme + Globex joining 10:00. Cover: onboarding tour, AI-provider switch, audit-log demo. Capture pricing-tier blockers in feedback module.",
    tags: ["meeting", "pilot"],
    author_id: 1,
    author_name: "Demo Admin",
  },
  {
    id: "n-002",
    created_at: "2026-05-09T13:30:00Z",
    updated_at: "2026-05-09T13:30:00Z",
    title: "Q3 OKR draft",
    body:
      "Top result: ship 3 verticals on the same platform. Confidence: 0.6 — backend MVP still gating. Re-read after sales call.",
    tags: ["okr", "Q3"],
    author_id: 1,
    author_name: "Demo Admin",
  },
  {
    id: "n-003",
    created_at: "2026-05-10T08:15:00Z",
    updated_at: "2026-05-10T08:15:00Z",
    title: "Helpdesk → Notes API parity",
    body:
      "Both modules now share PlatformForm + DataTable + usePlatformMutation. No bespoke shells in either. Generic claim: provable.",
    tags: ["architecture"],
    author_id: 1,
    author_name: "Demo Admin",
  },
];

function load(): Note[] {
  return loadMockState<Note[]>(STORAGE_KEY, STORAGE_VERSION, FIXTURE);
}

export interface NoteListResponse {
  success: true;
  data: { items: Note[]; total: number };
}

export interface AddNoteInput {
  title: string;
  body: string;
  tags?: string[];
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy/notes${path}`, {
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

export async function fetchNotes(): Promise<NoteListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    const items = load();
    return { success: true, data: { items, total: items.length } };
  }
  return apiFetch<NoteListResponse>("");
}

export async function addNote(input: AddNoteInput): Promise<NoteListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    const now = new Date().toISOString();
    const item: Note = {
      id: `n-${Date.now().toString(36)}`,
      created_at: now,
      updated_at: now,
      title: input.title,
      body: input.body,
      tags: input.tags ?? [],
      author_id: 1,
      author_name: "Demo Admin",
    };
    const items = load();
    const next = [item, ...items];
    saveMockState(STORAGE_KEY, STORAGE_VERSION, next);
    // Mirror the backend contract: notes.created emits an audit event
    // (see MOCK_MODE checklist step 7). Fire-and-forget — audit failures
    // never break the user-facing mutation.
    void recordAuditEntry({
      action: "notes.created",
      category: "create",
      resource_type: "note",
      resource_id: item.id,
      metadata: { title: item.title, tag_count: item.tags.length },
    }).catch(() => {});
    return { success: true, data: { items: next, total: next.length } };
  }
  return apiFetch<NoteListResponse>("", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteNote(id: string): Promise<NoteListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    const items = load();
    const next = items.filter((n) => n.id !== id);
    saveMockState(STORAGE_KEY, STORAGE_VERSION, next);
    if (items.length !== next.length) {
      void recordAuditEntry({
        action: "notes.deleted",
        category: "delete",
        resource_type: "note",
        resource_id: id,
        metadata: {},
      }).catch(() => {});
    }
    return { success: true, data: { items: next, total: next.length } };
  }
  return apiFetch<NoteListResponse>(`/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
