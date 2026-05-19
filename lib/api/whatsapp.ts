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
  WhatsAppDsrApproveRequest,
  WhatsAppDsrDeleteRequest,
  WhatsAppDsrHistoryResponse,
  WhatsAppDsrJob,
  WhatsAppDsrMutationResponse,
  WhatsAppDsrPreview,
  WhatsAppDsrPreviewRequest,
  WhatsAppDsrPreviewResponse,
  WhatsAppMessage,
  WhatsAppMessageListParams,
  WhatsAppMediaUrlResponse,
  WhatsAppMessageSearchParams,
  WhatsAppMessageSearchResponse,
  WhatsAppMessageSearchResult,
  WhatsAppMessagesResponse,
  WhatsAppQrResponse,
  WhatsAppNotificationChannel,
  WhatsAppNotificationEvent,
  WhatsAppNotificationPrefs,
  WhatsAppPrefs,
  WhatsAppPrefsResponse,
  WhatsAppPrefsUpdateRequest,
  WhatsAppShareChatInput,
  WhatsAppShareRecipientsResponse,
  WhatsAppShareUserOption,
  WhatsAppSelfEraseRequest,
  WhatsAppSelfEraseResponse,
  WhatsAppSendMessageInput,
  WhatsAppSendMessageResponse,
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
  WhatsAppDsrApproveRequest,
  WhatsAppDsrDeleteRequest,
  WhatsAppDsrHistoryResponse,
  WhatsAppDsrJob,
  WhatsAppDsrJobState,
  WhatsAppDsrMutationResponse,
  WhatsAppDsrPreview,
  WhatsAppDsrPreviewRequest,
  WhatsAppDsrPreviewResponse,
  WhatsAppMessage,
  WhatsAppMediaUrlResponse,
  WhatsAppMessageListParams,
  WhatsAppMessageSearchParams,
  WhatsAppMessageSearchResponse,
  WhatsAppMessageSearchResult,
  WhatsAppMessagesMeta,
  WhatsAppMessagesResponse,
  WhatsAppQrResponse,
  WhatsAppNotificationChannel,
  WhatsAppNotificationEvent,
  WhatsAppNotificationPrefs,
  WhatsAppPrefs,
  WhatsAppPrefsResponse,
  WhatsAppPrefsUpdateRequest,
  WhatsAppShareChatInput,
  WhatsAppShareRecipientsResponse,
  WhatsAppShareUserOption,
  WhatsAppSelfEraseRequest,
  WhatsAppSelfEraseResponse,
  WhatsAppSendMessageInput,
  WhatsAppSendMessageResponse,
  WhatsAppSession,
  WhatsAppSessionMutationResponse,
  WhatsAppSessionState,
  WhatsAppSessionsResponse,
} from "@/lib/modules/whatsapp/types";

const BASE = "/api/proxy/whatsapp";
const STORAGE_KEY = "whatsapp:sessions:v1";
const SHARES_STORAGE_KEY = "whatsapp:shares:v1";
const DSR_STORAGE_KEY = "whatsapp:dsr:v1";
const PREFS_STORAGE_KEY = "whatsapp:prefs:v1";
const STORAGE_VERSION = 1;
export const MOCK_MODE =
  (process.env.NEXT_PUBLIC_WHATSAPP_MOCK_API ?? process.env.NEXT_PUBLIC_MOCK_API) !== "false";
export const WHATSAPP_LIVE_SESSIONS_MODE =
  process.env.NEXT_PUBLIC_WHATSAPP_DEV_LIVE_SESSIONS === "true";
const LIVE_CONTROL_BASE =
  process.env.NEXT_PUBLIC_WHATSAPP_LIVE_CONTROL_URL || "http://127.0.0.1:3310";
const LIVE_SESSION_ID = 1;

type LiveQrPayload = {
  status: WhatsAppSessionState | "starting" | "ok";
  session_id: string;
  qr?: string | null;
  qrDataUrl?: string | null;
};

