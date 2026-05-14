# whatsapp — Legacy Functionality Inventory

> Inventoried by: platform-ui review (batch 160)
> Inventory date: 2026-05-14
> Round: WhatsApp bridge productionization (Phase 5A.WA*)
> Status: complete (initial)
>
> Cross-references:
> - Central tracker: `docs/system-upgrade/03-module-migration-progress.md`
> - E2E coverage plan: `docs/modules/whatsapp/E2E_COVERAGE.md`
> - Capability spec: `docs/system-upgrade/04-capabilities/whatsapp-bridge-spec.md`
> - AI readiness: `docs/modules/whatsapp/AI_READINESS.md`

---

## Module Identity

| Field | Value |
|---|---|
| module_key | `whatsapp` |
| display_name | WhatsApp Archive |
| legacy_app_path | n/a — greenfield module (no legacy Flask app to migrate from) |
| owner | parallel agent (active) + BE team (Phase 5A.WA*) |
| related_db_tables | `wa_sessions`, `wa_chats`, `wa_messages`, `wa_contacts`, `wa_chat_shares`, `wa_dsr_jobs`, `wa_share_recipients_index` (planned BE) |
| related_files_media_s3 | R2 bucket `platform-whatsapp-media`, prefix `org_{id}/wa_{session}/`, 90-day lifecycle |
| related_background_jobs | `wa.message.ingest` (bridge → Flask), `wa.dsr.execute`, `wa.session.heartbeat`, `wa.media.transcode` |
| related_integrations | Bridge service (Baileys or Meta Cloud API — TBD per spec §14 Open Q1), R2, KMS, AuditLog (cap 10), Notifications (cap 12), FeatureFlags (cap 17) |
| related_ai_llm_calls | None for archive; 3 AI skills for session lifecycle (link/relink/unlink) routed via AIProviderGateway when cap 5A.16 lands |
| related_permissions | `whatsapp.access`, `whatsapp.session.manage`, `whatsapp.share`, `whatsapp.delete_by_subject` (all 4 registered in `lib/api/roles.ts` as of batch 160) |
| related_settings | `whatsapp.enabled` (flag), `whatsapp.dsr.high_risk_thresholds.*` (cap 16 Settings), `whatsapp.dsr.recovery_window_days` (default 7), `whatsapp.share.max_active_per_chat` (default 10), `whatsapp.media.max_size_bytes` (default 50MB) |

> **Note:** This module is a greenfield build, NOT a Flask-rewrite. The
> "legacy inventory" here documents the FE mock contract as the baseline
> against which the BE will be built. Sections below describe the FE
> contract that BE must match verbatim per
> `04-capabilities/whatsapp-bridge-spec.md`.

---

## Pages / Routes (current FE surface)

### Page: `/whatsapp` — Archive list

| Field | Value |
|---|---|
| route_path | `/whatsapp` |
| purpose | List the current user's owned WhatsApp chats with last-message preview |
| authorized_roles | Any user with `whatsapp.access` permission AND `whatsapp.enabled` feature flag on for org |
| actions_available | Search by query, filter by kind (all/private/group), open chat detail, navigate to search page |
| forms | None |
| filters_search | Text query (server-side LIKE/tsvector), kind filter (all/private/group), page-based pagination (page_size=50) |
| tables | n/a (card list); columns shown: icon, display_name, last_message_at, participant_count (group only), is_muted, is_archived |
| detail_views | `/whatsapp/chats/[id]` |
| export_import | None |
| bulk_actions | None |
| edge_cases | Empty owner archive renders empty state with no-CTA; shared-in chats live in same list with `access_kind=shared` |
| current_pain_points | No grouping by date; no "shared with me" tab separation in current UI (mixed list); no archived-hide toggle |

### Page: `/whatsapp/chats/[id]` — Chat detail

| Field | Value |
|---|---|
| route_path | `/whatsapp/chats/[id]` |
| purpose | View messages of one authorized chat (owner or active-share recipient) |
| authorized_roles | `whatsapp.access` + chat ownership OR active share for current user |
| actions_available | Read messages (newest-first), open ShareDialog (owner only, gated by `whatsapp.share`), revoke own access (recipient), navigate back |
| forms | ShareDialog: recipient typeahead (min 2 chars), datetime-local expires_at, note (max 500 chars) |
| filters_search | None on this page (use `/whatsapp/search`) |
| tables | n/a (message bubbles); each bubble: sender (self/phone), ts, body, media stub (mime+size) |
| detail_views | None |
| export_import | None |
| bulk_actions | None |
| edge_cases | Revoked / erased messages show `[revoked]` / `[erased]` placeholders; shared-in chats hide ShareDialog and show "shared by X / expires Y" banner with self-revoke button |
| current_pain_points | No older-pagination CTA visible (uses keyset `before_id`); no media preview, only stub; no jump-to-date |

