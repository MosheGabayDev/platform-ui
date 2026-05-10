/**
 * @module lib/api/whatsapp
 * Client for the user-owned WhatsApp archive module.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md (whatsapp parity).
 *
 * MOCK_MODE flip checklist (when WhatsApp BE is wired into staging):
 *   1. Set NEXT_PUBLIC_MOCK_API=false in env.
 *   2. Backend serves GET    /api/proxy/whatsapp/api/my/sessions
 *      → WhatsAppSessionsResponse — owner-scoped from JWT.
 *   3. Backend serves POST   /api/proxy/whatsapp/api/my/sessions
 *      → WhatsAppSessionMutationResponse — opens a new linking flow.
 *   4. Backend serves GET    /api/proxy/whatsapp/api/my/sessions/:id/qr
 *      → WhatsAppQrResponse — polls the QR/state machine until ready.
 *   5. Backend serves POST   /api/proxy/whatsapp/api/my/sessions/:id/relink
 *      → WhatsAppSessionMutationResponse — generates a fresh QR.
 *   6. Backend serves DELETE /api/proxy/whatsapp/api/my/sessions/:id
 *      → WhatsAppSessionMutationResponse — unlinks (archive retained).
 *   7. Audit: backend writes `whatsapp.session.linked`,
 *      `whatsapp.session.relinked`, `whatsapp.session.unlinked`
 *      events to the platform audit log (cap R046). FE already emits
 *      the same actions in mock mode for end-to-end demo continuity;
 *      after the flip, FE writes still fire and the backend de-dupes
 *      by (action, resource_id, request_id).
 *   8. Cap-A localStorage state is read-only after the flip — leave
 *      `loadMockState` for one release so existing demo seeds survive,
 *      then remove.
 */

import { loadMockState, saveMockState } from "@/lib/api/_mock-storage";
import { recordAuditEntry } from "@/lib/api/audit";
import type {
  WhatsAppChat,
  WhatsAppChatShare,
  WhatsAppChatShareMutationResponse,
  WhatsAppChatListParams,
  WhatsAppChatSharesResponse,
  WhatsAppChatsResponse,
  WhatsAppMessage,
  WhatsAppMessageListParams,
  WhatsAppMessageSearchParams,
  WhatsAppMessageSearchResponse,
  WhatsAppMessageSearchResult,
  WhatsAppMessagesResponse,
  WhatsAppQrResponse,
  WhatsAppShareChatInput,
  WhatsAppShareRecipientsResponse,
  WhatsAppShareUserOption,
  WhatsAppSession,
  WhatsAppSessionMutationResponse,
  WhatsAppSessionState,
  WhatsAppSessionsResponse,
} from "@/lib/modules/whatsapp/types";

// Re-export types so existing imports `from "@/lib/api/whatsapp"` keep working.
export type {
  WhatsAppChat,
  WhatsAppChatAccessKind,
  WhatsAppChatKind,
  WhatsAppChatListParams,
  WhatsAppChatShare,
  WhatsAppChatShareMutationResponse,
  WhatsAppChatSharesResponse,
  WhatsAppChatsMeta,
  WhatsAppChatsResponse,
  WhatsAppMessage,
  WhatsAppMessageListParams,
  WhatsAppMessageSearchParams,
  WhatsAppMessageSearchResponse,
  WhatsAppMessageSearchResult,
  WhatsAppMessagesMeta,
  WhatsAppMessagesResponse,
  WhatsAppQrResponse,
  WhatsAppShareChatInput,
  WhatsAppShareRecipientsResponse,
  WhatsAppShareUserOption,
  WhatsAppSession,
  WhatsAppSessionMutationResponse,
  WhatsAppSessionState,
  WhatsAppSessionsResponse,
} from "@/lib/modules/whatsapp/types";

const BASE = "/api/proxy/whatsapp";
const STORAGE_KEY = "whatsapp:sessions:v1";
const SHARES_STORAGE_KEY = "whatsapp:shares:v1";
const STORAGE_VERSION = 1;
export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API !== "false";