type LiveStatePayload = {
  registryStatus: WhatsAppSessionState | "starting";
  rawRegistryStatus?: string;
  clientState?: string;
  hasInfo?: boolean;
  session_id: string;
};

type LiveMePayload = {
  status: WhatsAppSessionState | "starting";
  session_id: string;
  info?: {
    pushname?: string | null;
    wid?: { user?: string | null; _serialized?: string | null };
    me?: { user?: string | null; _serialized?: string | null };
    platform?: string | null;
  } | null;
};

async function liveFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${LIVE_CONTROL_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || response.statusText);
  }
  return payload as T;
}

function normalizeLiveState(state?: string | null): WhatsAppSessionState {
  if (
    state === "needs_qr" ||
    state === "ready" ||
    state === "disconnected" ||
    state === "failed" ||
    state === "unlinked"
  ) {
    return state;
  }
  if (state === "CONNECTED") return "ready";
  if (state === "UNPAIRED") return "needs_qr";
  return "connecting";
}

async function liveSession(): Promise<WhatsAppSession> {
  const [state, me] = await Promise.all([
    liveFetch<LiveStatePayload>("/api/state"),
    liveFetch<LiveMePayload>("/api/me"),
  ]);
  const sessionState = normalizeLiveState(state.registryStatus || state.clientState);
  const connectedPhone = me.info?.wid?.user || me.info?.me?.user || null;
  return {
    id: LIVE_SESSION_ID,
    session_state: sessionState,
    session_state_updated_at: new Date().toISOString(),
    last_qr_generated_at: sessionState === "needs_qr" ? new Date().toISOString() : null,
    connected_phone: connectedPhone,
    last_heartbeat_at: new Date().toISOString(),
    assigned_replica: "local-live-whatsapp",
    lease_expires_at: null,
    relink_requested_at: null,
    meta: {
      live: true,
      source: LIVE_CONTROL_BASE,
      account: me.info?.pushname || null,
      platform: me.info?.platform || null,
      raw_registry_status: state.rawRegistryStatus || null,
      client_state: state.clientState || null,
    },
    created_at: null,
    attention_required: sessionState !== "ready",
    attention_reason: sessionState !== "ready" ? "session_state" : null,
  };
}

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

const DEFAULT_PREFS: WhatsAppNotificationPrefs = {
  session_stale: { push: true, email: true },
  session_linked: { push: true, email: false },
  share_received: { push: true, email: true },
  share_expiring_soon: { push: true, email: true },
  erasure_done: { push: true, email: true },
};

// Batch 163 — review RV-159-07. localStorage flip-guard. Every persist
// helper short-circuits when MOCK_MODE is off so that after the
// Phase 5A.WA flip (NEXT_PUBLIC_MOCK_API=false), even if a stray
// caller routes through a mock-mode code path, the cap-A localStorage
// keys (whatsapp:*:v1) stay untouched. Backend is then the only
// source of truth — no cross-tenant residue from a previous demo.

function load(): WhatsAppSession[] {
  if (!MOCK_MODE) return FIXTURE;
  return loadMockState<WhatsAppSession[]>(STORAGE_KEY, STORAGE_VERSION, FIXTURE);
}

function persist(items: WhatsAppSession[]): void {
  if (!MOCK_MODE) return;
  saveMockState(STORAGE_KEY, STORAGE_VERSION, items);
}

function loadShares(): Record<number, WhatsAppChatShare[]> {
  if (!MOCK_MODE) return MOCK_SHARES_FIXTURE;
  return loadMockState<Record<number, WhatsAppChatShare[]>>(
    SHARES_STORAGE_KEY,
    STORAGE_VERSION,
    MOCK_SHARES_FIXTURE,
  );
}

function persistShares(items: Record<number, WhatsAppChatShare[]>): void {
  if (!MOCK_MODE) return;
  saveMockState(SHARES_STORAGE_KEY, STORAGE_VERSION, items);
}

