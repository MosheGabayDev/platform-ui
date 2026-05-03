/**
 * AI assistant API client (chat surface).
 *
 * AI-shell-B Story 2.2 — MOCK IMPLEMENTATION until backend `/api/ai/chat`
 * lands per R048 partial cleanup of `apps/dashboard/`. Once the backend
 * endpoint is live, swap `MOCK_MODE = true` to false and the real
 * `/api/proxy/ai/chat` path takes over.
 *
 * In mock mode the server "LLM" supports a small intent grammar so
 * AI-shell-C action proposals can be exercised end-to-end:
 *   - "take ticket NNNN"     → proposes helpdesk.ticket.take
 *   - "resolve ticket NNNN"  → proposes helpdesk.ticket.resolve (high-tier)
 * Anything else → plain text reply.
 *
 * Spec: docs/system-upgrade/10-tasks/AI-shell-B-chat-llm/epic.md
 *       docs/system-upgrade/10-tasks/AI-shell-C-actions-confirm/epic.md
 */
import type {
  PageContext,
  ActionProposal,
} from "@/lib/hooks/use-assistant-session";

export const MOCK_MODE = true;

export interface ChatRequest {
  message: string;
  /** Full PageContext on first message of a session; PageContextDiff after. */
  context: PageContext | null;
  /** Used by backend to detect stale context (HTTP 409 retry signal). */
  contextVersion?: number;
}

export interface ChatResponse {
  /** Plain-text reply. May coexist with actionProposal as a friendly preface. */
  text: string;
  /** Echoed for client-side correlation. */
  contextVersion: number;
  /**
   * When the LLM decides the user asked for an action, returns a proposal.
   * Frontend renders it via ActionPreviewCard (AI-shell-C).
   */
  actionProposal: ActionProposal | null;
}

export class StaleContextError extends Error {
  constructor() {
    super("Stale context — frontend should re-emit full PageContext and retry");
    this.name = "StaleContextError";
  }
}

// ---------------------------------------------------------------------------
// Mock intent extraction
// ---------------------------------------------------------------------------

interface MockIntent {
  text: string;
  proposal: ActionProposal | null;
}

const TAKE_TICKET_RE = /\btake\s+ticket\s+#?(\d{3,6})\b/i;
const RESOLVE_TICKET_RE = /\bresolve\s+ticket\s+#?(\d{3,6})\b/i;

function makeTokenId(): string {
  // Stable-ish synthetic token; backend will mint real tokens per R051
  return `tok-mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractIntent(message: string): MockIntent {
  const take = message.match(TAKE_TICKET_RE);
  if (take) {
    const ticketId = Number(take[1]);
    return {
      text: `I'll take ticket #${ticketId} for you. Confirm to assign it to your queue.`,
      proposal: {
        tokenId: makeTokenId(),
        actionId: "helpdesk.ticket.take",
        label: `Take ticket #${ticketId}`,
        targetSummary: `Assign helpdesk ticket #${ticketId} to the current user`,
        capabilityLevel: "WRITE_LOW",
        expiresAt: Date.now() + 60_000,
        params: { ticketId },
      },
    };
  }

  const resolve = message.match(RESOLVE_TICKET_RE);
  if (resolve) {
    const ticketId = Number(resolve[1]);
    return {
      text: `Resolve ticket #${ticketId}? This is a high-impact action — you'll be asked to confirm.`,
      proposal: {
        tokenId: makeTokenId(),
        actionId: "helpdesk.ticket.resolve",
        label: `Resolve ticket #${ticketId}`,
        targetSummary: `Mark helpdesk ticket #${ticketId} as resolved`,
        capabilityLevel: "WRITE_HIGH",
        expiresAt: Date.now() + 30_000,
        params: { ticketId, resolution: "Resolved via AI assistant" },
      },
    };
  }

  // Fallback: plain text echo with rotating canned responses
  return { text: defaultMockReply(message), proposal: null };
}

const MOCK_RESPONSES: Array<(message: string, ctx: PageContext | null) => string> = [
  (m, ctx) =>
    ctx
      ? `(mock) You're on ${ctx.pageKey}. You said: "${m}". Try "take ticket 1002" to see action proposals.`
      : `(mock) No page context registered. You said: "${m}".`,
  (m) => `(mock) Got it: "${m}". This is a mock response — backend not wired yet.`,
  () => `(mock) AI assistant is in scaffold mode. Backend integration coming soon.`,
];

let mockResponseIndex = 0;

function defaultMockReply(message: string): string {
  // Use the first responder for context-aware replies; rotate the rest for variety
  const responder = MOCK_RESPONSES[mockResponseIndex % MOCK_RESPONSES.length];
  mockResponseIndex++;
  return responder(message, null);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  if (MOCK_MODE) {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 400));

    const intent = extractIntent(req.message);

    // Re-run with context if intent fell back to plain text
    const text = intent.proposal
      ? intent.text
      : req.context
        ? `(mock) You're on ${req.context.pageKey}. You said: "${req.message}". Try "take ticket 1002".`
        : intent.text;

    return {
      text,
      contextVersion: req.contextVersion ?? 1,
      actionProposal: intent.proposal,
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

/** Reset mock response counter — for tests only. */
export function _resetMockState(): void {
  mockResponseIndex = 0;
}