const MOCK_CHATS: WhatsAppChat[] = [
  {
    id: 11001,
    wa_chat_id: "972501112222@c.us",
    kind: "private",
    display_name: "Dana Levi",
    is_archived: false,
    is_muted: false,
    participant_count: 2,
    last_message_at: "2026-05-10T06:45:00.000Z",
    first_seen_at: "2026-05-01T08:10:00.000Z",
    last_seen_at: "2026-05-10T06:45:00.000Z",
    meta: { last_message_preview: "Can you send the invoice PDF again?" },
    access_kind: "owner",
    share: null,
  },
  {
    id: 11002,
    wa_chat_id: "120363045678901234@g.us",
    kind: "group",
    display_name: "Ops handoff",
    is_archived: false,
    is_muted: true,
    participant_count: 8,
    last_message_at: "2026-05-09T18:20:00.000Z",
    first_seen_at: "2026-04-22T09:00:00.000Z",
    last_seen_at: "2026-05-09T18:20:00.000Z",
    meta: { last_message_preview: "Shift summary uploaded to the shared folder." },
    access_kind: "owner",
    share: null,
  },
  {
    id: 11003,
    wa_chat_id: "972521234567@c.us",
    kind: "private",
    display_name: "Yossi Cohen",
    is_archived: true,
    is_muted: false,
    participant_count: 2,
    last_message_at: "2026-05-07T13:05:00.000Z",
    first_seen_at: "2026-03-18T11:35:00.000Z",
    last_seen_at: "2026-05-07T13:05:00.000Z",
    meta: { last_message_preview: "Thanks, closing this for now." },
    access_kind: "owner",
    share: null,
  },
  {
    id: 11004,
    wa_chat_id: "120363055555555555@g.us",
    kind: "group",
    display_name: "Shared escalation",
    is_archived: false,
    is_muted: false,
    participant_count: 5,
    last_message_at: "2026-05-10T05:15:00.000Z",
    first_seen_at: "2026-05-08T10:00:00.000Z",
    last_seen_at: "2026-05-10T05:15:00.000Z",
    meta: { last_message_preview: "This thread was shared for case review." },
    access_kind: "shared",
    share: {
      id: 88001,
      chat_id: 11004,
      shared_with_user_id: 42,
      shared_with_user_name: "Current User",
      shared_with_user_email: "current.user@example.com",
      shared_by_user_id: 7,
      shared_by_user_name: "Ops Lead",
      shared_by_user_email: "ops.lead@example.com",
      created_at: "2026-05-10T05:00:00.000Z",
      expires_at: "2026-06-10T05:00:00.000Z",
      note: "Review this escalation before the next shift.",
      revoked_at: null,
    },
  },
];

