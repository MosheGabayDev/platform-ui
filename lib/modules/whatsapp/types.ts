/**
 * @module lib/modules/whatsapp/types
 * Domain types for the user-owned WhatsApp archive module.
 *
 * Backend (Flask) is the authoritative source — these mirror the wire
 * shape and are imported by both the api client (`lib/api/whatsapp.ts`)
 * and the page-level UI. Adding a field here means updating the backend
 * spec in lockstep.
 */

export type WhatsAppSessionState =
  | "needs_qr"
  | "connecting"
  | "ready"
  | "disconnected"
  | "failed"
  | "unlinked";

export interface WhatsAppSession {
  id: number;
  session_state: WhatsAppSessionState;
  session_state_updated_at: string | null;
  last_qr_generated_at: string | null;
  connected_phone: string | null;
  last_heartbeat_at: string | null;
  assigned_replica: string | null;
  lease_expires_at: string | null;
  relink_requested_at: string | null;
  meta: Record<string, unknown>;
  created_at: string | null;
  attention_required?: boolean;
  attention_reason?: "session_state" | "heartbeat_stale" | null;
}

export interface WhatsAppSessionsResponse {
  status: "ok";
  data: WhatsAppSession[];
}

export type WhatsAppChatKind = "private" | "group";
export type WhatsAppChatAccessKind = "owner" | "shared";

export interface WhatsAppChatShare {
  id: number;
  chat_id: number;
  shared_with_user_id: number;
  shared_with_user_name: string | null;
  shared_with_user_email: string | null;
  shared_by_user_id: number;
  shared_by_user_name: string | null;
  shared_by_user_email: string | null;
  created_at: string | null;
  expires_at: string | null;
  note: string | null;
  revoked_at: string | null;
}

export interface WhatsAppChat {
  id: number;
  wa_chat_id: string;
  kind: WhatsAppChatKind;
  display_name: string | null;
  is_archived: boolean;
  is_muted: boolean;
  participant_count: number | null;
  last_message_at: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  meta: Record<string, unknown>;
  access_kind?: WhatsAppChatAccessKind;
  share?: WhatsAppChatShare | null;
}

export interface WhatsAppChatsMeta {
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
}

export interface WhatsAppChatsResponse {
  status: "ok";
  data: WhatsAppChat[];
  meta: WhatsAppChatsMeta;
}

export interface WhatsAppChatListParams {
  q?: string;
  kind?: WhatsAppChatKind | "all";
  page?: number;
  page_size?: number;
}

export interface WhatsAppChatSharesResponse {
  status: "ok";
  data: WhatsAppChatShare[];
}

export interface WhatsAppShareChatInput {
  shared_with_user_id: number;
  expires_at?: string | null;
  note?: string | null;
}

export interface WhatsAppChatShareMutationResponse {
  status: "ok";
  share_id: number;
}

export interface WhatsAppShareUserOption {
  id: number;
  display_name: string | null;
  email: string | null;
}

export interface WhatsAppShareRecipientsResponse {
  status: "ok";
  data: WhatsAppShareUserOption[];
}

export interface WhatsAppMessage {
  id: number;
  wa_message_id: string;
  chat_id: number;
  sender_contact_id: number | null;
  sender_phone: string | null;
  sender_is_me: boolean;
  ts: string | null;
  body: string | null;
  type: string;
  has_media: boolean;
  media_mime: string | null;
  media_size_bytes: number | null;
  media_sha256: string | null;
  media_caption: string | null;
  media_url_endpoint: string | null;
  media_preview_url?: string | null;
  quoted_message_id: number | null;
  mentions: unknown[];
  reactions: unknown[];
  edited_at: string | null;
  revoked_at: string | null;
  erased_at: string | null;
  captured_at: string | null;
}

export interface WhatsAppMessagesMeta {
  page_size: number;
  has_more: boolean;
  next_before_id: number | null;
}

export interface WhatsAppMessagesResponse {
  status: "ok";
  chat: WhatsAppChat;
  data: WhatsAppMessage[];
  meta: WhatsAppMessagesMeta;
}

export interface WhatsAppMediaUrlResponse {
  status: "ok";
  url: string;
  mime: string | null;
  size_bytes: number | null;
  expires_in: number;
}

export interface WhatsAppMessageListParams {
  before_id?: number | null;
  page_size?: number;
}

