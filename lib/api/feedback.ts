/**
 * @module lib/api/feedback
 * Mock client for the customer-feedback aggregator.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §7 task 10.05.
 *
 * Persists items to localStorage via the cap-A `_mock-storage` shim so
 * the demo round-trips on page reload.
 *
 * MOCK_MODE flip checklist (when 10.05-BE lands):
 *   1. Set NEXT_PUBLIC_MOCK_API=false in env.
 *   2. Backend serves GET  /api/proxy/feedback              → FeedbackListResponse
 *      (newest-first; org-scoped from JWT; admin role required).
 *   3. Backend serves POST /api/proxy/feedback              → FeedbackListResponse
 *      (status defaults to "new"; reporter optional; system_admin only).
 *   4. Backend serves PATCH /api/proxy/feedback/:id/status  → FeedbackListResponse
 *      Frontend triages out-of-band today; flip-time we add a status
 *      mutation export here that takes { id, status }.
 *   5. Linear webhook: backend posts converted items to Linear and
 *      writes the issue URL into `backlog_link` on the feedback row.
 *      Frontend just renders `backlog_link` as a hyperlink — no FE change.
 *   6. Email intake (forwarded to feedback@platform.local) becomes a
 *      backend ingestion job; the FE surface is unchanged.
 *   7. Cap-A localStorage state is read-only after the flip — leave the
 *      `loadMockState` import in place for one release so existing demo
 *      installs don't lose their seeded items, then remove.
 */

import {
  loadMockState,
  saveMockState,
} from "@/lib/api/_mock-storage";
import type {
  FeedbackItem,
  FeedbackStatus,
  FeedbackType,
} from "@/lib/modules/feedback/types";

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API !== "false";

const STORAGE_KEY = "feedback:v1";
const STORAGE_VERSION = 1;

const FIXTURE: FeedbackItem[] = [
  {
    id: "fb-001",
    received_at: "2026-05-04T08:30:00Z",
    source: "pilot-call",
    type: "feature",
    status: "new",
    content:
      "Customers want to bulk-export their audit log entries straight to a SIEM webhook (not just CSV). Mentioned by Acme + Globex during the Tuesday call.",
    reporter: "alice@acme.test",
    backlog_link: null,
  },
  {
    id: "fb-002",
    received_at: "2026-05-05T14:12:00Z",
    source: "email",
    type: "bug",
    status: "triaged",
    content:
      "Sidebar search highlights non-matching items when query contains a slash. Repro: type 'helpdesk/' — the helpdesk parent gets highlighted twice.",
    reporter: "bob@globex.test",
    backlog_link: null,
  },
  {
    id: "fb-003",
    received_at: "2026-05-06T11:00:00Z",
    source: "in-app",
    type: "insight",
    status: "converted",
    content:
      "Onboarding wizard takes ~6 minutes for first-time admins. Most time is spent picking the AI provider — they don't know which one to choose. Suggest defaulting to OpenAI with a 'change later' link.",
    reporter: null,
    backlog_link: "https://linear.example/PE-42",
  },
];

function load(): FeedbackItem[] {
  return loadMockState<FeedbackItem[]>(STORAGE_KEY, STORAGE_VERSION, FIXTURE);
}

export interface FeedbackListResponse {
  success: true;
  data: { items: FeedbackItem[]; total: number };
}

export interface AddFeedbackInput {
  source: string;
  type: FeedbackType;
  content: string;
  reporter?: string | null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy/feedback${path}`, {
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

export async function fetchFeedback(): Promise<FeedbackListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 100));
    const items = load();
    return { success: true, data: { items, total: items.length } };
  }
  return apiFetch<FeedbackListResponse>("");
}

export async function addFeedback(input: AddFeedbackInput): Promise<FeedbackListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 100));
    const items = load();
    const item: FeedbackItem = {
      id: `fb-${Date.now().toString(36)}`,
      received_at: new Date().toISOString(),
      source: input.source,
      type: input.type,
      status: "new" as FeedbackStatus,
      content: input.content,
      reporter: input.reporter ?? null,
      backlog_link: null,
    };
    const next = [item, ...items];
    saveMockState(STORAGE_KEY, STORAGE_VERSION, next);
    return { success: true, data: { items: next, total: next.length } };
  }
  return apiFetch<FeedbackListResponse>("", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