function loadDsrJobs(): WhatsAppDsrJob[] {
  if (!MOCK_MODE) return [];
  return loadMockState<WhatsAppDsrJob[]>(DSR_STORAGE_KEY, STORAGE_VERSION, []);
}

function persistDsrJobs(items: WhatsAppDsrJob[]): void {
  if (!MOCK_MODE) return;
  saveMockState(DSR_STORAGE_KEY, STORAGE_VERSION, items);
}

function loadPrefs(): WhatsAppPrefs {
  const defaultPrefs: WhatsAppPrefs = {
    user_id: 42,
    notifications: DEFAULT_PREFS,
    updated_at: null,
  };
  if (!MOCK_MODE) return defaultPrefs;
  return loadMockState<WhatsAppPrefs>(PREFS_STORAGE_KEY, STORAGE_VERSION, defaultPrefs);
}

function persistPrefs(prefs: WhatsAppPrefs): void {
  if (!MOCK_MODE) return;
  saveMockState(PREFS_STORAGE_KEY, STORAGE_VERSION, prefs);
}

function withSessionAttention(session: WhatsAppSession): WhatsAppSession {
  const heartbeatStale =
    session.session_state === "ready" &&
    (!session.last_heartbeat_at || Date.now() - new Date(session.last_heartbeat_at).getTime() > 10 * 60_000);
  const stateStale = ["needs_qr", "disconnected", "failed"].includes(session.session_state);
  return {
    ...session,
    attention_required: stateStale || heartbeatStale,
    attention_reason: stateStale ? "session_state" : heartbeatStale ? "heartbeat_stale" : null,
  };
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

function dsrHistoryQueryString(params: { page?: number; page_size?: number } = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.page_size) search.set("page_size", String(params.page_size));
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) throw new Error("invalid_phone");
  if (digits.startsWith("972")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length >= 9) return `+972${digits.slice(1)}`;
  return raw.trim().startsWith("+") ? `+${digits}` : `+${digits}`;
}

function maskPhone(normalized: string): string {
  const digits = normalized.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `+${digits.slice(0, 3)}***${digits.slice(-4)}`;
}

function mockPhoneHash(normalized: string): string {
  let hash = 0;
  for (const char of normalized) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `mock-${hash.toString(16).padStart(8, "0")}`;
}

function buildDsrPreview(input: WhatsAppDsrPreviewRequest): WhatsAppDsrPreview {
  const normalized = normalizePhone(input.phone);
  const digits = normalized.replace(/\D/g, "");
  const counterpartyChatIds = MOCK_CHATS.filter(
    (chat) => chat.kind === "private" && chat.wa_chat_id === `${digits}@c.us`,
  ).map((chat) => chat.id);
  const allMessages = Object.values(MOCK_MESSAGES).flat();
  const senderMessages = allMessages.filter(
    (message) => message.sender_phone === normalized && !message.erased_at,
  );
  const counterpartyMessages = allMessages.filter(
    (message) =>
      counterpartyChatIds.includes(message.chat_id) &&
      message.sender_phone !== normalized &&
      !message.erased_at,
  );
  const messages = [...senderMessages, ...counterpartyMessages];
  const chats = new Set(messages.map((message) => message.chat_id));
  const mediaCount = messages.filter((message) => message.has_media).length;
  const mediaBytes = messages.reduce((sum, message) => sum + (message.media_size_bytes ?? 0), 0);
  const timestamps = messages
    .map((message) => message.ts)
    .filter((value): value is string => Boolean(value))
    .sort();
  const highRisk = messages.length >= 500 || chats.size >= 10 || mediaBytes >= 50_000_000;
  return {
    phone_masked: maskPhone(normalized),
    phone_hash: mockPhoneHash(normalized),
    message_count: messages.length,
    match_count_as_sender: senderMessages.length,
    match_count_as_counterparty: counterpartyMessages.length,
    mentions: 0,
    reactions: 0,
    body_scan: 0,
    chats_involved: chats.size,
    media_count: mediaCount,
    estimated_r2_bytes: mediaBytes,
    oldest_ts: timestamps[0] ?? null,
    newest_ts: timestamps[timestamps.length - 1] ?? null,
    high_risk: highRisk,
    requires_second_approval: highRisk,
    recovery_window_days: 7,
  };
}