### Page: `/whatsapp/search` — Message search

| Field | Value |
|---|---|
| route_path | `/whatsapp/search` |
| purpose | Full-text search across messages the current user can read |
| authorized_roles | `whatsapp.access` |
| actions_available | Type query, click result → opens chat detail |
| forms | Search input (no submit button; query on change) |
| filters_search | `q` (text), optional `chat_id` (not surfaced in UI), optional `type` filter |
| tables | n/a (result list with highlight snippets) |
| detail_views | Result row links to `/whatsapp/chats/[chat_id]` |
| export_import | None |
| bulk_actions | None |
| edge_cases | Empty `q` → idle state (no API call); no results → empty state; error → ErrorState with retry |
| current_pain_points | No min-length hint to user; no debounce visible (request per keystroke triggers query — BE rate-limits 30/min) |

### Page: `/whatsapp/sessions` — Self-service session lifecycle

| Field | Value |
|---|---|
| route_path | `/whatsapp/sessions` |
| purpose | Link/relink/unlink personal WhatsApp session via QR pairing |
| authorized_roles | `whatsapp.session.manage` for mutations; `whatsapp.access` to view status |
| actions_available | Link new session, show QR dialog, relink, unlink (confirm dialog), self-erase ALL my data (confirm dialog + acknowledge checkbox) |
| forms | Self-erase: optional reason textarea (gap noted in review — should be required), required acknowledge checkbox |
| filters_search | None |
| tables | Status sidebar with metrics (sessions count, active state, heartbeat) |
| detail_views | None |
| export_import | None |
| bulk_actions | None |
| edge_cases | Mock-mode banner; QR polls every 3s while dialog open; on `ready` state auto-closes QR and toasts; only ONE active session allowed (POST refuses with `409 active_session_exists`) |
| current_pain_points | QR polling unbounded (no max-attempt); QR state changes not announced to screen readers (no `aria-live`); self-erase reason field optional (audit-trail gap) |

### Page: `/whatsapp/admin/dsr` — DSR delete-by-phone (admin)

| Field | Value |
|---|---|
| route_path | `/whatsapp/admin/dsr` |
| purpose | GDPR Art. 17 erasure jobs — delete all messages matching a phone across all sessions in the org |
| authorized_roles | `whatsapp.delete_by_subject` (registered batch 160; previously orphaned) |
| actions_available | Phone preview, request delete (with reason + acknowledge), approve (second user, different from requester), view history, view selected job status |
| forms | Phone input (E.164 or local format), reason textarea (max 500 chars), acknowledge checkbox |
| filters_search | History pagination (page_size=20) |
| tables | n/a (history is card list) |
| detail_views | Job status panel inline |
| export_import | None |
| bulk_actions | None |
| edge_cases | `high_risk` → requires second approval (different user); `awaiting_second_approval` state shows Approve button; `soft_deleted` is reversible until `recovery_until` timestamp; `failed` shows `failed_reason` |
| current_pain_points | No filter on history by state; no search history by phone-hash; recovery window not user-configurable in UI (server-default 7d); approver re-enters phone but FE doesn't prevent self-approval (BE must enforce) |

---

## API Endpoints (current FE → mock contract)

Documented in detail in `docs/system-upgrade/04-capabilities/whatsapp-bridge-spec.md §3`. Summary:

