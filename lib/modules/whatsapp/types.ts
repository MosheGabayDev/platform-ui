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
}

export interface WhatsAppSessionsResponse {
  status: "ok";
  data: WhatsAppSession[];
}

export type WhatsAppChatKind = "private" | "group";

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