function emitDsrAudit(action: string, jobId: string): void {
  void recordAuditEntry({
    action,
    category: "delete",
    resource_type: "whatsapp_dsr_job",
    resource_id: jobId,
    metadata: {},
  }).catch(() => {});
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

/** Send a text message through the linked WhatsApp session. */
export async function sendWhatsappTextMessage(input: {
  to: string;
  body: string;
}): Promise<{ status: "ok"; data?: unknown }> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    if (!input.to.trim()) throw new Error("missing_target");
    if (!input.body.trim()) throw new Error("missing_body");
    return { status: "ok", data: { sent: true } };
  }
  return apiFetch<{ status: "ok"; data?: unknown }>("/api/messages/send", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Batch 168 — chat_id-based outbound send for the AI executor.
// The AI resolves recipient name → chat_id (via MOCK_CHATS lookup or
// BE typeahead), then calls this. In mock mode the message is
// appended to MOCK_MESSAGES with sender_is_me=true so the chat
// detail view immediately shows what was 'sent'. In live mode it
// POSTs to /api/proxy/whatsapp/api/chats/:id/messages — the bridge
// service handles the actual WhatsApp delivery.
//
// SECURITY: this is the outbound channel. Backend MUST enforce:
//   1. The chat_id belongs to the requester's owned archive
//   2. The requester's session is in `ready` state
//   3. Rate limit (default 30/min per user — spec §12.6 to extend)
//   4. WhatsApp ToS opt-in / consent if recipient is a non-user
let __mockSentCounter = 99000;
export async function sendWhatsappChatMessage(
  chatId: number,
  body: string,
  quotedWaMessageId: string | null = null,
): Promise<WhatsAppSendMessageResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    if (!Number.isInteger(chatId) || chatId <= 0) throw new Error("invalid_chat");
    const trimmed = body.trim();
    if (trimmed.length === 0) throw new Error("missing_body");
    if (trimmed.length > 4096) throw new Error("body_too_long");
    const chat = MOCK_CHATS.find((c) => c.id === chatId);
    if (!chat) throw new Error("chat_not_found");
    const ts = nowIso();
    const sent: WhatsAppMessage = {
      id: ++__mockSentCounter,
      wa_message_id: `mock-sent-${__mockSentCounter}`,
      chat_id: chatId,
      sender_contact_id: null,
      sender_phone: null,
      sender_is_me: true,
      ts,
      body: trimmed,
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
      captured_at: ts,
    };
    if (!MOCK_MESSAGES[chatId]) MOCK_MESSAGES[chatId] = [];
    MOCK_MESSAGES[chatId]!.unshift(sent);
    // Bump the chat's last_message_at so the archive list reflects
    // recency. (Won't survive page reload in mock — chats are
    // in-memory fixtures unlike sessions/dsr which use mock-storage.)
    chat.last_message_at = ts;
    chat.last_seen_at = ts;
    void recordAuditEntry({
      action: "whatsapp.message.sent",
      category: "create",
      resource_type: "whatsapp_message",
      resource_id: String(sent.id),
      metadata: { chat_id: chatId, body_length: trimmed.length, via: "ai_assistant" },
    }).catch(() => {});
    return { status: "ok", message: sent };
  }
  return apiFetch<WhatsAppSendMessageResponse>(
    `/api/chats/${chatId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        body: body.trim(),
        quoted_wa_message_id: quotedWaMessageId,
      }),
    },
  );
}

/** Best-effort recipient lookup by display_name / phone digits. */
export function resolveWhatsappRecipient(
  needle: string,
): WhatsAppChat | null {
  const q = needle.trim().toLowerCase();
  if (q.length === 0) return null;
  if (!MOCK_MODE) return null; // BE resolves server-side
  // Exact display_name match wins; fall back to substring.
  const exact = MOCK_CHATS.find(
    (c) =>
      c.access_kind !== "shared" &&
      (c.display_name?.toLowerCase() === q || c.wa_chat_id.includes(q)),
  );
  if (exact) return exact;
  return (
    MOCK_CHATS.find(
      (c) =>
        c.access_kind !== "shared" &&
        c.display_name?.toLowerCase().includes(q),
    ) ?? null
  );
}

/** Fetch a temporary signed URL for one owner-scoped WhatsApp media item. */
// Batch 164 RV-159-09 defense — validate the `url` field returned by
// fetchWhatsappMediaUrl before it lands in `<img src={...}>`. BE spec
// §4.2 says the field MUST be either a relative path under
// `/api/proxy/whatsapp/api/media/` OR a `data:image/<safe-mime>;base64`
// URL. Anything else — `javascript:`, scheme-relative `//evil`,
// external `https://attacker`, or a `data:text/html` — is a XSS or
// redirect attack vector. Defense-in-depth (BE owns the real check).
function isSafeMediaUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length === 0) return false;
  if (url.startsWith("/api/proxy/whatsapp/")) return true;
  // Allow data: URLs only for known image MIMEs.
  if (
    /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);(?:base64|utf8|charset=[a-z0-9-]+),/i.test(
      url,
    )
  ) {
    return true;
  }
  return false;
}