const MOCK_MESSAGES: Record<number, WhatsAppMessage[]> = {
  11001: [
    {
      id: 91004,
      wa_message_id: "mock-dana-4",
      chat_id: 11001,
      sender_contact_id: 7001,
      sender_phone: "+972501112222",
      sender_is_me: false,
      ts: "2026-05-10T06:45:00.000Z",
      body: "Can you send the invoice PDF again?",
      type: "chat",
      has_media: false,
      media_mime: null,
      media_size_bytes: null,
      media_sha256: null,
      media_caption: null,
      media_url_endpoint: null,
      quoted_message_id: null,
      mentions: [],
      reactions: [],
      edited_at: null,
      revoked_at: null,
      erased_at: null,
      captured_at: "2026-05-10T06:45:03.000Z",
    },
    {
      id: 91003,
      wa_message_id: "mock-dana-3",
      chat_id: 11001,
      sender_contact_id: null,
      sender_phone: null,
      sender_is_me: true,
      ts: "2026-05-10T06:38:00.000Z",
      body: "Uploading the signed version here.",
      type: "document",
      has_media: true,
      media_mime: "application/pdf",
      media_size_bytes: 182330,
      media_sha256: "mock-sha256",
      media_caption: "invoice-may.pdf",
      media_url_endpoint: "/whatsapp/api/media/91003/url",
      quoted_message_id: null,
      mentions: [],
      reactions: [],
      edited_at: null,
      revoked_at: null,
      erased_at: null,
      captured_at: "2026-05-10T06:38:05.000Z",
    },
    {
      id: 91002,
      wa_message_id: "mock-dana-2",
      chat_id: 11001,
      sender_contact_id: 7001,
      sender_phone: "+972501112222",
      sender_is_me: false,
      ts: "2026-05-10T06:30:00.000Z",
      body: "Looks good. I just need the attachment.",
      type: "chat",
      has_media: false,
      media_mime: null,
      media_size_bytes: null,
      media_sha256: null,
      media_caption: null,
      media_url_endpoint: null,
      quoted_message_id: null,
      mentions: [],
      reactions: [],
      edited_at: null,
      revoked_at: null,
      erased_at: null,
      captured_at: "2026-05-10T06:30:02.000Z",
    },
  ],
  11002: [
    {
      id: 92002,
      wa_message_id: "mock-ops-2",
      chat_id: 11002,
      sender_contact_id: 7012,
      sender_phone: "+972541234567",
      sender_is_me: false,
      ts: "2026-05-09T18:20:00.000Z",
      body: "Shift summary uploaded to the shared folder.",
      type: "chat",
      has_media: false,
      media_mime: null,
      media_size_bytes: null,
      media_sha256: null,
      media_caption: null,
      media_url_endpoint: null,
      quoted_message_id: null,
      mentions: [],
      reactions: [],
      edited_at: null,
      revoked_at: null,
      erased_at: null,
      captured_at: "2026-05-09T18:20:03.000Z",
    },
    {
      id: 92001,
      wa_message_id: "mock-ops-1",
      chat_id: 11002,
      sender_contact_id: null,
      sender_phone: null,
      sender_is_me: true,
      ts: "2026-05-09T18:05:00.000Z",
      body: "Please keep escalation notes in this thread.",
      type: "chat",
      has_media: false,
      media_mime: null,
      media_size_bytes: null,
      media_sha256: null,
      media_caption: null,
      media_url_endpoint: null,
      quoted_message_id: null,
      mentions: [],
      reactions: [],
      edited_at: null,
      revoked_at: null,
      erased_at: null,
      captured_at: "2026-05-09T18:05:01.000Z",
    },
  ],
  11003: [
    {
      id: 93001,
      wa_message_id: "mock-yossi-1",
      chat_id: 11003,
      sender_contact_id: 7021,
      sender_phone: "+972521234567",
      sender_is_me: false,
      ts: "2026-05-07T13:05:00.000Z",
      body: "Thanks, closing this for now.",
      type: "chat",
      has_media: false,
      media_mime: null,
      media_size_bytes: null,
      media_sha256: null,
      media_caption: null,
      media_url_endpoint: null,
      quoted_message_id: null,
      mentions: [],
      reactions: [],
      edited_at: null,
      revoked_at: null,
      erased_at: null,
      captured_at: "2026-05-07T13:05:04.000Z",
    },
  ],
  11004: [
    {
      id: 94001,
      wa_message_id: "mock-shared-1",
      chat_id: 11004,
      sender_contact_id: 7032,
      sender_phone: "+972533333333",
      sender_is_me: false,
      ts: "2026-05-10T05:15:00.000Z",
      body: "This thread was shared for case review.",
      type: "chat",
      has_media: false,
      media_mime: null,
      media_size_bytes: null,
      media_sha256: null,
      media_caption: null,
      media_url_endpoint: null,
      quoted_message_id: null,
      mentions: [],
      reactions: [],
      edited_at: null,
      revoked_at: null,
      erased_at: null,
      captured_at: "2026-05-10T05:15:02.000Z",
    },
  ],
};

const MOCK_SHARE_RECIPIENTS: WhatsAppShareUserOption[] = [
  { id: 201, display_name: "Maya Rosen", email: "maya.rosen@example.com" },
  { id: 202, display_name: "Amit Bar", email: "amit.bar@example.com" },
  { id: 203, display_name: "Noa Cohen", email: "noa.cohen@example.com" },
];