| METHOD | Path (proxy-relative) | Purpose | Auth | Permission |
|---|---|---|---|---|
| GET | `/api/my/sessions` | List user's sessions | JWT | `whatsapp.access` |
| POST | `/api/my/sessions` | Start QR linking | JWT | `whatsapp.session.manage` |
| GET | `/api/my/sessions/:id/qr` | Poll QR + state | JWT | `whatsapp.session.manage` |
| POST | `/api/my/sessions/:id/relink` | Regenerate QR | JWT | `whatsapp.session.manage` |
| DELETE | `/api/my/sessions/:id` | Unlink | JWT | `whatsapp.session.manage` |
| GET | `/api/chats` | List owned chats | JWT | `whatsapp.access` |
| GET | `/api/shared-with-me` | List shared-in chats | JWT | `whatsapp.access` |
| GET | `/api/chats/:id/messages` | Paginate messages | JWT | `whatsapp.access` (owner or share) |
| GET | `/api/chats/:id/shares` | List active shares (owner) | JWT | `whatsapp.access` |
| POST | `/api/chats/:id/shares` | Create share | JWT | `whatsapp.share` |
| DELETE | `/api/shares/:id` | Revoke share | JWT | `whatsapp.share` (owner or recipient) |
| GET | `/api/users/typeahead` | Search same-org users | JWT | `whatsapp.share` |
| GET | `/api/search` | Full-text message search | JWT | `whatsapp.access` |
| POST | `/api/admin/dsr/preview` | DSR preview | JWT | `whatsapp.delete_by_subject` |
| POST | `/api/admin/dsr/delete` | DSR delete (queue) | JWT | `whatsapp.delete_by_subject` |
| POST | `/api/admin/dsr/approve` | DSR second-approval | JWT | `whatsapp.delete_by_subject` |
| GET | `/api/admin/dsr/:job_id` | DSR job status | JWT | `whatsapp.delete_by_subject` |
| GET | `/api/admin/dsr` | DSR history | JWT | `whatsapp.delete_by_subject` |
| POST | `/api/erase-my-data` | User erases own data | JWT | `whatsapp.access` |

Every mutation MUST emit a canonical audit action per spec §8 (10 actions across `whatsapp.session.*`, `whatsapp.share.*`, `whatsapp.dsr.*`, `whatsapp.self_erase.*`).

---

## Functional Capabilities

| capability_id | name | description | legacy_location | must_preserve | new_design_location | e2e_required | security_test_required | tenant_test_required | status |
|---|---|---|---|---|---|---|---|---|---|
| WA-001 | Session linking | QR-pair a WhatsApp account to the platform | n/a (greenfield) | yes | `/whatsapp/sessions` + bridge service | yes | yes (RBAC + 1-active-only) | yes | implemented (mock) |
| WA-002 | Session relink | Generate fresh QR for the same session | n/a | yes | `/whatsapp/sessions` | yes | yes | yes | implemented (mock) |
| WA-003 | Session unlink | Sever live link, retain archive | n/a | yes | `/whatsapp/sessions` | yes (confirm dialog) | yes | yes | implemented (mock) |
| WA-004 | Owner archive list | List owned chats with previews | n/a | yes | `/whatsapp` | yes | yes (tenant + RBAC) | yes | implemented (mock) |
| WA-005 | Shared-with-me list | List chats explicitly shared with current user | n/a | yes | `/whatsapp` (mixed list with badge) | yes | yes (cross-tenant block) | yes | implemented (mock) |
| WA-006 | Chat detail (messages) | Paginate messages newest-first | n/a | yes | `/whatsapp/chats/[id]` | yes | yes (404 ambiguity) | yes | implemented (mock) |
| WA-007 | Message search | Full-text search across readable messages | n/a | yes | `/whatsapp/search` | yes | yes (scope to readable) | yes | implemented (mock) |
| WA-008 | Share chat with same-org user | Owner shares one chat read-only | n/a | yes | ShareDialog component | yes | yes (`whatsapp.share` gate + same-org) | yes | implemented (mock + gated batch 160) |
| WA-009 | Revoke share | Owner OR recipient can revoke | n/a | yes | ShareDialog + share-in banner | yes | yes | yes | implemented (mock) |
| WA-010 | DSR preview (delete-by-phone) | Estimate scope before deletion | n/a | yes | `/whatsapp/admin/dsr` | yes | yes (RBAC + PII redact) | yes | implemented (mock) |
| WA-011 | DSR delete (queue) | Request deletion of all phone matches | n/a | yes | `/whatsapp/admin/dsr` | yes | yes (preview-token + acknowledge) | yes | implemented (mock) |
| WA-012 | DSR second approval | High-risk jobs need different approver | n/a | yes | `/whatsapp/admin/dsr` | yes | yes (self-approval forbid) | yes | implemented (mock) |
| WA-013 | DSR job history | Audit trail of past jobs | n/a | yes | `/whatsapp/admin/dsr` sidebar | yes | yes (RBAC) | yes | implemented (mock) |
| WA-014 | Self-erase (user) | User erases own WhatsApp data | n/a | yes | `/whatsapp/sessions` self-erase dialog | yes | yes (acknowledge) | yes | implemented (mock) |
| WA-015 | AI: link via assistant | Chat assistant proposes `whatsapp.session.link` | n/a | yes (level 3 AI) | AI demo slice | yes (batch 142) | yes | yes | implemented (mock) |
| WA-016 | AI: relink via assistant | Chat assistant proposes `whatsapp.session.relink` | n/a | yes (level 3 AI) | AI demo slice | yes | yes | yes | implemented (mock) |
| WA-017 | AI: unlink via assistant | Chat assistant proposes `whatsapp.session.unlink` (DESTRUCTIVE) | n/a | yes (level 3 AI) | AI demo slice | yes (batch 142) | yes | yes | implemented (mock) |
| WA-018 | Audit emissions | Every mutation writes category=ai/update/delete to PlatformAuditLog | n/a | yes | `lib/api/whatsapp.ts emitAudit/emitShareAudit/emitDsrAudit` | yes | yes | yes | implemented (mock) |
| WA-019 | Feature flag gate | All pages hidden when `whatsapp.enabled=false` | n/a | yes | `FeatureGate flag="whatsapp.enabled"` on every page | yes | yes | yes | implemented (mock) |