export async function fetchWhatsappMediaUrl(messageId: number): Promise<WhatsAppMediaUrlResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const message = Object.values(MOCK_MESSAGES).flat().find((item) => item.id === messageId);
    if (!message?.has_media) throw new Error("media_not_available");
    return {
      status: "ok",
      url: "data:image/svg+xml;utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='640'%20height='360'%20viewBox='0%200%20640%20360'%3E%3Crect%20width='640'%20height='360'%20fill='%23ecfeff'/%3E%3Cpath%20d='M80%20280h480L420%20120l-90%20110-58-70z'%20fill='%230f766e'/%3E%3Ccircle%20cx='180'%20cy='120'%20r='44'%20fill='%230ea5e9'/%3E%3C/svg%3E",
      mime: message.media_mime,
      size_bytes: message.media_size_bytes,
      expires_in: 300,
    };
  }
  const res = await apiFetch<WhatsAppMediaUrlResponse>(`/api/media/${messageId}/url`);
  if (!isSafeMediaUrl(res.url)) {
    throw new Error("media_url_rejected");
  }
  return res;
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
  if (WHATSAPP_LIVE_SESSIONS_MODE) {
    return { status: "ok", data: [await liveSession()] };
  }
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    return { status: "ok", data: load().map(withSessionAttention) };
  }
  return apiFetch<WhatsAppSessionsResponse>("/api/my/sessions");
}

/** Fetch current-user WhatsApp notification preferences. */
export async function fetchWhatsappPrefs(): Promise<WhatsAppPrefsResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    return { status: "ok", data: loadPrefs() };
  }
  return apiFetch<WhatsAppPrefsResponse>("/api/my/prefs");
}

