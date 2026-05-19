# WhatsApp Bridge — Capability Spec

> **Capability key:** `whatsapp-bridge`
> **Module key:** `whatsapp`
> **Owner team:** Backend (Flask) + Bridge service (Baileys / Meta Cloud API)
> **Phase:** 5A.WA1–5A.WA12 (sub-rows under Phase 5A Backend Productionization)
> **FE counterpart:** `platform-ui` (this repo) — `lib/api/whatsapp.ts`
> **Status:** Draft 2026-05-14 — derived from FE mock contract; pending BE acceptance
> **Authors:** platform-ui review (batches 159–161)

---

## 0. Purpose

The WhatsApp Bridge is the platform's archive + assisted-send surface
for a user's WhatsApp Personal account. Outbound was originally out
of scope; batch 168 added it behind admin-only permission + policy
require_approval. Capabilities:

1. **Per-user archive** — list chats, paginate messages, full-text search
2. **Same-org sharing** — owner shares one chat read-only with a same-org colleague
3. **Self-service session lifecycle** — link/relink/unlink via QR
4. **DSR (Data Subject Request)** — admin can delete-by-phone across all sessions in the org (GDPR Art. 17 / "right to erasure")

The FE mock contract in `lib/api/whatsapp.ts` is **frozen** — BE must
match it verbatim for the MOCK_MODE flip to be a one-line change
(`NEXT_PUBLIC_MOCK_API=false`).

---

## 1. Threat model

| Asset | Threat | Mitigation |
|---|---|---|
| WhatsApp session credentials (Baileys auth state or Meta API token) | Theft → impersonation, message-sending | Encrypted at rest (AES-256-GCM, key from KMS); never returned to FE; session-scoped to user_id |
| Message bodies (PII, possibly regulated content) | Cross-tenant leak | Every query `WHERE user_id = jwt.sub` AND `WHERE org_id = jwt.org_id`; tenant-isolation integration tests required |
| Phone numbers | Brute-force from leaked hash | SHA-256(`+E164` normalized, server-side) + per-org pepper from Settings Engine cap 16 |
| Shared chats | Privilege escalation across orgs | `shared_with_user_id.org_id == owner.org_id` enforced at write time + read time |
| DSR jobs | Mass deletion misuse | Two-person approval for `high_risk`; second approver MUST differ from requester; phone re-entered as proof-of-intent |
| Media attachments | Malware delivery / phishing | MIME + magic-byte validation; size cap from settings; `media_url_endpoint` MUST be relative (`/api/proxy/whatsapp/api/media/{id}/url`) — never external |
| QR codes | Session hijacking via screen-capture | QR images served as `data:` URL; never written to disk; rotate every 30s; mark page with `Cache-Control: no-store` |
| Webhook ingest | Unauthorized data injection | HMAC-SHA256 signature header verified against per-bridge shared secret; replay window 5 min |

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend (platform-ui)                 │
│  Pages: /whatsapp /whatsapp/sessions /whatsapp/chats/[id]    │
│         /whatsapp/search /whatsapp/admin/dsr                  │
│  Client: lib/api/whatsapp.ts (TanStack Query)                 │
└─────────────────┬────────────────────────────────────────────┘
                  │ HTTPS (same-origin)
                  ▼