const MOCK_SHARES_FIXTURE: Record<number, WhatsAppChatShare[]> = {
  11001: [
    {
      id: 88002,
      chat_id: 11001,
      shared_with_user_id: 203,
      shared_with_user_name: "Noa Cohen",
      shared_with_user_email: "noa.cohen@example.com",
      shared_by_user_id: 42,
      shared_by_user_name: "Current User",
      shared_by_user_email: "current.user@example.com",
      created_at: "2026-05-10T07:00:00.000Z",
      expires_at: null,
      note: "Finance follow-up.",
      revoked_at: null,
    },
  ],
};

const MOCK_QR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224" viewBox="0 0 224 224">
  <rect width="224" height="224" fill="white"/>
  <rect x="18" y="18" width="58" height="58" fill="black"/>
  <rect x="32" y="32" width="30" height="30" fill="white"/>
  <rect x="148" y="18" width="58" height="58" fill="black"/>
  <rect x="162" y="32" width="30" height="30" fill="white"/>
  <rect x="18" y="148" width="58" height="58" fill="black"/>
  <rect x="32" y="162" width="30" height="30" fill="white"/>
  <path d="M96 20h14v14H96zM124 20h14v14h-14zM96 48h42v14H96zM90 90h14v14H90zM118 90h28v14h-28zM160 90h14v14h-14zM90 118h56v14H90zM174 118h14v14h-14zM90 146h14v14H90zM118 146h14v14h-14zM146 146h42v14h-42zM90 174h28v14H90zM132 174h14v14h-14zM160 174h28v14h-28z" fill="black"/>
</svg>
`)}`;

const FIXTURE: WhatsAppSession[] = [];

function load(): WhatsAppSession[] {
  return loadMockState<WhatsAppSession[]>(STORAGE_KEY, STORAGE_VERSION, FIXTURE);
}

function persist(items: WhatsAppSession[]): void {
  saveMockState(STORAGE_KEY, STORAGE_VERSION, items);
}

function loadShares(): Record<number, WhatsAppChatShare[]> {
  return loadMockState<Record<number, WhatsAppChatShare[]>>(
    SHARES_STORAGE_KEY,
    STORAGE_VERSION,
    MOCK_SHARES_FIXTURE,
  );
}

function persistShares(items: Record<number, WhatsAppChatShare[]>): void {
  saveMockState(SHARES_STORAGE_KEY, STORAGE_VERSION, items);
}

function nowIso(): string {
  return new Date().toISOString();
}

// Monotonically-increasing session id seeded from epoch seconds. The
// epoch base avoids collisions with backend-assigned ids; the in-process
// counter guarantees uniqueness even when two link calls land in the
// same second (test suites + rapid retries).
let __sessionIdCounter = Math.floor(Date.now() / 1000);
function newSessionId(): number {
  __sessionIdCounter += 1;
  return __sessionIdCounter;
}

function emitAudit(action: string, category: "create" | "update" | "delete", sessionId: number): void {
  void recordAuditEntry({
    action,
    category,
    resource_type: "whatsapp_session",
    resource_id: String(sessionId),
    metadata: {},
  }).catch(() => {});
}