/** Update current-user WhatsApp notification preferences. */
export async function updateWhatsappPrefs(
  input: WhatsAppPrefsUpdateRequest,
): Promise<WhatsAppPrefsResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const current = loadPrefs();
    const next: WhatsAppPrefs = {
      ...current,
      updated_at: nowIso(),
      notifications: { ...current.notifications },
    };
    for (const [event, channels] of Object.entries(input.notifications)) {
      const key = event as keyof WhatsAppNotificationPrefs;
      next.notifications[key] = { ...next.notifications[key], ...channels };
    }
    persistPrefs(next);
    return { status: "ok", data: next };
  }
  return apiFetch<WhatsAppPrefsResponse>("/api/my/prefs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Start the user's personal WhatsApp QR linking flow. */
export async function linkWhatsappSession(): Promise<WhatsAppSessionMutationResponse> {
  if (WHATSAPP_LIVE_SESSIONS_MODE) {
    const session = await liveSession();
    return { status: "ok", session_id: session.id, session_state: session.session_state };
  }
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
      attention_required: true,
      attention_reason: "session_state",
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
  if (WHATSAPP_LIVE_SESSIONS_MODE) {
    if (sessionId !== LIVE_SESSION_ID) throw new Error("not_found");
    const [qr, me] = await Promise.all([
      liveFetch<LiveQrPayload>("/api/qr"),
      liveFetch<LiveMePayload>("/api/me"),
    ]);
    const sessionState = normalizeLiveState(qr.status);
    return {
      status: "ok",
      session_id: LIVE_SESSION_ID,
      session_state: sessionState,
      connected_phone: me.info?.wid?.user || me.info?.me?.user || null,
      last_qr_generated_at: qr.qrDataUrl ? new Date().toISOString() : null,
      qr: qr.qrDataUrl || undefined,
    };
  }
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
  if (WHATSAPP_LIVE_SESSIONS_MODE) {
    if (sessionId !== LIVE_SESSION_ID) throw new Error("not_found");
    const result = await liveFetch<{ status: string }>("/api/relink", { method: "POST" });
    return {
      status: "ok",
      session_id: LIVE_SESSION_ID,
      session_state: normalizeLiveState(result.status),
    };
  }
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
  if (WHATSAPP_LIVE_SESSIONS_MODE) {
    if (sessionId !== LIVE_SESSION_ID) throw new Error("not_found");
    const result = await liveFetch<{ status: string }>("/api/unlink", { method: "POST" });
    return {
      status: "ok",
      session_id: LIVE_SESSION_ID,
      session_state: normalizeLiveState(result.status),
    };
  }
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

/** Enqueue self-service erasure for the current user's WhatsApp archive. */
export async function eraseMyWhatsappData(
  input: WhatsAppSelfEraseRequest,
): Promise<WhatsAppSelfEraseResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    if (input.confirm !== true) throw new Error("confirmation_required");
    const now = nowIso();
    const preview = buildDsrPreview({ phone: "+972501112222" });
    const jobId = `mock-self-erasure-${Date.now()}`;
    persist([]);
    persistShares({});
    persistDsrJobs([
      {
        id: jobId,
        state: "soft_deleted",
        job_type: "delete_by_phone",
        phone_masked: null,
        phone_hash: null,
        requested_by_user_id: 42,
        second_approver_user_id: null,
        reason: input.reason?.trim() || "self_service_erasure",
        preview_counts: {
          ...preview,
          message_count: Object.values(MOCK_MESSAGES).flat().filter((message) => !message.erased_at).length,
        },
        result_counts: { messages_soft_deleted: Object.values(MOCK_MESSAGES).flat().length },
        recovery_until: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        created_at: now,
        started_at: now,
        finished_at: now,
        failed_reason: null,
      },
      ...loadDsrJobs(),
    ]);
    emitDsrAudit("whatsapp.self_erasure_requested", jobId);
    return { status: "ok", job_id: jobId, message: "erasure_started" };
  }
  return apiFetch<WhatsAppSelfEraseResponse>("/api/my/erase", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Preview a WhatsApp subject erasure request without changing data. */
export async function previewWhatsappDsr(
  input: WhatsAppDsrPreviewRequest,
): Promise<WhatsAppDsrPreviewResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    return { status: "ok", preview: buildDsrPreview(input) };
  }
  return apiFetch<WhatsAppDsrPreviewResponse>("/admin/dsr/preview", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Submit a WhatsApp delete-by-subject job. */
export async function deleteWhatsappDsr(
  input: WhatsAppDsrDeleteRequest,
): Promise<WhatsAppDsrMutationResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    if (!input.reason.trim()) throw new Error("reason_required");
    if (!input.acknowledge_irreversible) throw new Error("acknowledge_required");
    const preview = buildDsrPreview(input);
    const jobId = `mock-dsr-${Date.now()}`;
    const now = nowIso();
    const state = preview.requires_second_approval ? "awaiting_second_approval" : "soft_deleted";
    const job: WhatsAppDsrJob = {
      id: jobId,
      state,
      job_type: "delete_by_phone",
      phone_masked: preview.phone_masked,
      phone_hash: preview.phone_hash,
      requested_by_user_id: 42,
      second_approver_user_id: null,
      reason: input.reason.trim(),
      preview_counts: preview,
      result_counts:
        state === "soft_deleted"
          ? { messages_soft_deleted: preview.message_count, media_tombstoned: preview.media_count }
          : {},
      recovery_until:
        state === "soft_deleted"
          ? new Date(Date.now() + preview.recovery_window_days * 86_400_000).toISOString()
          : null,
      created_at: now,
      started_at: state === "soft_deleted" ? now : null,
      finished_at: state === "soft_deleted" ? now : null,
      failed_reason: null,
    };
    persistDsrJobs([job, ...loadDsrJobs()]);
    emitDsrAudit("whatsapp.subject_erasure_requested", jobId);
    return { status: "ok", job_id: jobId, state, message: "queued" };
  }
  return apiFetch<WhatsAppDsrMutationResponse>("/admin/dsr/delete", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Second-approve a high-risk WhatsApp DSR job. */
export async function approveWhatsappDsr(
  input: WhatsAppDsrApproveRequest,
): Promise<WhatsAppDsrMutationResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const preview = buildDsrPreview({ phone: input.phone });
    const jobs = loadDsrJobs();
    const idx = jobs.findIndex((job) => job.id === input.job_id);
    if (idx === -1) throw new Error("not_found");
    const current = jobs[idx]!;
    if (current.state !== "awaiting_second_approval") throw new Error("invalid_state");
    if (current.phone_hash !== preview.phone_hash) throw new Error("phone_mismatch");
    const now = nowIso();
    const updated: WhatsAppDsrJob = {
      ...current,
      state: "soft_deleted",
      second_approver_user_id: 43,
      result_counts: {
        messages_soft_deleted: preview.message_count,
        media_tombstoned: preview.media_count,
      },
      recovery_until: new Date(Date.now() + preview.recovery_window_days * 86_400_000).toISOString(),
      started_at: now,
      finished_at: now,
    };
    const next = [...jobs];
    next[idx] = updated;
    persistDsrJobs(next);
    emitDsrAudit("whatsapp.subject_erasure_approved", input.job_id);
    return { status: "ok", job_id: input.job_id, state: updated.state, message: "erasure_started" };
  }
  const { job_id: jobId, ...body } = input;
  return apiFetch<WhatsAppDsrMutationResponse>(`/admin/dsr/${encodeURIComponent(jobId)}/approve`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Fetch one WhatsApp DSR job status. */
export async function fetchWhatsappDsrStatus(jobId: string): Promise<WhatsAppDsrJob> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const job = loadDsrJobs().find((item) => item.id === jobId);
    if (!job) throw new Error("not_found");
    return job;
  }
  return apiFetch<WhatsAppDsrJob>(`/admin/dsr/${encodeURIComponent(jobId)}/status`);
}

/** Fetch recent WhatsApp DSR jobs. */
export async function fetchWhatsappDsrHistory(
  params: { page?: number; page_size?: number } = {},
): Promise<WhatsAppDsrHistoryResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(Math.max(1, params.page_size ?? 20), 100);
    const jobs = loadDsrJobs();
    const start = (page - 1) * pageSize;
    const data = jobs.slice(start, start + pageSize);
    return {
      status: "ok",
      data,
      meta: {
        page,
        page_size: pageSize,
        total: jobs.length,
        has_more: start + data.length < jobs.length,
      },
    };
  }
  return apiFetch<WhatsAppDsrHistoryResponse>(
    `/admin/api/dsr/history${dsrHistoryQueryString(params)}`,
  );
}