**Coverage status:** 19 capabilities, all implemented in MOCK_MODE. BE
implementation pending Phase 5A.WA1–WA12.

---

## Removal / Deprecation Log

| capability_id | disposition | reason | replacement | approval | issue_round | migration_path |
|---|---|---|---|---|---|---|

No removals to date — this is a greenfield module.

---

## Open Issues / Known Bugs

| # | Severity | Description | Action |
|---|---|---|---|
| RV-159-01 | 🔴 HIGH | `whatsapp.delete_by_subject` missing from `lib/api/roles.ts` | **FIXED** batch 160 |
| RV-159-02 | 🔴 HIGH | `whatsapp.share` permission not registered; ShareDialog ungated | **FIXED** batch 160 — permission registered + ShareDialog wrapped in PermissionGate |
| RV-159-03 | 🔴 HIGH | docs/modules/whatsapp/LEGACY_INVENTORY.md missing | **FIXED** batch 160 (this file) |
| RV-159-04 | 🔴 HIGH | docs/modules/whatsapp/E2E_COVERAGE.md missing | **FIXED** batch 160 (see file) |
| RV-159-05 | 🟠 MED | Mock phone hash is multiply-by-31 (non-cryptographic) | BE responsibility — spec §1 + §4.5 require SHA-256 + per-org pepper |
| RV-159-06 | 🟠 MED | Phone normalization in client; BE must re-normalize | BE responsibility — spec §3.4 |
| RV-159-07 | 🟠 MED | `localStorage` writes lack `if (!MOCK_MODE)` guard | **Parallel-agent task** — `lib/api/whatsapp.ts` (their working tree) |
| RV-159-08 | 🟠 MED | QR polling unbounded | **Parallel-agent task** — `app/(dashboard)/whatsapp/sessions/page.tsx` |
| RV-159-09 | 🟠 MED | `media_url_endpoint` open string | BE responsibility — spec §4.2 enforces relative path |
| RV-159-10 | 🟡 LOW | `eraseReason` optional in self-erase dialog | **Parallel-agent task** — `app/(dashboard)/whatsapp/sessions/page.tsx` |
| RV-159-11 | 🟡 LOW | DSR `recovery_window_days` hardcoded 7 | BE responsibility — Settings cap 16 |
| RV-159-12 | 🟡 LOW | DSR phone re-entry doesn't prevent self-approval client-side | BE enforces; FE message exists |
| RV-159-13 | 🟡 LOW | Display of `wa_chat_id` ("phone@c.us") when display_name null | **Parallel-agent task** — chat detail page |
| RV-159-14 | 🟡 LOW | QR dialog state changes not announced to screen readers | **Parallel-agent task** — sessions page |

---

## Security / Tenant Test Plan

Required when BE lands (Phase 5A.WA*). FE-side scaffold exists in
`tests/e2e/security/` (skipped pending 2 real test orgs).

| Test case | Why | Status |
|---|---|---|
| Cross-org chat read returns 404 (not 403) | Prevent existence leak | scaffolded, BE-blocked |
| Cross-org share recipient blocked | Same-org invariant | scaffolded, BE-blocked |
| `whatsapp.share` permission gates ShareDialog | UX-only gate (BE is authoritative) | **NEW** — needs render test |
| `whatsapp.delete_by_subject` gates DSR page | UX-only gate | needs render test |
| DSR `approve` from same user as requester rejected | self-approval invariant | BE-blocked |
| DSR `delete` without preview_token rejected | preview pairing | BE-blocked |
| Bridge webhook with invalid HMAC rejected | replay/forge prevention | BE-blocked |
| Media URL outside `/api/proxy/whatsapp/` rejected | XSS/redirect | BE-blocked |
| Rate-limit on QR endpoint (5/min/user) | abuse prevention | BE-blocked |