function emitShareAudit(
  action: string,
  category: "create" | "delete",
  shareId: number,
): void {
  void recordAuditEntry({
    action,
    category,
    resource_type: "whatsapp_chat_share",
    resource_id: String(shareId),
    metadata: {},
  }).catch(() => {});
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
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

function chatMatches(chat: WhatsAppChat, params: WhatsAppChatListParams): boolean {
  if (params.kind && params.kind !== "all" && chat.kind !== params.kind) return false;
  const q = params.q?.trim().toLowerCase();
  if (!q) return true;
  const lastMessagePreview =
    typeof chat.meta.last_message_preview === "string"
      ? chat.meta.last_message_preview
      : "";
  return [chat.display_name, chat.wa_chat_id, lastMessagePreview]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function chatQueryString(params: WhatsAppChatListParams): string {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.kind && params.kind !== "all") search.set("kind", params.kind);
  if (params.page) search.set("page", String(params.page));
  if (params.page_size) search.set("page_size", String(params.page_size));
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

function recipientQueryString(q: string): string {
  const search = new URLSearchParams();
  if (q.trim()) search.set("q", q.trim());
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

function messageQueryString(params: WhatsAppMessageListParams): string {
  const search = new URLSearchParams();
  if (params.before_id) search.set("before_id", String(params.before_id));
  if (params.page_size) search.set("page_size", String(params.page_size));
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

function searchQueryString(params: WhatsAppMessageSearchParams): string {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.chat_id) search.set("chat_id", String(params.chat_id));
  if (params.type?.trim()) search.set("type", params.type.trim());
  if (params.page) search.set("page", String(params.page));
  if (params.page_size) search.set("page_size", String(params.page_size));
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

function mockSearchResult(message: WhatsAppMessage, q: string): WhatsAppMessageSearchResult {
  const body = message.body ?? "";
  const lowerBody = body.toLowerCase();
  const idx = lowerBody.indexOf(q.toLowerCase());
  const start = idx === -1 ? 0 : Math.max(0, idx - 60);
  const end = idx === -1 ? 160 : Math.min(body.length, idx + q.length + 60);
  return {
    message,
    chat: MOCK_CHATS.find((chat) => chat.id === message.chat_id) ?? null,
    highlight: `${start > 0 ? "..." : ""}${body.slice(start, end)}${end < body.length ? "..." : ""}`,
  };
}

/** Fetch the current user's owned WhatsApp chats. */
export async function fetchWhatsappChats(
  params: WhatsAppChatListParams = {},
): Promise<WhatsAppChatsResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(Math.max(1, params.page_size ?? 50), 100);
    const filtered = MOCK_CHATS.filter((chat) => chatMatches(chat, params));
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);
    return {
      status: "ok",
      data,
      meta: {
        page,
        page_size: pageSize,
        total: filtered.length,
        has_more: start + data.length < filtered.length,
      },
    };
  }
  return apiFetch<WhatsAppChatsResponse>(`/api/chats${chatQueryString(params)}`);
}

/** Fetch chats explicitly shared with the current user. */
export async function fetchWhatsappSharedWithMe(
  params: WhatsAppChatListParams = {},
): Promise<WhatsAppChatsResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(Math.max(1, params.page_size ?? 50), 100);
    const filtered = MOCK_CHATS.filter((chat) => chat.access_kind === "shared").filter((chat) =>
      chatMatches(chat, params),
    );
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);
    return {
      status: "ok",
      data,
      meta: {
        page,
        page_size: pageSize,
        total: filtered.length,
        has_more: start + data.length < filtered.length,
      },
    };
  }
  return apiFetch<WhatsAppChatsResponse>(`/api/shared-with-me${chatQueryString(params)}`);
}

/** List active shares granted from one owned chat. */
export async function fetchWhatsappChatShares(
  chatId: number,
): Promise<WhatsAppChatSharesResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const chat = MOCK_CHATS.find((item) => item.id === chatId);
    if (!chat || chat.access_kind === "shared") throw new Error("not_found");
    return {
      status: "ok",
      data: (loadShares()[chatId] ?? []).filter((share) => !share.revoked_at),
    };
  }
  return apiFetch<WhatsAppChatSharesResponse>(`/api/chats/${chatId}/shares`);
}

