/**
 * AI assistant API client (chat surface).
 *
 * AI-shell-B Story 2.2 — MOCK IMPLEMENTATION until backend `/api/ai/chat`
 * lands per R048 partial cleanup of `apps/dashboard/`. Once the backend
 * endpoint is live, swap `MOCK_MODE = true` to false and the real
 * `/api/proxy/ai/chat` path takes over.
 *
 * Spec: docs/system-upgrade/10-tasks/AI-shell-B-chat-llm/epic.md
 */
import type { PageContext } from "@/lib/hooks/use-assistant-session";

/**
 * Toggle this to `false` once the Flask `/api/ai/chat` endpoint is live and
 * `R048 partial` has migrated `apps/dashboard/` AI calls to the gateway.
 * Until then, the mock returns canned responses so the UI can be developed
 * end-to-end.
 */
export const MOCK_MODE = true;

export interface ChatRequest {
  message: string;
  /** Full PageContext on first message of a session; PageContextDiff after. */
  context: PageContext | null;
  /** Used by backend to detect stale context (HTTP 409 retry signal). */
  contextVersion?: number;
}

export interface ChatResponse {
  /** Plain-text reply; AI-shell-B is text-only (no action proposals — those land in AI-shell-C). */
  text: string;
  /** Echoed for client-side correlation. */
  contextVersion: number;
  /** Reserved for AI-shell-C (action proposals). Always null in this round. */
  actionProposal: null;
}

export class StaleContextError extends Error {
  constructor() {
    super("Stale context — frontend should re-emit full PageContext and retry");
    this.name = "StaleContextError";
  }
}

const MOCK_RESPONSES: Array<(message: string, ctx: PageContext | null) => string> = [
  (m, ctx) =>
    ctx
      ? `(mock) You're on ${ctx.pageKey}. You said: "${m}". Real AI responses land in AI-shell-B post-R048.`
      : `(mock) No page context registered. You said: "${m}".`,
  (m) => `(mock) Got it: "${m}". This is a mock response — backend not wired yet.`,
  () => `(mock) AI assistant is in scaffold mode. Backend integration coming soon.`,
];

let mockResponseIndex = 0;

export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  if (MOCK_MODE) {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 400));
    const responder = MOCK_RESPONSES[mockResponseIndex % MOCK_RESPONSES.length];
    mockResponseIndex++;
    return {
      text: responder(req.message, req.context),
      contextVersion: req.contextVersion ?? 1,
      actionProposal: null,
    };
  }

  const res = await fetch("/api/proxy/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (res.status === 409) {
    throw new StaleContextError();
  }
  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Reset mock response counter — for tests only.
 */
export function _resetMockState(): void {
  mockResponseIndex = 0;
}