┌──────────────────────────────────────────────────────────────┐
│              Next.js proxy (/api/proxy/whatsapp/*)            │
│  Forwards cookies + JWT → Flask                               │
└─────────────────┬────────────────────────────────────────────┘
                  │ HTTPS internal
                  ▼
┌──────────────────────────────────────────────────────────────┐
│                     Flask API (apps/whatsapp)                 │
│  • /api/my/sessions     • /api/chats     • /api/search       │
│  • /api/shared-with-me  • /api/users/typeahead               │
│  • /api/admin/dsr       • /api/erase-my-data                 │
│  Permissions: whatsapp.access, whatsapp.session.manage,      │
│              whatsapp.share, whatsapp.delete_by_subject       │
└─────────────────┬─────────────────────┬──────────────────────┘
                  │                     │
                  ▼                     ▼
       ┌────────────────────┐  ┌─────────────────────┐
       │  Postgres (RDS)    │  │  Bridge service     │
       │  wa_sessions       │  │  (Baileys / Meta)   │
       │  wa_chats          │  │  • holds session    │
       │  wa_messages       │  │    credentials      │
       │  wa_contacts       │  │  • emits webhooks   │
       │  wa_chat_shares    │  │    on message arr.  │
       │  wa_dsr_jobs       │  └─────────┬───────────┘
       └────────────────────┘            │
                                         ▼
                              ┌──────────────────────┐
                              │  Object storage (R2) │
                              │  Media blobs, sha256 │
                              │  keys, lifecycle 90d │
                              └──────────────────────┘
```

**Component contracts:**
- **Bridge service** is a separate Go/Node process per-replica. Holds Baileys auth state in encrypted Redis. Emits HMAC-signed webhooks to Flask `/api/whatsapp/webhook/ingest`.
- **Flask API** is the only thing the FE talks to. Never returns session credentials. Audit-log every mutation via cap 10.
- **Postgres** is the system-of-record for messages + metadata. Bridge service has read-only DB access for replay; writes go via Flask.

---

## 3. URL contract

All FE → BE paths are under `/api/proxy/whatsapp` (Next.js proxy strips
the prefix and forwards to Flask `/api/whatsapp/*` or its mounted
blueprint). The FE expects these endpoints **exactly**:

### 3.1 Sessions (self-service)

| Method | Path | Auth | Permission | Returns |
|---|---|---|---|---|
| GET    | `/api/my/sessions` | JWT | `whatsapp.access` | `WhatsAppSessionsResponse` |
| POST   | `/api/my/sessions` | JWT | `whatsapp.session.manage` | `WhatsAppSessionMutationResponse` — starts QR linking |
| GET    | `/api/my/sessions/:id/qr` | JWT | `whatsapp.session.manage` | `WhatsAppQrResponse` — polled every 3 s; SHOULD set `Cache-Control: no-store` |
| POST   | `/api/my/sessions/:id/relink` | JWT | `whatsapp.session.manage` | `WhatsAppSessionMutationResponse` — fresh QR for same session |
| DELETE | `/api/my/sessions/:id` | JWT | `whatsapp.session.manage` | `WhatsAppSessionMutationResponse` — moves to `unlinked`; archive retained |

**Invariants enforced at BE:**
- A user MUST have at most **one** session with `session_state != "unlinked"`. POST returns `409 active_session_exists` otherwise.
- `connected_phone` is `null` until state reaches `ready`.
- `lease_expires_at` is set when bridge acquires the session and refreshed every heartbeat; if expired, state transitions to `disconnected`.

### 3.2 Chat archive

| Method | Path | Auth | Permission | Returns |
|---|---|---|---|---|
| GET | `/api/chats?q=&kind=&page=&page_size=` | JWT | `whatsapp.access` | `WhatsAppChatsResponse` — owned only |
| GET | `/api/shared-with-me?q=&kind=&page=&page_size=` | JWT | `whatsapp.access` | `WhatsAppChatsResponse` — chats shared TO current user |
| GET | `/api/chats/:id/messages?before_id=&page_size=` | JWT | `whatsapp.access` | `WhatsAppMessagesResponse` — newest-first, key-set pagination |
| GET | `/api/chats/:id/shares` | JWT | `whatsapp.access` (owner only) | `WhatsAppChatSharesResponse` |
| POST | `/api/chats/:id/shares` | JWT | `whatsapp.share` | `WhatsAppChatShareMutationResponse` |
| DELETE | `/api/shares/:share_id` | JWT | `whatsapp.share` (owner) or recipient | `WhatsAppChatShareMutationResponse` |

**Authorization rules:**
- `GET /api/chats/:id/messages` succeeds if **(a)** the requester is the chat owner OR **(b)** an active (non-revoked, non-expired) share exists for the requester. Otherwise `404 not_found` (deliberately ambiguous — never `403` for cross-tenant access).
- `POST /api/chats/:id/shares` MUST verify `shared_with_user.org_id == requester.org_id`. Else `404 recipient_not_found` (do not leak user existence cross-org).
- `DELETE /api/shares/:share_id` accepts either the owner OR the recipient of that share.

### 3.3 Search

| Method | Path | Auth | Permission | Returns |
|---|---|---|---|---|
| GET | `/api/search?q=&chat_id=&type=&page=&page_size=` | JWT | `whatsapp.access` | `WhatsAppMessageSearchResponse` |
| GET | `/api/users/typeahead?q=` | JWT | `whatsapp.share` | `WhatsAppShareRecipientsResponse` — same-org users only, min 2 chars |

**Search invariants:**
- Body indexed with Postgres `tsvector` (or Meilisearch when cap 11 backend lands).
- `q` empty → `data: []` returned (FE relies on this; do not 400).
- Results MUST be scoped to messages the requester can read (owned chats + active shares).

### 3.4 DSR & self-erase

| Method | Path | Auth | Permission | Returns |
|---|---|---|---|---|
| POST   | `/api/admin/dsr/preview` | JWT | `whatsapp.delete_by_subject` | `WhatsAppDsrPreviewResponse` |
| POST   | `/api/admin/dsr/delete` | JWT | `whatsapp.delete_by_subject` | `WhatsAppDsrMutationResponse` (state=`queued` or `awaiting_second_approval`) |
| POST   | `/api/admin/dsr/approve` | JWT | `whatsapp.delete_by_subject` | `WhatsAppDsrMutationResponse` (state=`soft_deleted`) — different user than `delete` |
| GET    | `/api/admin/dsr/:job_id` | JWT | `whatsapp.delete_by_subject` | `WhatsAppDsrJob` |
| GET    | `/api/admin/dsr?page=&page_size=` | JWT | `whatsapp.delete_by_subject` | `WhatsAppDsrHistoryResponse` |
| POST   | `/api/erase-my-data` | JWT | `whatsapp.access` | `WhatsAppSelfEraseResponse` — user erases own data |

**DSR invariants (CRITICAL):**
- `preview` and `delete` MUST receive the phone as plain text from FE. BE normalizes via E.164 and computes `phone_hash = SHA256(normalized + org_pepper)`. **Never trust FE-computed hash.**
- `delete` requires `acknowledge_irreversible: true` AND a `preview_token` from a recent preview call (5-minute window). Otherwise `400 missing_preview`.
- `requires_second_approval = preview.high_risk` where `high_risk = (message_count >= 500) OR (chats_involved >= 10) OR (estimated_r2_bytes >= 50_000_000)` — thresholds from Settings cap 16.
- `approve` MUST verify `jwt.sub != job.requested_by_user_id`. Else `409 self_approval_forbidden`.
- `approve` MUST re-receive the phone and verify the hash matches `job.phone_hash`. Mismatch → `400 phone_mismatch`.
- `soft_deleted` state masks messages but keeps them recoverable for `recovery_window_days` (default 7, configurable per-org via Settings cap 16). After that, hard delete + R2 blob removal.

---

## 4. Payload contracts

All shapes mirror `lib/modules/whatsapp/types.ts`. The FE imports types
from there; the BE response **MUST** match field names + types + nullability.

### 4.1 Session

```typescript
WhatsAppSession {
  id: number;                                  // BE-assigned; never client-supplied
  session_state: "needs_qr" | "connecting" | "ready" | "disconnected" | "failed" | "unlinked";
  session_state_updated_at: string | null;     // ISO 8601 UTC
  last_qr_generated_at: string | null;
  connected_phone: string | null;              // E.164, e.g. "+972501234567"; null until ready
  last_heartbeat_at: string | null;            // bridge keepalive
  assigned_replica: string | null;             // for debug; FE displays it dimmed
  lease_expires_at: string | null;
  relink_requested_at: string | null;
  meta: Record<string, unknown>;               // free-form; FE renders nothing from it today
  created_at: string | null;
}

WhatsAppQrResponse {
  status: "ok";
  session_id: number;
  session_state: WhatsAppSessionState;
  connected_phone: string | null;
  last_qr_generated_at: string | null;
  qr?: string;                                 // data:image/png;base64,... — only set during needs_qr/connecting
}
```

**QR encoding:** PNG or SVG as `data:` URL, max 256×256 px, max 4 KB. BE
rotates QR every 30 s by re-fetching from the bridge service; FE polls
every 3 s and replaces the image atomically.

### 4.2 Chat / message

```typescript
WhatsAppChat {
  id: number;                                  // platform-assigned, NOT the WhatsApp jid
  wa_chat_id: string;                          // upstream jid, e.g. "972501234567@c.us" or "120363045678@g.us"
  kind: "private" | "group";
  display_name: string | null;                 // user-set or group name; null for anonymous private
  is_archived: boolean;
  is_muted: boolean;
  participant_count: number | null;            // group only
  last_message_at: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  meta: Record<string, unknown>;               // last_message_preview is the only field FE renders today
  access_kind?: "owner" | "shared";            // populated by BE per request context
  share?: WhatsAppChatShare | null;            // populated when access_kind=shared
}

WhatsAppMessage {
  id: number;
  wa_message_id: string;                       // upstream message id (canonical)
  chat_id: number;
  sender_contact_id: number | null;
  sender_phone: string | null;                 // E.164; null when sender is the user themselves
  sender_is_me: boolean;
  ts: string | null;                           // message send time
  body: string | null;                         // text content; null when type != "chat"/"reply"
  type: string;                                // "chat" | "image" | "video" | "document" | "audio" | "sticker" | "location" | ...
  has_media: boolean;
  media_mime: string | null;
  media_size_bytes: number | null;
  media_sha256: string | null;
  media_caption: string | null;
  media_url_endpoint: string | null;           // MUST start with "/api/proxy/whatsapp/" — relative only
  quoted_message_id: number | null;
  mentions: unknown[];                         // array of {wa_jid, display_name}
  reactions: unknown[];                        // array of {emoji, by_phone, ts}
  edited_at: string | null;
  revoked_at: string | null;                   // user revoked the message client-side
  erased_at: string | null;                    // platform DSR / self-erase mask
  captured_at: string | null;                  // bridge ingestion timestamp
}
```

**Erasure semantics:**
- `revoked_at != null` → display `[message revoked]` placeholder; keep metadata, drop body/media URL.
- `erased_at != null` → result of platform DSR. Same as revoked from FE POV. After `recovery_window_days`, the row is hard-deleted and won't appear in any query.

### 4.3 Pagination

| Endpoint | Pagination style | Why |
|---|---|---|
| `/api/chats`, `/api/shared-with-me`, `/api/search`, `/api/admin/dsr` | **Page-based** (`page`, `page_size`) | Stable counts, supports `total`; UIs render counters |
| `/api/chats/:id/messages` | **Keyset** (`before_id`) | Append-only stream; infinite scroll |
| `/api/users/typeahead` | **None** (top-N) | Always returns ≤ 20 |

Default `page_size = 50`, max `100`. Out-of-range values clamped server-side.

### 4.4 Shares

```typescript
WhatsAppChatShare {
  id: number;
  chat_id: number;
  shared_with_user_id: number;
  shared_with_user_name: string | null;
  shared_with_user_email: string | null;
  shared_by_user_id: number;
  shared_by_user_name: string | null;
  shared_by_user_email: string | null;
  created_at: string | null;
  expires_at: string | null;                   // null = never (still revocable)
  note: string | null;                         // max 500 chars, plain text, BE sanitizes
  revoked_at: string | null;
}

WhatsAppShareChatInput {
  shared_with_user_id: number;                 // BE verifies same-org
  expires_at?: string | null;                  // ISO 8601 UTC
  note?: string | null;                        // 0–500 chars
}
```

**Uniqueness:** Only ONE active (non-revoked, non-expired) share per
`(chat_id, shared_with_user_id)` tuple. Attempting to share again →
`409 share_already_exists`.

### 4.5 DSR

```typescript
WhatsAppDsrPreview {
  phone_masked: string | null;                 // "+972***1234" — BE generates, NEVER full phone
  phone_hash: string | null;                   // SHA-256(normalized + org_pepper); hex; 64 chars
  message_count: number;
  match_count_as_sender: number;
  match_count_as_counterparty: number;
  mentions: number;
  reactions: number;
  body_scan: number;                           // count of text-only mentions of the phone in any message body
  chats_involved: number;
  media_count: number;
  estimated_r2_bytes: number;
  oldest_ts: string | null;
  newest_ts: string | null;
  high_risk: boolean;                          // BE computes; see DSR invariants
  requires_second_approval: boolean;           // == high_risk for v1
  recovery_window_days: number;                // from Settings cap 16
}

// Preview response MUST include an opaque preview_token that the
// subsequent /delete call passes in the Idempotency-Key header.
// Lifetime: 5 minutes.
WhatsAppDsrPreviewResponse {
  status: "ok";
  preview: WhatsAppDsrPreview;
  preview_token: string;                       // opaque; FE stores in memory; never logged
  preview_expires_at: string;                  // ISO 8601 UTC, +5 min
}

WhatsAppDsrJob {
  id: string;                                  // UUID
  state: "queued" | "running" | "awaiting_second_approval" | "soft_deleted" | "failed" | "cancelled";
  job_type: "delete_by_phone";
  phone_masked: string | null;                 // masked at job creation
  phone_hash: string | null;
  requested_by_user_id: number | null;
  second_approver_user_id: number | null;
  reason: string | null;                       // free text, ≤ 500 chars, required at delete time
  preview_counts: WhatsAppDsrPreview | Record<string, unknown>;
  result_counts: Record<string, unknown>;      // populated when state=soft_deleted
  recovery_until: string | null;               // soft_deleted + recovery_window_days
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  failed_reason: string | null;
}
```

---

## 5. Webhook contract (bridge → Flask)

The bridge service pushes message ingestion events to Flask. FE does
not see this surface — it's noted here so BE can implement.

### 5.1 Endpoint

`POST /api/whatsapp/webhook/ingest`

### 5.2 Authentication

| Header | Required | Notes |
|---|---|---|
| `X-Bridge-Signature` | yes | `sha256=<hex>` HMAC of body using `WHATSAPP_BRIDGE_SECRET` from cap 47 Secrets Manager |
| `X-Bridge-Timestamp` | yes | Unix epoch seconds; reject if `abs(now - ts) > 300` |
| `X-Bridge-Id` | yes | Bridge replica identifier (`bridge-replica-001`) |

Reject with `401 unauthorized` if signature fails OR `400 stale_request` if timestamp drifts.

### 5.3 Payload

```typescript
WebhookIngestPayload {
  event: "message" | "session_state" | "qr" | "heartbeat" | "error";
  session_id: number;                          // platform session id, NOT wa session
  wa_user_id: string;                          // upstream wa jid of the linked account
  at: string;                                  // ISO 8601 UTC
  data: MessagePayload | StatePayload | QrPayload | HeartbeatPayload | ErrorPayload;
}

MessagePayload {
  wa_message_id: string;                       // unique upstream
  chat_jid: string;                            // "972501234567@c.us" or "120363045678@g.us"
  ts: string;
  sender_jid: string | null;
  sender_is_me: boolean;
  body: string | null;
  type: string;
  media?: {
    mime: string;
    size_bytes: number;
    sha256: string;
    storage_key: string;                       // R2 object key
    caption?: string | null;
  };
  quoted_wa_message_id?: string | null;
  mentions?: string[];                         // wa_jids
  reactions?: { emoji: string; by_jid: string; ts: string }[];
}

StatePayload { state: WhatsAppSessionState; }
QrPayload    { qr: string; }                   // data: URL, ≤ 4KB
HeartbeatPayload { at: string; replica: string; lease_expires_at: string; }
ErrorPayload { code: string; message: string; recoverable: boolean; }
```

### 5.4 Idempotency

`message` events MUST be idempotent by `(session_id, wa_message_id)`.
Bridge MAY redeliver during reconnect — Flask MUST upsert, not append.

### 5.5 Backpressure

Flask returns `429 backpressure` if the ingestion queue exceeds 10 000
pending. Bridge MUST back off exponentially (2s, 4s, 8s, … capped at
60s) and retry.

---

## 6. Error envelope

All errors return:

```json
{
  "status": "error",
  "error": "machine_readable_code",
  "message": "Human-readable English message",
  "details": { "field": "...", "hint": "..." }
}
```

Standard codes the FE recognizes (matches FE strings in `whatsapp.errors.*`):

| Code | HTTP | When |
|---|---|---|
| `not_found` | 404 | Chat / share / session not in current user's reachable set |
| `recipient_not_found` | 404 | Share recipient missing OR not same-org (deliberately ambiguous) |
| `share_already_exists` | 409 | Active share already exists for `(chat_id, user_id)` |
| `active_session_exists` | 409 | Attempt to POST `/api/my/sessions` while another non-unlinked session lives |
| `session_already_exists` | 409 | (Alias kept for FE backward compat with mock) |
| `invalid_phone` | 400 | Phone fails E.164 normalization |
| `missing_preview` | 400 | DSR `delete` without a valid `preview_token` |
| `phone_mismatch` | 400 | DSR `approve` phone differs from job's `phone_hash` |
| `self_approval_forbidden` | 409 | DSR approver is also the requester |
| `permission_denied` | 403 | RBAC failure (FE PermissionGate is UX-only) |
| `feature_disabled` | 403 | `whatsapp.enabled` flag off for org |
| `rate_limited` | 429 | Per-user QR generation > 5/min OR per-org typeahead > 60/min |
| `bridge_unreachable` | 503 | Bridge service unreachable; transient |

**Security rule:** never return DB errors, stack traces, internal IDs,
or cross-tenant existence hints. `not_found` is the default for
"not yours" — never `403`.

---

## 7. Permissions registry (canonical)

These permissions MUST be added to `lib/api/roles.ts` (FE) and the
backend role/permission tables. Drift found in batch-159 review:
**`whatsapp.delete_by_subject` is referenced by the DSR page but
NOT registered.**

| Permission | Scope | Granted to (default) | Used in |
|---|---|---|---|
| `whatsapp.access` | Read own archive, read shared-in chats | All users with WhatsApp module enabled | `/whatsapp`, `/whatsapp/chats/:id`, `/whatsapp/search` |
| `whatsapp.session.manage` | Link, relink, unlink own sessions | All users with WhatsApp module enabled | `/whatsapp/sessions` mutations |
| `whatsapp.share` | Share own chats with same-org users | Org default: enabled; admin-toggleable | ShareDialog mutations |
| `whatsapp.delete_by_subject` | DSR delete-by-phone admin console | Org admin + system admin only | `/whatsapp/admin/dsr` |

**Backend MUST be the source of truth.** FE `PermissionGate` is UX-only.

---

## 8. Audit log (cap 10) emissions

Every mutation emits a `category=ai`-or-`update`-or-`delete` audit entry.
The FE mock already emits these; BE MUST de-duplicate by
`(action, resource_id, request_id)` after the flip.

| Action | Category | Resource type | Resource id | Source |
|---|---|---|---|---|
| `whatsapp.session.linked` | create | `whatsapp_session` | session_id | POST `/api/my/sessions` |
| `whatsapp.session.relinked` | update | `whatsapp_session` | session_id | POST `/api/my/sessions/:id/relink` |
| `whatsapp.session.unlinked` | delete | `whatsapp_session` | session_id | DELETE `/api/my/sessions/:id` |
| `whatsapp.share.created` | create | `whatsapp_chat_share` | share_id | POST `/api/chats/:id/shares` |
| `whatsapp.share.revoked` | delete | `whatsapp_chat_share` | share_id | DELETE `/api/shares/:share_id` |
| `whatsapp.dsr.previewed` | update | `whatsapp_dsr_job` | "preview-{token-prefix-8}" | POST `/api/admin/dsr/preview` |
| `whatsapp.dsr.requested` | delete | `whatsapp_dsr_job` | job_id | POST `/api/admin/dsr/delete` |
| `whatsapp.dsr.approved` | delete | `whatsapp_dsr_job` | job_id | POST `/api/admin/dsr/approve` |
| `whatsapp.dsr.completed` | delete | `whatsapp_dsr_job` | job_id | Internal — when worker finishes |
| `whatsapp.self_erase.requested` | delete | `whatsapp_dsr_job` | job_id | POST `/api/erase-my-data` |

Metadata SHOULD include `phone_masked` (never raw phone) and
`message_count` for DSR jobs.

---

## 9. AI integration

Three skills declared in `lib/modules/whatsapp/skills.ts`, all
`ai_callable: true, default_enabled: false`:

| Skill ID | Risk | Capability level (mock LLM) | Executor |
|---|---|---|---|
| `whatsapp.session.link` | low | WRITE_LOW | `lib/platform/ai-actions/executors.ts` |
| `whatsapp.session.relink` | low | WRITE_LOW | `executors.ts` |
| `whatsapp.session.unlink` | medium | DESTRUCTIVE | `executors.ts` |

Read paths (`fetchWhatsappChats`, `searchWhatsappMessages`) are
**deliberately not exposed as AI skills** until the LLM gateway can
enforce per-message redaction. AI is allowed to operate on session
lifecycle only.

**AI readiness level:** 3 (Action Proposal). FE proposes action; user
confirms; executor runs; audit fires. Locked by batch 142 demo-slice
test.

---

## 10. Feature flag

Single flag: **`whatsapp.enabled`** (registered in `lib/api/feature-flags.ts`).
Default off for new orgs. When off:

- Sidebar item hidden (manifest registry filters by flag)
- Every page renders the `FeatureGate` fallback (disabled message)
- AI skills marked enabled in registry are still hidden from skill list

Org admin toggles via `/admin/feature-flags`. Backend MUST enforce
independently — flag check is the second line, not the only one.

---

## 11. MOCK_MODE flip checklist

Run when the BE bridge + endpoints are wired into staging. Each step
is a 1-line change unless noted.

### 11.1 Per-FE-client checks (single `lib/api/whatsapp.ts`)

- [ ] **Step 1 — env flip.** Set `NEXT_PUBLIC_MOCK_API=false` in staging.
- [ ] **Step 2 — sessions.** GET/POST/DELETE `/api/my/sessions[/:id[/qr|relink]]` return shape matches `WhatsAppSessionsResponse` / `WhatsAppSessionMutationResponse` / `WhatsAppQrResponse`.
- [ ] **Step 3 — chats.** GET `/api/chats`, `/api/shared-with-me` shape matches `WhatsAppChatsResponse` with correct `meta.total` / `meta.has_more`.
- [ ] **Step 4 — messages.** GET `/api/chats/:id/messages?before_id=&page_size=` returns newest-first, with `meta.next_before_id` for keyset pagination.
- [ ] **Step 5 — search.** GET `/api/search?q=` returns `WhatsAppMessageSearchResponse`; empty `q` → empty `data` (do NOT 400).
- [ ] **Step 6 — shares.** GET/POST `/api/chats/:id/shares`, DELETE `/api/shares/:id`, GET `/api/users/typeahead?q=` work.
- [ ] **Step 7 — DSR.** POST `/api/admin/dsr/preview` returns `preview_token` + 5-min expiry; POST `/api/admin/dsr/delete` requires the token; POST `/api/admin/dsr/approve` enforces `self_approval_forbidden` + `phone_mismatch`.
- [ ] **Step 8 — self-erase.** POST `/api/erase-my-data` returns `WhatsAppSelfEraseResponse` with `message: "erasure_started"`.
- [ ] **Step 9 — audit.** Every mutation writes to PlatformAuditLog (cap 10) with the canonical `action` strings from §8. FE de-dupe key: `(action, resource_id, request_id)`.
- [ ] **Step 10 — error envelope.** Every error returns the §6 shape; FE i18n strings in `whatsapp.errors.*` match the BE `error` codes 1:1.
- [ ] **Step 11 — feature flag.** `whatsapp.enabled` resolves from BE FeatureFlags (cap 17), not mock.
- [ ] **Step 12 — RBAC.** All 4 permissions present in BE roles table + auto-granted to default roles per §7.

### 11.2 Cleanup tasks

- [ ] **Step 13 — localStorage guard.** Add runtime check in `lib/api/whatsapp.ts`: `if (!MOCK_MODE) { saveMockState = noop; loadMockState = noop }` to prevent leftover `whatsapp:*:v1` keys from polluting live UI.
- [ ] **Step 14 — Mock fixture removal.** Delete `MOCK_CHATS`, `MOCK_MESSAGES`, `MOCK_QR`, `MOCK_SHARES_FIXTURE`, `MOCK_SHARE_RECIPIENTS` after one release where MOCK_MODE=false is stable.
- [ ] **Step 15 — Permission registry alignment.** Add `whatsapp.share` (id TBD) and `whatsapp.delete_by_subject` (id TBD) to `lib/api/roles.ts` BEFORE the flip.

### 11.3 Pre-prod sanity gates

- [ ] `npx vitest run` green (current: 1347/1347)
- [ ] `npx tsc --noEmit` clean
- [ ] `node scripts/check-coverage-baseline.mjs` green
- [ ] Playwright E2E green against staging (auth + sessions + share + DSR happy paths)
- [ ] Manual: link a real test WhatsApp number end-to-end, send a test message from another phone, see it in `/whatsapp/chats/...` within 30 s
- [ ] Manual: revoke a share, confirm recipient gets 404 on the chat detail page
- [ ] Manual: DSR preview + delete + approve a test phone, confirm `recovery_until` is honored

---

## 12. Security model — concrete BE requirements

### 12.1 Encryption at rest

| Data | Encryption | Key source |
|---|---|---|
| WhatsApp session credentials (Baileys auth state) | AES-256-GCM | KMS-wrapped data key per org, rotated 90 d |
| Message bodies in `wa_messages.body` | Postgres pgcrypto column encryption | Same KMS DEK |
| Media blobs in R2 | R2 native SSE-S3 | R2-managed |
| Phone hashes | One-way SHA-256 + per-org pepper | Pepper in cap 47 Secrets Manager |

### 12.2 Encryption in transit

- All FE ↔ Flask: HTTPS at ingress (Cloudflare). HTTP redirect at the LB.
- Flask ↔ Bridge service: mTLS or HMAC-signed HTTPS (chosen per deployment).
- Bridge ↔ R2 / Postgres: TLS via the platform's standard cluster config.

### 12.3 Authentication

- All `/api/*` endpoints `@jwt_required`. No anonymous access.
- Webhook: HMAC + timestamp (see §5.2).

### 12.4 Authorization

- `@permission_required("<permission>")` on every mutation per §7.
- Every query MUST filter by `WHERE user_id = jwt.sub AND org_id = jwt.org_id`.
- Cross-org reads NEVER allowed; cross-user reads only via active shares.

### 12.5 Audit

- Cap 10 PlatformAuditLog. See §8 for the 10 canonical actions.
- DSR jobs emit progress events at `queued`/`running`/`soft_deleted`/`hard_deleted`.

### 12.6 Rate limits

| Endpoint | Per-user | Per-org | Code |
|---|---|---|---|
| POST `/api/my/sessions` | 5 / min | n/a | `rate_limited` |
| GET `/api/my/sessions/:id/qr` | 60 / min (polling) | n/a | `rate_limited` |
| POST `/api/admin/dsr/*` | 10 / min | 50 / day | `rate_limited` |
| GET `/api/search` | 30 / min | 600 / hour | `rate_limited` |
| GET `/api/users/typeahead` | 60 / min | n/a | `rate_limited` |

### 12.7 PII / data minimization

- `phone_masked` always (never full phone in JSON response).
- `media_url_endpoint` must be relative path, never external URL (XSS / redirect attack vector).
- `body` field NEVER returned for revoked / erased messages — replaced with `null`.
- Webhook payload bodies retained max 24 h in any log; redact at log-collector.

### 12.8 Compliance posture

- **GDPR Art. 17 (right to erasure)** — DSR delete-by-phone handles requests from non-users (e.g. a person whose number appears in someone else's contact list).
- **GDPR Art. 20 (data portability)** — not in scope v1; planned for cap `whatsapp.export`.
- **WhatsApp Business Solution Terms** — this is a **personal-account archive**, NOT WABS. Documentation must make clear: no opt-in messaging, no marketing.
- **Israeli Spam Law (Communications Law, 1982 amendment 40)** — same: read-only archive, no outbound.

---

## 13. Performance targets

| Metric | Target | Measure at |
|---|---|---|
| `GET /api/chats` p95 | < 200 ms | Org with 5 k chats, page_size=50 |
| `GET /api/chats/:id/messages` p95 | < 250 ms | Chat with 50 k messages, page_size=50 |
| `GET /api/search` p95 | < 400 ms | 50 k owned messages, indexed `tsvector` |
| Webhook ingest p95 | < 100 ms | 1 000 messages/min |
| QR refresh latency | < 1 s | Bridge → Flask → FE |
| `POST /api/admin/dsr/delete` | < 2 s for queueing; deletion job async | n/a |

---

## 14. Open questions (BE team to answer)

1. **Baileys vs Meta Cloud API?** Baileys is unofficial / can break on WhatsApp updates. Meta Cloud needs Business approval (weeks). Decision impacts §2 bridge architecture.
2. **Multi-device session sharing.** WhatsApp allows 4 linked devices per number. Should the platform refuse to link if the user already has another linked device elsewhere? Or co-exist?
3. **Group membership signal.** When a user is removed from a WA group, what does the platform do — mark chat archived, stop receiving messages, both?
4. **R2 lifecycle for media.** Currently spec says 90 d. Should it match `recovery_window_days` for DSR? What about end-of-contract data export?
5. **Backup / disaster recovery.** Postgres + R2 PITR cadence? Bridge service is stateful — recovery RTO/RPO?
6. **Brazilian / Indian phone formats.** `normalizePhone` in FE assumes IL-friendly heuristics. BE normalizer MUST be locale-agnostic.

---

## 15. Backlog (FE-side, after this spec lands)

Tracked separately; not blocking BE work. From the batch-159 review:

| Item | Priority |
|---|---|
| Add `whatsapp.delete_by_subject` to `lib/api/roles.ts` | 🔴 P0 |
| Wrap ShareDialog trigger in `PermissionGate permission="whatsapp.share"` | 🔴 P0 |
| Write `docs/modules/whatsapp/LEGACY_INVENTORY.md` | 🔴 P0 |
| Write `docs/modules/whatsapp/E2E_COVERAGE.md` | 🔴 P0 |
| Bound `qrQuery` polling with 60s max | 🟠 P1 |
| Add `aria-live="polite"` to QR dialog state changes | 🟠 P1 |
| Make `eraseReason` required | 🟠 P1 |
| Add runtime localStorage guard `if (!MOCK_MODE) { ... }` | 🟠 P1 |
| Page-render tests for archive / search / chat-detail / DSR | 🟠 P1 |
| Real-fetch tests for whatsapp endpoints (similar to batch 154) | 🟡 P2 |
| E2E specs for archive / search / share / DSR happy paths | 🟡 P2 |
| AI_READINESS.md entry for whatsapp module | 🟡 P2 |

---

## 16. Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-14 | platform-ui review (batch 159) | Initial draft; FE contract frozen against `lib/api/whatsapp.ts` and `lib/modules/whatsapp/types.ts`. Pending BE acceptance. |