/** Share one owned chat with a same-org recipient. */
export async function shareWhatsappChat(
  chatId: number,
  input: WhatsAppShareChatInput,
): Promise<WhatsAppChatShareMutationResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const chat = MOCK_CHATS.find((item) => item.id === chatId);
    if (!chat || chat.access_kind === "shared") throw new Error("not_found");
    const recipient = MOCK_SHARE_RECIPIENTS.find((item) => item.id === input.shared_with_user_id);
    if (!recipient) throw new Error("recipient_not_found");
    const shares = loadShares();
    const activeShares = shares[chatId]?.filter((share) => !share.revoked_at) ?? [];
    if (activeShares.some((share) => share.shared_with_user_id === recipient.id)) {
      throw new Error("share_already_exists");
    }
    const shareId =
      Math.max(88000, ...Object.values(shares).flat().map((share) => share.id)) + 1;
    const share: WhatsAppChatShare = {
      id: shareId,
      chat_id: chatId,
      shared_with_user_id: recipient.id,
      shared_with_user_name: recipient.display_name,
      shared_with_user_email: recipient.email,
      shared_by_user_id: 42,
      shared_by_user_name: "Current User",
      shared_by_user_email: "current.user@example.com",
      created_at: nowIso(),
      expires_at: input.expires_at ?? null,
      note: input.note?.trim() || null,
      revoked_at: null,
    };
    persistShares({ ...shares, [chatId]: [share, ...(shares[chatId] ?? [])] });
    emitShareAudit("whatsapp.share.created", "create", shareId);
    return { status: "ok", share_id: shareId };
  }
  return apiFetch<WhatsAppChatShareMutationResponse>(`/api/chats/${chatId}/shares`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Revoke one WhatsApp chat share as owner or recipient. */
export async function revokeWhatsappShare(
  shareId: number,
): Promise<WhatsAppChatShareMutationResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const shares = loadShares();
    for (const [chatId, items] of Object.entries(shares)) {
      const idx = items.findIndex((share) => share.id === shareId);
      if (idx === -1) continue;
      if (items[idx]!.revoked_at) {
        return { status: "ok", share_id: shareId };
      }
      const nextItems = [...items];
      nextItems[idx] = { ...items[idx]!, revoked_at: nowIso() };
      persistShares({ ...shares, [Number(chatId)]: nextItems });
      emitShareAudit("whatsapp.share.revoked", "delete", shareId);
      return { status: "ok", share_id: shareId };
    }
    throw new Error("not_found");
  }
  return apiFetch<WhatsAppChatShareMutationResponse>(`/api/shares/${shareId}`, {
    method: "DELETE",
  });
}

/** Search same-org users eligible to receive a chat share. */
export async function searchWhatsappShareRecipients(
  q: string,
): Promise<WhatsAppShareRecipientsResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const term = q.trim().toLowerCase();
    const data = term
      ? MOCK_SHARE_RECIPIENTS.filter((user) =>
          [user.display_name, user.email].filter(Boolean).join(" ").toLowerCase().includes(term),
        )
      : [];
    return { status: "ok", data };
  }
  return apiFetch<WhatsAppShareRecipientsResponse>(`/api/users/typeahead${recipientQueryString(q)}`);
}

/** Fetch newest-first messages for one authorized WhatsApp chat. */
export async function fetchWhatsappChatMessages(
  chatId: number,
  params: WhatsAppMessageListParams = {},
): Promise<WhatsAppMessagesResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const chat = MOCK_CHATS.find((item) => item.id === chatId);
    if (!chat) throw new Error("not_found");
    const pageSize = Math.min(Math.max(1, params.page_size ?? 50), 100);
    const rows = MOCK_MESSAGES[chatId] ?? [];
    const filtered = params.before_id
      ? rows.filter((message) => message.id < Number(params.before_id))
      : rows;
    const data = filtered.slice(0, pageSize);
    const hasMore = filtered.length > pageSize;
    return {
      status: "ok",
      chat,
      data,
      meta: {
        page_size: pageSize,
        has_more: hasMore,
        next_before_id: hasMore && data.length > 0 ? data[data.length - 1]!.id : null,
      },
    };
  }
  return apiFetch<WhatsAppMessagesResponse>(
    `/api/chats/${chatId}/messages${messageQueryString(params)}`,
  );
}

/** Search owned WhatsApp messages. */
export async function searchWhatsappMessages(
  params: WhatsAppMessageSearchParams = {},
): Promise<WhatsAppMessageSearchResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const q = params.q?.trim() ?? "";
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(Math.max(1, params.page_size ?? 50), 100);
    const allMessages = Object.values(MOCK_MESSAGES).flat();
    const filtered = q
      ? allMessages.filter((message) => {
          if (params.chat_id && message.chat_id !== params.chat_id) return false;
          if (params.type && message.type !== params.type) return false;
          return (message.body ?? "").toLowerCase().includes(q.toLowerCase());
        })
      : [];
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize).map((message) => mockSearchResult(message, q));
    return {
      status: "ok",
      data,
      meta: {
        page,
        page_size: pageSize,
        total: filtered.length,
        has_more: start + data.length < filtered.length,
      },
    };
  }
  return apiFetch<WhatsAppMessageSearchResponse>(`/api/search${searchQueryString(params)}`);
}

