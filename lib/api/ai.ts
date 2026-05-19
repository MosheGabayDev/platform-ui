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

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API !== "false";

export interface ChatRequest {
  message: string;
  /** Full PageContext on first message of a session; PageContextDiff after. */
  context: PageContext | null;
  /** Used by backend to detect stale context (HTTP 409 retry signal). */
  contextVersion?: number;
  /**
   * Caller's UI locale. Mock LLM uses this to pick its reply language
   * and to widen grammar matching with locale-specific variants
   * (e.g. "קח כרטיס 1002" ↔ "take ticket 1002"). Defaults to "en".
   */
  locale?: "en" | "he" | string;
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

// Batch 167 — grammar arrays (pair English + Hebrew). The mock LLM
// tries each variant in order; first match wins. Hebrew variants use
// permissive verb-stem matching ("קח" / "תקח" / "תפוס") plus accept
// the same hash-prefixed IDs as English.
const TAKE_TICKET_RES = [
  /\btake\s+ticket\s+#?(\d{3,6})\b/i,
  /(?:קח|תקח|תפוס|תיקח)\s+(?:את\s+)?(?:כרטיס|טיקט)\s+#?(\d{3,6})/i,
];
const RESOLVE_TICKET_RES = [
  /\bresolve\s+ticket\s+#?(\d{3,6})\b/i,
  /(?:סגור|תסגור|פתור|תפתור)\s+(?:את\s+)?(?:כרטיס|טיקט)\s+#?(\d{3,6})/i,
];
const CANCEL_MAINTENANCE_RES = [
  /\bcancel\s+maintenance\s+#?(\d{3,6})\b/i,
  /(?:בטל|תבטל)\s+(?:את\s+)?(?:חלון\s+תחזוקה|תחזוקה)\s+#?(\d{3,6})/i,
];
const CANCEL_BATCH_RES = [
  /\bcancel\s+batch\s+#?(\d{3,6})\b/i,
  /(?:בטל|תבטל)\s+(?:את\s+)?(?:אצווה|משימת אצווה|batch)\s+#?(\d{3,6})/i,
];
const SEARCH_USERS_RES = [
  /\bsearch\s+users?\s+(?:for\s+)?["']?([\w@. .-]+?)["']?\s*$/i,
  /(?:חפש|תחפש|חפשי)\s+(?:משתמש|משתמשים)\s+(?:עם\s+|של\s+|לפי\s+)?["']?([\w@.\s-]+?)["']?\s*$/i,
];
const DEACTIVATE_USER_RES = [
  /\bdeactivate\s+user\s+#?(\d{1,8})\b/i,
  /(?:השבת|השבית|נטרל)\s+(?:את\s+)?משתמש\s+#?(\d{1,8})/i,
];
const RESET_PASSWORD_RES = [
  /\breset\s+password\s+(?:for\s+)?user\s+#?(\d{1,8})\b/i,
  /(?:איפוס|אפס|תאפס)\s+(?:סיסמה|סיסמת)\s+(?:של\s+|ל)?משתמש\s+#?(\d{1,8})/i,
];
const LINK_WHATSAPP_RES = [
  /\blink\s+whatsapp\b/i,
  /(?:חבר|תחבר|קשר|תקשר)\s+(?:את\s+)?(?:ה)?whatsapp\b/i,
  /(?:חבר|תחבר|קשר|תקשר)\s+(?:את\s+)?ווצאפ/i,
];
const RELINK_WHATSAPP_RES = [
  /\brelink\s+whatsapp\s+(?:session\s+)?#?(\d{1,6})\b/i,
  /(?:חבר\s+מחדש|התחבר\s+מחדש)\s+(?:את\s+)?(?:ה)?(?:whatsapp|ווצאפ)\s+(?:שיחה\s+|session\s+)?#?(\d{1,6})/i,
];
const UNLINK_WHATSAPP_RES = [
  /\bunlink\s+whatsapp\s+(?:session\s+)?#?(\d{1,6})\b/i,
  /(?:נתק|תנתק|בטל\s+חיבור)\s+(?:את\s+)?(?:ה)?(?:whatsapp|ווצאפ)\s+(?:שיחה\s+|session\s+)?#?(\d{1,6})/i,
];
const CREATE_NOTE_RES = [
  /\bcreate\s+note\s+(.+?)\s*\|\s*(.+)$/i,
  /(?:צור|תצור|הוסף|תוסיף)\s+פתק\s+(.+?)\s*\|\s*(.+)$/i,
];
const ADD_BOOKMARK_RES = [
  /\badd\s+bookmark\s+(.+?)\s+(https?:\/\/\S+)\s*$/i,
  /(?:הוסף|תוסיף|צור|תצור)\s+(?:סימנייה|מועדף)\s+(.+?)\s+(https?:\/\/\S+)\s*$/i,
];

function firstMatch(res: RegExp[], message: string): RegExpMatchArray | null {
  for (const re of res) {
    const m = message.match(re);
    if (m) return m;
  }
  return null;
}

// Detects whether a message contains Hebrew letters — used as a
// fallback when the caller didn't pass `locale` explicitly. ASCII
// digits/punctuation are ignored; presence of any character in the
// U+0590..U+05FF Hebrew block flips the reply to he.
function looksHebrew(message: string): boolean {
  return /[֐-׿]/.test(message);
}

function pickLocale(req: { locale?: string; message: string }): "en" | "he" {
  if (req.locale === "he") return "he";
  if (req.locale === "en") return "en";
  // Locale not provided — sniff the message itself.
  return looksHebrew(req.message) ? "he" : "en";
}

function makeTokenId(): string {
  // Stable-ish synthetic token; backend will mint real tokens per R051
  return `tok-mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Locale-aware reply text per intent. The action proposal's `label`
// and `targetSummary` stay English here — the ActionPreviewCard
// substitutes skill.label_he at render time (batch 148).
const REPLIES = {
  takeTicket: {
    en: (id: number) =>
      `I'll take ticket #${id} for you. Confirm to assign it to your queue.`,
    he: (id: number) =>
      `אני אקח את כרטיס #${id} עבורך. אשר/י כדי להקצות אותו לתור שלך.`,
  },
  resolveTicket: {
    en: (id: number) =>
      `Resolve ticket #${id}? This is a high-impact action — you'll be asked to confirm.`,
    he: (id: number) =>
      `לסגור את כרטיס #${id}? זו פעולה עם השפעה גבוהה — תתבקש/י לאשר.`,
  },
  cancelMaintenance: {
    en: (id: number) =>
      `Cancel maintenance window #${id}? Affected services will be released back to monitoring.`,
    he: (id: number) =>
      `לבטל חלון תחזוקה #${id}? השירותים המושפעים יחזרו לניטור הרגיל.`,
  },
  cancelBatch: {
    en: (id: number) =>
      `Cancel batch task #${id}? In-flight items will halt at the next checkpoint.`,
    he: (id: number) =>
      `לבטל משימת אצווה #${id}? הפריטים שבעיבוד יעצרו בנקודת הביקורת הבאה.`,
  },
  searchUsers: {
    en: (q: string) => `I'll search users for "${q}".`,
    he: (q: string) => `אחפש משתמשים עבור "${q}".`,
  },
  resetPassword: {
    en: (id: number) =>
      `Send a password-reset email to user #${id}? They'll receive a one-time link.`,
    he: (id: number) =>
      `לשלוח אימייל איפוס סיסמה למשתמש #${id}? הוא יקבל קישור חד-פעמי.`,
  },
  deactivateUser: {
    en: (id: number) =>
      `Deactivate user #${id}? Their session will end and they will not be able to sign in until reactivated.`,
    he: (id: number) =>
      `להשבית את משתמש #${id}? ההפעלה שלו תסתיים והוא לא יוכל להתחבר עד הפעלה מחדש.`,
  },
  createNote: {
    en: (title: string) => `I'll create a note titled "${title}".`,
    he: (title: string) => `אני אצור פתק בכותרת "${title}".`,
  },
  addBookmark: {
    en: (title: string, url: string) =>
      `I'll add the bookmark "${title}" pointing at ${url}.`,
    he: (title: string, url: string) =>
      `אני אוסיף סימנייה "${title}" שמצביעה אל ${url}.`,
  },
  unlinkWa: {
    en: (id: number) =>
      `Unlink WhatsApp session #${id}? Archived chats stay; only the live link is severed.`,
    he: (id: number) =>
      `לנתק חיבור WhatsApp #${id}? השיחות הארכיוניות נשארות; רק החיבור החי מנותק.`,
  },
  relinkWa: {
    en: (id: number) =>
      `Re-link WhatsApp session #${id}? A fresh QR will be generated.`,
    he: (id: number) =>
      `לחבר מחדש את חיבור WhatsApp #${id}? יווצר קוד QR חדש.`,
  },
  linkWa: {
    en: () =>
      `Start a new WhatsApp linking flow? You'll be prompted to scan a QR code.`,
    he: () =>
      `להתחיל זרימת חיבור WhatsApp חדשה? תתבקש/י לסרוק קוד QR.`,
  },
};

function extractIntent(message: string, locale: "en" | "he"): MockIntent {
  const take = firstMatch(TAKE_TICKET_RES, message);
  if (take) {
    const ticketId = Number(take[1]);
    return {
      text: REPLIES.takeTicket[locale](ticketId),
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

  const resolve = firstMatch(RESOLVE_TICKET_RES, message);
  if (resolve) {
    const ticketId = Number(resolve[1]);
    return {
      text: REPLIES.resolveTicket[locale](ticketId),
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

  const cancelMaint = firstMatch(CANCEL_MAINTENANCE_RES, message);
  if (cancelMaint) {
    const windowId = Number(cancelMaint[1]);
    return {
      text: REPLIES.cancelMaintenance[locale](windowId),
      proposal: {
        tokenId: makeTokenId(),
        actionId: "helpdesk.maintenance.cancel",
        label: `Cancel maintenance window #${windowId}`,
        targetSummary: `Cancel scheduled maintenance window #${windowId}`,
        capabilityLevel: "DESTRUCTIVE",
        expiresAt: Date.now() + 30_000,
        params: { windowId, reason: "Cancelled via AI assistant" },
      },
    };
  }

  const cancelBatch = firstMatch(CANCEL_BATCH_RES, message);
  if (cancelBatch) {
    const taskId = Number(cancelBatch[1]);
    return {
      text: REPLIES.cancelBatch[locale](taskId),
      proposal: {
        tokenId: makeTokenId(),
        actionId: "helpdesk.batch.cancel",
        label: `Cancel batch task #${taskId}`,
        targetSummary: `Cancel running batch task #${taskId}`,
        capabilityLevel: "WRITE_HIGH",
        expiresAt: Date.now() + 30_000,
        params: { taskId, reason: "Cancelled via AI assistant" },
      },
    };
  }

  const searchUsers = firstMatch(SEARCH_USERS_RES, message);
  if (searchUsers) {
    const query = searchUsers[1]!.trim();
    return {
      text: REPLIES.searchUsers[locale](query),
      proposal: {
        tokenId: makeTokenId(),
        actionId: "users.search",
        label: `Search users for "${query}"`,
        targetSummary: `Find users matching "${query}"`,
        capabilityLevel: "READ",
        expiresAt: Date.now() + 60_000,
        params: { query },
      },
    };
  }

  const resetPassword = firstMatch(RESET_PASSWORD_RES, message);
  if (resetPassword) {
    const userId = Number(resetPassword[1]);
    return {
      text: REPLIES.resetPassword[locale](userId),
      proposal: {
        tokenId: makeTokenId(),
        actionId: "users.reset_password",
        label: `Reset password for user #${userId}`,
        targetSummary: `Email password-reset link to user account #${userId}`,
        capabilityLevel: "WRITE_LOW",
        expiresAt: Date.now() + 60_000,
        params: { userId },
      },
    };
  }

  const deactivateUser = firstMatch(DEACTIVATE_USER_RES, message);
  if (deactivateUser) {
    const userId = Number(deactivateUser[1]);
    return {
      text: REPLIES.deactivateUser[locale](userId),
      proposal: {
        tokenId: makeTokenId(),
        actionId: "users.deactivate",
        label: `Deactivate user #${userId}`,
        targetSummary: `Deactivate user account #${userId}`,
        capabilityLevel: "DESTRUCTIVE",
        expiresAt: Date.now() + 30_000,
        params: { userId, reason: "Deactivated via AI assistant" },
      },
    };
  }

  const createNote = firstMatch(CREATE_NOTE_RES, message);
  if (createNote) {
    const title = createNote[1]!.trim();
    const body = createNote[2]!.trim();
    return {
      text: REPLIES.createNote[locale](title),
      proposal: {
        tokenId: makeTokenId(),
        actionId: "notes.create",
        label: `Create note: ${title}`,
        targetSummary: `New personal note "${title}"`,
        capabilityLevel: "WRITE_LOW",
        expiresAt: Date.now() + 60_000,
        params: { title, body },
      },
    };
  }

  const addBookmark = firstMatch(ADD_BOOKMARK_RES, message);
  if (addBookmark) {
    const title = addBookmark[1]!.trim();
    const url = addBookmark[2]!.trim();
    return {
      text: REPLIES.addBookmark[locale](title, url),
      proposal: {
        tokenId: makeTokenId(),
        actionId: "bookmarks.create",
        label: `Add bookmark: ${title}`,
        targetSummary: `Shared bookmark "${title}" → ${url}`,
        capabilityLevel: "WRITE_LOW",
        expiresAt: Date.now() + 60_000,
        params: { title, url },
      },
    };
  }

  const unlinkWa = firstMatch(UNLINK_WHATSAPP_RES, message);
  if (unlinkWa) {
    const sessionId = Number(unlinkWa[1]);
    return {
      text: REPLIES.unlinkWa[locale](sessionId),
      proposal: {
        tokenId: makeTokenId(),
        actionId: "whatsapp.session.unlink",
        label: `Unlink WhatsApp session #${sessionId}`,
        targetSummary: `Sever live WhatsApp link for session #${sessionId}`,
        capabilityLevel: "DESTRUCTIVE",
        expiresAt: Date.now() + 30_000,
        params: { sessionId },
      },
    };
  }

  const relinkWa = firstMatch(RELINK_WHATSAPP_RES, message);
  if (relinkWa) {
    const sessionId = Number(relinkWa[1]);
    return {
      text: REPLIES.relinkWa[locale](sessionId),
      proposal: {
        tokenId: makeTokenId(),
        actionId: "whatsapp.session.relink",
        label: `Re-link WhatsApp session #${sessionId}`,
        targetSummary: `Generate a new QR for WhatsApp session #${sessionId}`,
        capabilityLevel: "WRITE_LOW",
        expiresAt: Date.now() + 60_000,
        params: { sessionId },
      },
    };
  }

  if (firstMatch(LINK_WHATSAPP_RES, message)) {
    return {
      text: REPLIES.linkWa[locale](),
      proposal: {
        tokenId: makeTokenId(),
        actionId: "whatsapp.session.link",
        label: `Link a new WhatsApp account`,
        targetSummary: `Start WhatsApp QR linking flow`,
        capabilityLevel: "WRITE_LOW",
        expiresAt: Date.now() + 60_000,
        params: {},
      },
    };
  }

  // Fallback: plain text echo with rotating canned responses
  return { text: defaultMockReply(message, locale), proposal: null };
}

// Locale-aware rotating canned responses for unrecognized text.
// Hebrew variants added in batch 167 — previously a Hebrew user typing
// "היי" got an English fallback even though everything else in the UI
// is Hebrew.
const MOCK_RESPONSES: Record<
  "en" | "he",
  Array<(message: string) => string>
> = {
  en: [
    (m) => `(mock) Got it: "${m}". Try "take ticket 1002" to see action proposals.`,
    (m) => `(mock) "${m}" — this is a mock response. Backend not wired yet.`,
    () => `(mock) AI assistant is in scaffold mode. Backend integration coming soon.`,
  ],
  he: [
    (m) => `(מצב mock) הבנתי: "${m}". נסה/י "קח כרטיס 1002" כדי לראות הצעת פעולה.`,
    (m) => `(מצב mock) "${m}" — זו תגובה מדומה. ה-backend עדיין לא חובר.`,
    () => `(מצב mock) הסייען נמצא במצב פיגום. אינטגרציה עם ה-backend בקרוב.`,
  ],
};

let mockResponseIndex = 0;

function defaultMockReply(message: string, locale: "en" | "he"): string {
  const responders = MOCK_RESPONSES[locale];
  const responder = responders[mockResponseIndex % responders.length]!;
  mockResponseIndex++;
  return responder(message);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  if (MOCK_MODE) {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 400));

    const locale = pickLocale(req);
    const intent = extractIntent(req.message, locale);

    // Re-run with context if intent fell back to plain text
    const text = intent.proposal
      ? intent.text
      : req.context
        ? locale === "he"
          ? `(מצב mock) אתה בעמוד ${req.context.pageKey}. כתבת: "${req.message}". נסה/י "קח כרטיס 1002".`
          : `(mock) You're on ${req.context.pageKey}. You said: "${req.message}". Try "take ticket 1002".`
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