export interface WhatsAppMessageSearchResult {
  message: WhatsAppMessage;
  chat: WhatsAppChat | null;
  highlight: string;
}

export interface WhatsAppMessageSearchParams {
  q?: string;
  chat_id?: number | null;
  type?: string | null;
  page?: number;
  page_size?: number;
}

export interface WhatsAppMessageSearchResponse {
  status: "ok";
  data: WhatsAppMessageSearchResult[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    has_more: boolean;
  };
}

// Batch 168 — outbound message send. Skill `whatsapp.message.send`
// proposes this shape after recipient resolution. BE endpoint:
// POST /api/proxy/whatsapp/api/chats/:chat_id/messages.
export interface WhatsAppSendMessageInput {
  /** Resolved chat id from the user's archive. */
  chat_id: number;
  /** Plain text body, max 4096 chars (WhatsApp limit). */
  body: string;
  /** Optional reply-to message id (WA-native quoting). */
  quoted_wa_message_id?: string | null;
}

export interface WhatsAppSendMessageResponse {
  status: "ok";
  message: WhatsAppMessage;
}

export interface WhatsAppSessionMutationResponse {
  status: "ok";
  session_id: number;
  session_state: WhatsAppSessionState;
}

export interface WhatsAppQrResponse extends WhatsAppSessionMutationResponse {
  connected_phone: string | null;
  last_qr_generated_at: string | null;
  qr?: string;
}

export type WhatsAppDsrJobState =
  | "queued"
  | "running"
  | "awaiting_second_approval"
  | "soft_deleted"
  | "failed"
  | "cancelled";

export interface WhatsAppDsrPreviewRequest {
  phone: string;
}

export interface WhatsAppDsrPreview {
  phone_masked: string | null;
  phone_hash: string | null;
  message_count: number;
  match_count_as_sender: number;
  match_count_as_counterparty: number;
  mentions: number;
  reactions: number;
  body_scan: number;
  chats_involved: number;
  media_count: number;
  estimated_r2_bytes: number;
  oldest_ts: string | null;
  newest_ts: string | null;
  high_risk: boolean;
  requires_second_approval: boolean;
  recovery_window_days: number;
}

export interface WhatsAppDsrPreviewResponse {
  status: "ok";
  preview: WhatsAppDsrPreview;
}

export interface WhatsAppDsrDeleteRequest extends WhatsAppDsrPreviewRequest {
  reason: string;
  acknowledge_irreversible: boolean;
}

export interface WhatsAppDsrApproveRequest extends WhatsAppDsrPreviewRequest {
  job_id: string;
}

export interface WhatsAppDsrMutationResponse {
  status: "ok";
  job_id: string;
  state: WhatsAppDsrJobState;
  message?: string;
}

export interface WhatsAppSelfEraseRequest {
  confirm: boolean;
  reason?: string | null;
}

export interface WhatsAppSelfEraseResponse {
  status: "ok";
  job_id: string;
  message: "erasure_started";
}

export type WhatsAppNotificationEvent =
  | "session_stale"
  | "session_linked"
  | "share_received"
  | "share_expiring_soon"
  | "erasure_done";

export type WhatsAppNotificationChannel = "push" | "email";

export type WhatsAppNotificationPrefs = Record<
  WhatsAppNotificationEvent,
  Record<WhatsAppNotificationChannel, boolean>
>;

export interface WhatsAppPrefs {
  user_id: number;
  notifications: WhatsAppNotificationPrefs;
  updated_at: string | null;
}

export interface WhatsAppPrefsResponse {
  status: "ok";
  data: WhatsAppPrefs;
}

export interface WhatsAppPrefsUpdateRequest {
  notifications: Partial<
    Record<WhatsAppNotificationEvent, Partial<Record<WhatsAppNotificationChannel, boolean>>>
  >;
}

export interface WhatsAppDsrJob {
  id: string;
  state: WhatsAppDsrJobState;
  job_type: "delete_by_phone";
  phone_masked: string | null;
  phone_hash: string | null;
  requested_by_user_id: number | null;
  second_approver_user_id: number | null;
  reason: string | null;
  preview_counts: WhatsAppDsrPreview | Record<string, unknown>;
  result_counts: Record<string, unknown>;
  recovery_until: string | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  failed_reason: string | null;
}

export interface WhatsAppDsrHistoryResponse {
  status: "ok";
  data: WhatsAppDsrJob[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    has_more: boolean;
  };
}