/** Fetch the current user's personal WhatsApp session rows. */
export async function fetchWhatsappSessions(): Promise<WhatsAppSessionsResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    return { status: "ok", data: load() };
  }
  return apiFetch<WhatsAppSessionsResponse>("/api/my/sessions");
}

/** Start the user's personal WhatsApp QR linking flow. */
export async function linkWhatsappSession(): Promise<WhatsAppSessionMutationResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const items = load();
    const active = items.find((s) => s.session_state !== "unlinked");
    if (active) throw new Error("session_already_exists");
    const id = newSessionId();
    const session: WhatsAppSession = {
      id,
      session_state: "needs_qr",
      session_state_updated_at: nowIso(),
      last_qr_generated_at: nowIso(),
      connected_phone: null,
      last_heartbeat_at: null,
      assigned_replica: "mock-wa-sync-0",
      lease_expires_at: null,
      relink_requested_at: null,
      meta: { mock: true },
      created_at: nowIso(),
    };
    persist([session, ...items]);
    emitAudit("whatsapp.session.linked", "create", id);
    return { status: "ok", session_id: id, session_state: session.session_state };
  }
  return apiFetch<WhatsAppSessionMutationResponse>("/api/my/sessions", {
    method: "POST",
    body: "{}",
  });
}

/** Poll QR/lifecycle state for one owned WhatsApp session. */
export async function fetchWhatsappSessionQr(sessionId: number): Promise<WhatsAppQrResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const items = load();
    const session = items.find((s) => s.id === sessionId);
    if (!session || session.session_state === "unlinked") throw new Error("not_found");
    return {
      status: "ok",
      session_id: session.id,
      session_state: session.session_state,
      connected_phone: session.connected_phone,
      last_qr_generated_at: session.last_qr_generated_at,
      qr:
        session.session_state === "needs_qr" || session.session_state === "connecting"
          ? MOCK_QR
          : undefined,
    };
  }
  return apiFetch<WhatsAppQrResponse>(`/api/my/sessions/${sessionId}/qr`);
}

/** Request a fresh QR for one owned WhatsApp session. */
export async function relinkWhatsappSession(
  sessionId: number,
): Promise<WhatsAppSessionMutationResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const items = load();
    const idx = items.findIndex((s) => s.id === sessionId);
    if (idx === -1) throw new Error("session_not_found");
    const updated: WhatsAppSession = {
      ...items[idx]!,
      session_state: "needs_qr",
      session_state_updated_at: nowIso(),
      last_qr_generated_at: nowIso(),
      connected_phone: null,
      relink_requested_at: nowIso(),
    };
    const next = [...items];
    next[idx] = updated;
    persist(next);
    emitAudit("whatsapp.session.relinked", "update", sessionId);
    return { status: "ok", session_id: sessionId, session_state: updated.session_state };
  }
  return apiFetch<WhatsAppSessionMutationResponse>(
    `/api/my/sessions/${sessionId}/relink`,
    { method: "POST", body: "{}" },
  );
}

/** Unlink one owned WhatsApp session while retaining archived data. */
export async function unlinkWhatsappSession(
  sessionId: number,
): Promise<WhatsAppSessionMutationResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const items = load();
    const idx = items.findIndex((s) => s.id === sessionId);
    if (idx === -1) throw new Error("session_not_found");
    if (items[idx]!.session_state === "unlinked") {
      // Idempotent — already unlinked, no audit emit.
      return { status: "ok", session_id: sessionId, session_state: "unlinked" };
    }
    const updated: WhatsAppSession = {
      ...items[idx]!,
      session_state: "unlinked",
      session_state_updated_at: nowIso(),
      connected_phone: null,
      last_heartbeat_at: null,
      lease_expires_at: null,
      last_qr_generated_at: null,
    };
    const next = [...items];
    next[idx] = updated;
    persist(next);
    emitAudit("whatsapp.session.unlinked", "delete", sessionId);
    return { status: "ok", session_id: sessionId, session_state: updated.session_state };
  }
  return apiFetch<WhatsAppSessionMutationResponse>(`/api/my/sessions/${sessionId}`, {
    method: "DELETE",
  });
}
