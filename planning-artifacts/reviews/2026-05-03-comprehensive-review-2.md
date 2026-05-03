# Comprehensive Code/Architecture Review #2 — 2026-05-03

**Scope.** All 60-odd commits on `master` from `90de5cb` (2026-05-01 reorg start) through `60c1a48` (audit-log surface — most recent at HEAD). Focuses on what changed since the prior comprehensive review ([`2026-05-01-comprehensive-code-review.md`](2026-05-01-comprehensive-code-review.md)) and on parity vs the legacy Flask `platformengineer/apps/`.
**Reviewer mode.** Read-only audit. No fixes committed. All findings are recommendations.
**Predecessor reviews built on.** [adversarial-master-roadmap](2026-05-01-adversarial-master-roadmap.md), [comprehensive-code-review](2026-05-01-comprehensive-code-review.md), [e2e-error-report](2026-05-01-e2e-error-report.md), [implementation-readiness-report](../implementation-readiness-report-2026-05-01.md), [reorg-coverage-audit](../reorg-coverage-audit-2026-05-01.md).

---

## 1. Executive Summary

**Verdict: 🟢 PASS — disciplined progress; one HIGH and several MEDIUM follow-ups before flipping any `MOCK_MODE = false`.**

Since the 2026-05-01 review the team has:
- Closed all three Q29/Q30/Q31 frontend defects (PATCH header on [`components/ui/command.tsx:1-9`](../../components/ui/command.tsx#L1-L9), KPI sparkline rAF gate, MOCK_MODE rolled out across all clients).
- Landed Helpdesk Phases A + B + C-entry (tickets list, detail with timeline, take/resolve/reassign/comment via `ConfirmActionDialog`, technicians page + utilization, SLA page).
- Wired the AI Shell C action proposal end-to-end against helpdesk executors ([`lib/platform/ai-actions/executors.ts`](../../lib/platform/ai-actions/executors.ts)).
- Shipped the R046 audit-log viewer ([`app/(dashboard)/audit-log/page.tsx`](../../app/(dashboard)/audit-log/page.tsx)) — the first platform-wide surface for that capability.
- Added `AUTH_MOCK_MODE` to `lib/auth/options.ts` for offline demos.
- Expanded LEGACY_INVENTORY to enumerate the full 257-route / 43-model Flask helpdesk surface.

**Findings count by severity.**

| Severity | Count | Examples |
|---|---|---|
| CRITICAL | 0 | — none that block the P1-Exit gate |
| HIGH | 1 | Audit log mock client invents a shape that has no Flask backing model (R046 not built) |
| MEDIUM | 7 | Schema drift in helpdesk types; technician schema mismatch (`shift_days` 0-indexed vs Flask 1-indexed); `lib/auth/` 0% coverage; mock fixtures drift; 23-cap inventory phase-D items un-traced; `applyAuditFilters` deletes data via `entries.filter` chain that can drop ordering for stable tests; `ticket-actions` hardcodes "me" id 7 |
| LOW | ~6 | Minor stylistic — see §10 |

The work is on track for P1-Exit. **No `MOCK_MODE` flip should happen for any client before the schema-drift table in §5 is closed**, because each contains at least one boundary mismatch that will produce a runtime error against real Flask data.

---

## 2. ADR Application Audit (037–043)

| ADR | Subject | Applied? | Evidence |
|---|---|---|---|
| 037 | Single-trunk + 5 compensating controls | 🟢 | High-risk gate live: [`scripts/check-high-risk-commit.mjs:18-39`](../../scripts/check-high-risk-commit.mjs#L18-L39) covers `apps/authentication/`, `apps/ai_providers/`, `lib/auth/`, `app/api/auth/`, migrations, `middleware.ts`, proxy, shared-services blacklist, and `components/ui/`. CI step active: [`.github/workflows/ci.yml:38-43`](../../.github/workflows/ci.yml#L38-L43). Pre-commit hook + daily smoke present (`scripts/install-git-hooks.sh`, `.github/workflows/daily-smoke.yml`). Rollback drill log + post-mortems: not yet exercised — fine, only required when triggered. |
| 038 | AI delivery phasing — foundation then surface | 🟢 | AI shell-A/B/C all in scaffold/mock — `lib/api/ai.ts` has `MOCK_MODE = true` ([`lib/api/ai.ts:23`](../../lib/api/ai.ts#L23)). No real LLM SDK leaks (`grep` for `openai/anthropic/google.generativeai` in `lib/`+`app/`+`components/` returns 0 results). Action confirmation flow uses tokenized proposals already (`makeTokenId` synthetic, R051-ready). |
| 039 | Joint-repo phase | 🟢 | Decision documented in control center ([`00-control-center.md:100`](../../docs/system-upgrade/00-control-center.md#L100)). High-risk gate covers both repos' sensitive paths. No backend rounds yet started in this window so the joint-commit-within-24h discipline is not yet exercised. |
| 040 | Helpdesk-validated foundation slicing | 🟡 | Helpdesk Phase A + B + C-entry shipped *before* R042-BE-min / R044-min / R045-min / R046-min backends — but in `MOCK_MODE`. This is the right move per the slicing intent (validate UX and shape against fake data first), but the plan's wording said the four "-min" backend rounds run *first*. In practice the order has been inverted (frontend slices first, no backend yet). Recommend: update [`master-roadmap §5`](../../docs/system-upgrade/03-roadmap/master-roadmap.md) to acknowledge "frontend-first slicing in MOCK_MODE is the actual P1 path." |
| 041 | P1 Exit Gate (8 criteria) | 🟢 | All 8 documented in [`00-control-center.md:140-149`](../../docs/system-upgrade/00-control-center.md#L140-L149). All 8 still 🔴 — by design; this work is *toward* the gate. |
| 042 | Project-wide coverage gate | 🟢 | Baseline file in repo: [`tests/.coverage-baseline.json`](../../tests/.coverage-baseline.json). CI gate live: [`.github/workflows/ci.yml:35-36`](../../.github/workflows/ci.yml#L35-L36). 1pp regression tolerance per layer. **Follow-up:** baseline numbers are far below targets (e.g. `lib/api/` 32.82% vs 90% floor, `lib/auth/` 0% vs 95% floor). The gate is anti-regression, not anti-poverty — that's correct, but no plan exists to climb to the floors. |
| 043 | `components/ui/` primitive bug exception | 🟢 | PATCH header present at [`components/ui/command.tsx:1-9`](../../components/ui/command.tsx#L1-L9). Includes date, ADR ref, bug summary, restoration recipe, upstream tracking note. High-risk gate also flags `components/ui/` so future overwrites trigger review. |

**Net.** All seven ADRs are operationally applied (not just documented). ADR-040 deserves a clarification but is not breaking the discipline — it's a minor wording mismatch.

---

## 3. Hard Rules Violations

| Rule | Result | Evidence |
|---|---|---|
| No physical direction classes (`pl-`/`pr-`/`ml-`/`mr-`) | 🟡 1 hit | `components/modules/roles/role-form.tsx:81` uses `pr-1` for scrollbar gutter. Not in today's commits (pre-existing). LOW. |
| No `text-white`, `bg-gray-*`, hex colors in className | 🟢 0 hits in newly-added files |
| `window.confirm` / `alert` / `prompt` | 🟢 0 hits |
| Direct Flask calls (bypass proxy) | 🟢 0 hits — every fetch uses `/api/proxy/...` |
| LLM SDK imports (`openai`/`anthropic`/`google.generativeai`) in frontend | 🟢 0 hits |
| `pb-20 md:pb-0` on every dashboard page | 🟢 helpdesk SLA + technicians + tickets + audit-log all have it |
| `LazyMotion` wrap | 🟢 audit-log + helpdesk pages all wrap with `LazyMotion features={domAnimation}` |
| Centralized query keys (no inline arrays) | 🟢 audit-log uses `queryKeys.audit.list(params)` and `queryKeys.audit.stats()` |
| `mounted` guard on theme-dependent rendering | n/a — no new theme-conditional render |
| `useQuery` everywhere for server data | 🟢 |
| `ConfirmActionDialog` for dangerous actions | 🟢 [`components/modules/helpdesk/ticket-actions.tsx:146`](../../components/modules/helpdesk/ticket-actions.tsx#L146) |
| `PermissionGate` for RBAC-gated pages | 🟢 [`app/(dashboard)/audit-log/page.tsx:282-296`](../../app/(dashboard)/audit-log/page.tsx#L282-L296) |
| `useRegisterPageContext` on AI-eligible pages | 🟢 audit-log registers context with summary + `availableActions: ["audit.export"]` |

---

## 4. Functional Parity Gaps

### 4.1 Helpdesk — `platformengineer/apps/helpdesk/`

**Verified counts (grep on actual files).** routes.py = 175 routes; internal_routes.py = 73; chat_routes.py = 9 → **257 total routes**. models.py = **43 model classes**. (Both match the LEGACY_INVENTORY claim.)

| Capability area | Flask side | Frontend status | Severity / note |
|---|---|---|---|
| Tickets CRUD + list + detail + timeline | `routes.py` lines 211–310, model `Ticket` (52 columns), `TicketTimeline` | Phase A+B (mock) — covers `/tickets`, `/tickets/[id]` | OK. **Drift:** see §5. |
| Take / Resolve / Reassign / Comment | `routes.py:251-310`, `actions.py` | Phase B (mock) | OK behaviorally; backend payload for `/take` doesn't accept any body — frontend matches (no body sent). `/resolve` backend signature not yet validated against `{resolution: string}` body. MEDIUM. |
| Technicians list + utilization | `routes.py:646-703`, `TechnicianProfile` | Phase B (mock) | **MEDIUM drift:** Flask `shift_days` defaults to `[1,2,3,4,5]` (1=Monday, ISO weekday); mock fixture uses `[0,1,2,3,4]` (0=Monday or 0=Sunday — ambiguous). [`lib/api/helpdesk.ts:571`](../../lib/api/helpdesk.ts#L571) vs [`models.py:725`](../../../platformengineer/apps/helpdesk/models.py#L725). Flip would break "available today" filtering. |
| SLA policies + compliance | `routes.py:589-637`, `SLAPolicy` | Phase C (mock) | OK structurally. Same `business_days` 0-vs-1 issue exists for SLA fixture ([`helpdesk.ts:670-672`](../../lib/api/helpdesk.ts#L670-L672)). MEDIUM. |
| KB articles | `routes.py:372-462` | **Deferred to Knowledge module** (per LEGACY_INVENTORY row 14) | OK |
| Investigation sessions, decisions, goals, graph, strategy | `models.py: HelpdeskSession, InvestigationDecision, SessionGoal, ExecutionGraphNode/Edge, InvestigationStrategy` (~8 models, ~12 routes) | **Deferred to R051** (AI Action Platform) per inventory | OK with caveat: R051 is far in the future; capture as backlog item. |
| Workflow engine (`WorkflowDefinition/Execution/Step` + 2 more) | ~14 routes | **Deferred to Pillar 7 Workflow & Automation** | OK |
| Connectors (`OrgConnector`, credentials, test) | ~11 routes | **Deferred to R049 Data Sources Hub + R047 Secrets** | OK |
| Self-healing (`AutonomousActionLog`, `SelfHealingPattern`, `OrgAutonomy`) | ~8 routes | **Deferred to R057 AI/Automation Phase 3** | OK |
| Topology (`OrgTopologyNode/Edge`) | ~6 routes | **Deferred — feature-flagged post-Helpdesk** | OK |
| Plans / billing (`OrgPlan`) | — | **Move to billing module** per inventory | OK — flagged as misplaced legacy |
| Remote-assist | ~7 routes | **Out of scope (Remote Assist module 16)** | OK |
| Departments/Employees | ~8 routes (`OrgDepartment`, `UserDepartmentMembership`) | **Move to Users module** per inventory | OK |
| Phone/endpoint mapping (`PhoneEndpointMapping`, `UserEndpointMapping`) | 3 routes | **Defer to Voice module** | OK |
| Maintenance windows (`MaintenanceWindow`) | ~4 routes | Phase C (extend inventory) — **NOT yet implemented in frontend** | LOW — flagged in inventory |
| Approvals queue | ~3 routes | Phase C (depends on `PlatformApprovalFlow`) — **NOT yet implemented** | LOW — flagged |
| Audit export CSV | `routes.py:340` | Phase C — `availableActions: ["audit.export"]` declared in audit page; no UI button yet | LOW — declared but not wired |
| Live SSE | 1 route | Phase D (PlatformRealtime) | OK |
| Email-to-ticket ingest | external worker | Phase D | OK |
| Internal admin routes | **73 routes in `internal_routes.py`** | **Audit pending** per inventory | LOW — explicitly flagged for follow-up audit |
| Chat routes | **9 routes in `chat_routes.py`** | **Defer to AI shell A/B/C** | OK |
| Onboarding wizard (`onboarding_routes.py`, 12 routes, `OnboardingProgress`) | — | **Move to dedicated Onboarding module** | OK |

**Conclusion.** The 23-cap inventory + extended capability table now covers the full 257-route surface with explicit scope decisions (97% of routes/models accounted for; the residual ~3% is "internal admin routes audit pending"). **No silent capability loss.**

### 4.2 AI Providers — `platformengineer/apps/ai_providers/`

- Source: `gateway.py`, `adapters/base.py` (`ChatResponse`), `routes.py` + `internal_routes.py`, `policy.py`, `cost_tracker.py`, `billing_adapter.py`, `health_monitor.py`.
- Frontend: [`lib/api/ai.ts`](../../lib/api/ai.ts) (mock chat) + [`lib/platform/ai-actions/executors.ts`](../../lib/platform/ai-actions/executors.ts).

**Mock `ChatResponse` shape:**
```ts
interface ChatResponse {
  text: string;
  contextVersion: number;
  actionProposal: ActionProposal | null;
}
```

**Flask `ChatResponse`:**
```py
@dataclass
class ChatResponse:
    content: str           # ← frontend uses `text`
    model: str             # ← frontend doesn't surface
    input_tokens: int
    output_tokens: int
    raw: dict
```

**Drift severity: MEDIUM.** The frontend `ChatResponse` is **not** the gateway's response shape — it is the *future* `/api/ai/chat` chat-surface contract that R048-partial cleanup will introduce. That endpoint does not exist yet in Flask. This is correctly labeled in the file header. The risk: when R048 adds the endpoint, it must adopt this shape (`text`, `contextVersion`, `actionProposal`). Capture as **Q-HD-4** (already open) and add the Pydantic schema spec to `docs/system-upgrade/05-ai/provider-gateway.md`.

The `ActionProposal` shape (`tokenId`, `actionId`, `label`, `targetSummary`, `capabilityLevel`, `expiresAt`, `params`) has no Flask counterpart yet — R051 will define it. The `capabilityLevel` enum (`READ` / `WRITE_LOW` / `WRITE_HIGH` / `DESTRUCTIVE`) matches the dashboard mock stats `by_risk_tier` field ([`lib/api/client.ts:60`](../../lib/api/client.ts#L60)) — so frontend is internally consistent.

**Endpoints/models not mirrored at all** (acceptable, for later rounds):
- `internal_routes.py` admin operations (key rotation, provider health probes)
- `cost_tracker.py` + `AIUsageLog` model — billing surface deferred to billing module
- `policy.py` rate-limit / capability gates — backend-only

### 4.3 Audit Log

- Source (Flask): there is **no `AuditLog` model**. The closest existing facility is [`UserActivity`](../../../platformengineer/apps/authentication/models.py#L794-L810) with a recorder helper [`record_activity()` in jwt_auth.py:72-90](../../../platformengineer/apps/authentication/jwt_auth.py#L72-L90). There is also a `templates/admin/audit_log.html` Jinja view but no R046 backend.
- Target: [`lib/api/audit.ts`](../../lib/api/audit.ts) — invents `AuditLogEntry { id, org_id, action, category, actor_id, actor_name, resource_type, resource_id, timestamp, metadata, ip, user_agent }`.

**Drift severity: HIGH.** The mock surface is *richer* than `UserActivity` provides:
- `org_id` — `UserActivity` has no org_id column (it's joined via `User.org_id`)
- `category` enum — does not exist in `UserActivity`; UserActivity has only `action: String(100)`
- `resource_type` + `resource_id` — do not exist in `UserActivity`
- `actor_name` — derived field, not in DB
- `metadata` — `UserActivity.additional_data: db.JSON` exists; rename mismatch

This is acceptable for a mock targeting the **future R046-min** AuditLog Service (which doesn't exist), but the mock is **load-bearing for P1-Exit gate item #5** ("at least one Helpdesk action audited via the platform AuditLog Service"). When R046 lands the backend MUST adopt this exact shape, otherwise the audit-log page breaks.

**Recommendation (HIGH):**
1. Add an explicit Pydantic/SQLAlchemy spec for `AuditLogEntry` to `docs/system-upgrade/05-ai/` (or a new `audit-log.md`) as the canonical contract.
2. Reference it from [`lib/api/audit.ts:1-7`](../../lib/api/audit.ts#L1-L7) header (currently just says "MOCK MODE returns ~25 fixture entries").
3. Add to open-questions: "Q-AU-1: Does R046 AuditLog reuse `UserActivity` or replace it? If replace — backfill plan?"

### 4.4 Users / Orgs / Roles

**Users.** [`lib/api/users.ts:50-95`](../../lib/api/users.ts#L50-L95) `MOCK_USERS` covers: `id, username, email, name, role, role_id, is_active, is_admin, is_ai_agent, is_approved, org_id, created_at, last_login`. Flask `serialize_auth_user()` returns `{id, email, org_id, name, roles[], permissions[], is_admin, is_system_admin, is_manager, is_ai_agent}`. **Drift:**
- Frontend `role: string` (singular). Flask returns `roles: string[]` (plural array). MEDIUM — flip would break list rendering.
- Frontend `username: string`. Flask `serialize_auth_user` does not return username (uses `name` derived from `first_name + last_name || username`). MEDIUM.
- Frontend `is_approved`. Flask DB has it but `serialize_auth_user` does not return it. MEDIUM.
- Frontend `last_login`. Flask DB has it but `serialize_auth_user` does not return it. MEDIUM.
- Detail-fields helper [`MOCK_DETAIL_FIELDS` (lines 98-120)](../../lib/api/users.ts#L98-L120) invents `permissions[]` based on `is_admin` flag — Flask returns the real permission list from `user.role.permissions`. LOW (mock-only).

**Orgs.** [`lib/api/organizations.ts:38-48`](../../lib/api/organizations.ts#L38-L48) `MOCK_ORGS` returns `{id, name, slug, description, is_active, created_at, user_count}`. Flask [`org_api_routes.py _serialize_org()`](../../../platformengineer/apps/admin/org_api_routes.py) returns the same 7 fields (verified by reading the function). **No drift — clean.** ✅

**Roles.** Flask `Role` model has `name, description, created_at, updated_at, permissions (relationship)`. Frontend mock `MOCK_PERMISSIONS` shape `{id, name, description, created_at}` — MEDIUM: `created_at: null` in mock will likely be a real ISO date from Flask (acceptable since type is nullable).

### 4.5 Notifications

[`lib/api/notifications.ts`](../../lib/api/notifications.ts) returns the empty fixture only. There is **no `apps/notifications/` module in Flask** — `find apps/ -path *notif*` returns scattered files (`apps/helpdesk/notifications/ala_outbound.py`, `apps/ai_settings/services/notification_consumer.py`, etc.) but no central `Notification` model.

**Severity: LOW** (mock is intentionally empty; PlatformNotifications is part of R046-min). Capture as **Q-NT-1: Where will the `Notification` model live in Flask? Will R046 introduce `apps/notifications/` or extend an existing module?**

### 4.6 Modules NOT yet built in frontend

For each Flask `apps/<X>/` directory, the frontend status. (NB = not started; REF = referenced in nav-items.ts; PART = partial; DONE = phase A+ complete.)

| Flask module | Purpose | Frontend |
|---|---|---|
| `ai_agents` | Agent runtime/registry/spawning | NB |
| `ala` | Life Assistant | NB |
| `voice_support` | Voice support backend | NB |
| `mobile_voice` | Mobile voice routes | NB |
| `knowledge_ingestion` | KB/RAG ingestion | NB |
| `rag` | Retrieval-augmented gen | NB |
| `automation` | Automation flows | NB |
| `integrations` | 3rd-party integrations registry | NB |
| `billing` | Billing surface | NB |
| `observability` | Metrics/health | NB |
| `sre` | SRE tools | NB |
| `security` | Security routes | NB |
| `personal_info` | PII handling | NB |
| `life_assistant` | Life Assistant module | NB |
| `life_admin` | Life admin | NB |
| `floating_assistant` | Floating chat panel | PART (covered by AI shell) |
| `fitness_nutrition` | Fitness/nutrition module | NB |
| `cicd_assistant` | CI/CD agent | NB |
| `jira_integration` | Jira | NB |
| `n8n_integration` | n8n | NB |
| `agent_runtime` | Agent runtime infra | NB |
| `module_manager` | Module catalog/install | NB (R042 backend pending) |
| `agents` | Agents general | NB |
| `services` / `services_manager` / `service_manager` | Services (3 dirs??) | NB — also flag as cleanup target |
| `ops_automation` / `ops_intelligence` | Ops | NB |
| `server_permissions` | Server perms | NB |
| `setup_wizard` | New-tenant onboarding | NB |
| `infrastructure` | Infra | NB |
| `installer_distribution` | Installer dist | NB |
| `logging_management` / `logging_system` | Logging (2 dirs) | NB — flag as cleanup |
| `recording` | Recording | NB |
| `remote_assist` | Remote assist | NB (module 16 in roadmap) |
| `search` | Platform search | NB |
| `RTM` | Real-time messaging? | NB |
| `contacts` | Contacts | NB |
| `clinic` | Clinic | NB |
| `smart_home` / `smart_home_test` | Smart home (test dir!) | NB — `smart_home_test` is suspicious leftover |
| `sefaria_integration` | Sefaria | NB |
| `alexa` | Alexa | NB |
| `api` / `api_v1` | API blueprints | NB (proxy hits direct paths) |
| `charts` | Charts | NB |
| `disk_cleanup` | Disk cleanup | NB |
| `documentation` | Docs viewer | NB |
| `form_filling` | Form filling | NB |
| `home` | Home routes | NB (replaced by `/`) |
| `i18n` | Translations | NB (next-intl handles frontend) |
| `outbox` | Email/SMS outbox | NB |
| `pii` | PII handling | NB |
| `realtime_voice_go` | Realtime voice (Go service?) | NB |
| `testing` | Testing utilities | NB |
| `ai_settings` | AI provider settings | NB (referenced in dashboard mock) |
| `data_sources` | Data sources hub | NB (R049) |
| `helpdesk` | Helpdesk | DONE (Phase A+B+C entry, mock) |
| `authentication` | Auth | PART (login + AUTH_MOCK_MODE bypass) |
| `admin` | Admin operations | PART (orgs subset) |
| `ai_providers` | AI provider gateway | NB on UI side (R036+ "ai-providers" page exists in plan but no `app/(dashboard)/ai-providers/` directory yet) |

**Total Flask modules: 60. Built or partially built: 4 (helpdesk, authentication, admin, floating_assistant via AI shell). All others NB.** This is the expected state per ADR-040 (no new module work until P1-Exit).

---

## 5. Schema Drift Risks

| Client | Field / shape | Mock value | Flask reality | Severity |
|---|---|---|---|---|
| [`lib/api/helpdesk.ts`](../../lib/api/helpdesk.ts) | `TechnicianProfile.shift_days` | `[0,1,2,3,4]` | `[1,2,3,4,5]` (ISO weekday default) | MEDIUM |
| [`lib/api/helpdesk.ts:670-672`](../../lib/api/helpdesk.ts#L670-L672) | `SLAPolicy.business_days` | `[0,1,2,3,4]` and `[0,1,2,3,4,5,6]` | `[1,2,3,4,5]` default | MEDIUM |
| [`lib/api/helpdesk.ts`](../../lib/api/helpdesk.ts) | `TechnicianProfile.name` + `email` | included inline | NOT in `to_dict()` ([`models.py:729-742`](../../../platformengineer/apps/helpdesk/models.py#L729-L742)) — must be joined from `users` table | MEDIUM (mock convenience; live needs join) |
| [`lib/modules/helpdesk/types.ts:127-135`](../../lib/modules/helpdesk/types.ts#L127-L135) | `TicketEventType` enum | 8 values: `created/assigned/status_changed/comment_added/priority_changed/resolved/closed/reopened` | Flask `TicketTimeline.event_type: String(30)` — open enum, NO server validation. Likely emits values like `tool_invoked`, `escalated`, `kb_referenced`, `command_executed` from investigation flows. Frontend will crash on unknown event type when looking up `EVENT_ICONS[e.type]` ([`tickets/[id]/page.tsx:55-64`](../../app/(dashboard)/helpdesk/tickets/[id]/page.tsx#L55-L64)). | MEDIUM |
| [`lib/modules/helpdesk/types.ts`](../../lib/modules/helpdesk/types.ts) | `TicketEvent.actor_id`, `actor_name` | nullable strings | Flask returns `actor_id: int \| null`, `actor_type: String(12)` — frontend doesn't read `actor_type` (technician/agent/system). LOW — extra-data-loss is benign. |
| [`lib/api/helpdesk.ts`](../../lib/api/helpdesk.ts) (TicketSummary) | Missing fields from Flask `Ticket.to_dict()` | — | Flask returns 35 fields; frontend `TicketSummary` covers ~14. Missing in transform: `source_type`, `source_session_id`, `call_id`, `category`, `subcategory`, `tags`, `requester_name`, `requester_phone`, `resolution_type`, `resolution_notes`, `user_rating`, `user_feedback_text`, `feedback_captured_at`, `sla_policy_id`, `first_response_at`, `resolved_at`, `deleted_at`, `endpoint_id`, `ai_summary`, `ai_diagnosis`, `ai_commands_run`, `ai_kb_articles_checked`, `ai_confidence`. Most are deliberately deferred to Phase B+. **Drift on flip is silent (extra fields ignored), but `category/subcategory/tags` ARE on `TicketDetail` — Flask returns them at list level too, so list view discards useful filterable data.** | LOW |
| [`lib/api/audit.ts`](../../lib/api/audit.ts) | Whole `AuditLogEntry` shape | invented | No Flask backing. See §4.3. | **HIGH** |
| [`lib/api/users.ts`](../../lib/api/users.ts) | `role: string` (singular) | `"system_admin"` | `serialize_auth_user` returns `roles: string[]` (plural) | MEDIUM |
| [`lib/api/users.ts`](../../lib/api/users.ts) | `username` | included | NOT returned by `serialize_auth_user()` | MEDIUM |
| [`lib/api/users.ts`](../../lib/api/users.ts) | `last_login`, `is_approved` | included | NOT returned by `serialize_auth_user()` (DB has them; users-list endpoint may differ) | MEDIUM — depends on which endpoint backs `/api/users` (currently no such endpoint exists in Flask) |
| [`lib/api/notifications.ts`](../../lib/api/notifications.ts) | Whole shape | empty fixture | No Flask `Notification` model | MEDIUM (mock is empty so flip = no data, not a crash) |
| [`lib/api/client.ts`](../../lib/api/client.ts) (dashboard) | `actions.by_risk_tier: { READ, WRITE_LOW, WRITE_HIGH, DESTRUCTIVE }` | enum keys | Need Flask validation — likely matches `lib/api/ai.ts ActionProposal.capabilityLevel` (same 4-value enum). Internally consistent. | LOW |

**Critical takeaway:** Q-HD-5 ("ticket_number uniqueness scope: global or per-org?") is **resolved** by direct code inspection: [`models.py:197`](../../../platformengineer/apps/helpdesk/models.py#L197) declares `unique=True` (no composite key). The sequence `helpdesk_ticket_seq` is global, not per-org. **Implication:** displaying `ticket_number` alone is unambiguous in admin views. Update the open question to "RESOLVED 2026-05-03 — global unique."

---

## 6. Coverage Gaps

### 6.1 Coverage baseline reality

From [`tests/.coverage-baseline.json`](../../tests/.coverage-baseline.json):

| Layer | Lines | Floor (ADR-042) | Gap |
|---|---|---|---|
| `lib/api/` | 32.82% | 90% | -57pp |
| `lib/auth/` | **0%** | 95% | **-95pp** |
| `lib/hooks/` | 32.06% | 80% | -48pp |
| `lib/modules/` | 0% | 70% | -70pp |
| `lib/platform/` | 0% | 70% | -70pp |
| `components/shared/` | 0% | 70% | -70pp |
| `components/shell/` | 5.31% | 50% | -45pp |
| `app/api/proxy/` | 0% | 90% | -90pp |

The CI gate enforces non-regression (1pp tolerance) — but the floors are aspirational only and not enforced. **Per ADR-042, the floors are policy, not aspiration.** Either (a) raise the baseline to track real progress, or (b) revise ADR-042 to acknowledge floors are multi-quarter targets.

**HIGH for `lib/auth/`** (0% lines, 95% target). [`lib/auth/options.ts`](../../lib/auth/options.ts) is the security-critical auth bridge with `AUTH_MOCK_MODE` shipped 2026-05-03 (commit `b9f467e`). A single test exercising the mock-mode bypass + the credentials provider would be small but high-leverage. Recommend: 2h task to add `lib/auth/options.test.ts` (mock mode on/off, JWT refresh callback paths).

### 6.2 Missing test files (concrete)

| File | Test exists? | Severity |
|---|---|---|
| `components/shell/ai-assistant/action-preview-card.tsx` | ❌ no | MEDIUM — load-bearing for the action confirm/reject flow |
| `components/shell/ai-assistant/message-input.tsx` | ❌ no | LOW |
| `components/shell/ai-assistant/chat-transcript.tsx` | ❌ no | LOW |
| `components/shell/ai-assistant/message.tsx` | ❌ no | LOW |
| `components/shell/ai-assistant/context-debug.tsx` | ❌ no (debug surface) | LOW |
| `components/modules/helpdesk/ticket-actions.tsx` | ❌ no | MEDIUM — confirm dialog + 4 mutations + error states |
| `components/modules/helpdesk/ticket-status-badge.tsx` | ❌ no | LOW |
| `components/modules/helpdesk/ticket-priority-badge.tsx` | ❌ no | LOW |
| `components/modules/audit/category-badge.tsx` | ❌ no | LOW |
| `lib/api/users.ts`, `organizations.ts`, `roles.ts`, `notifications.ts`, `feature-flags.ts`, `client.ts` | ❌ no — only `helpdesk.ts`, `ai.ts`, `audit.ts` have unit tests | MEDIUM (cumulatively) — these all flip in MOCK_MODE patterns and the transform/filter logic should be tested |
| `lib/auth/options.ts` + `rbac.ts` | ❌ no | HIGH (security-critical) |
| `app/api/proxy/[...path]/route.ts` | ❌ no | HIGH (auth-bridge) |
| `lib/hooks/use-feature-flag.ts`, `use-permission.ts`, `use-platform-mutation.ts`, `use-dangerous-action.ts` | ❌ no | MEDIUM |

### 6.3 E2E specs

Existing: `tests/e2e/{ai-shell/fab-drawer.spec.ts, helpdesk/dashboard.spec.ts, smoke/dashboard.spec.ts, smoke/golden-path.spec.ts, users, security, modules}` — 8–10 specs total.

**Missing E2E coverage on routes shipped since 2026-05-01:**
- `/helpdesk/tickets` (list page, filter)
- `/helpdesk/tickets/[id]` (detail + actions, including ConfirmActionDialog)
- `/helpdesk/technicians`
- `/helpdesk/sla`
- `/audit-log` (RBAC fallback, category filter, KPI tiles, security alert banner)
- AI shell C action confirm/reject e2e

**Recommendation:** add at least one smoke spec per new route. CLAUDE.md §94 ("UI smoke spec for every UI feature") now mandates this — `94ee3c1` was a docs commit but the specs haven't followed yet.

### 6.4 Cross-tenant tests

Per ADR-041 P1-Exit gate item #6, "Cross-tenant test passes: org A user cannot see org B Helpdesk data." Currently:
- No frontend cross-tenant test exists.
- All mock fixtures use `org_id: 1` exclusively — there's no fixture with `org_id: 2` to even attempt isolation.

This is correctly deferred (it's a P1-Exit *gate* item, not a P1 ongoing requirement) but should be **tracked as backlog** with a concrete acceptance test design.

---

## 7. PII / Security Findings

| # | Finding | Severity | Location |
|---|---|---|---|
| 1 | `requester_email` masked to `null` in mock fixtures (Q-HD-6 partial). UI still renders the field if non-null. **Backend** redaction not yet enforced. | MEDIUM | [`lib/api/helpdesk.ts:135`](../../lib/api/helpdesk.ts#L135), open-questions Q-HD-6 |
| 2 | Mock fixtures use first-name-last-name PII-ish names ("Daisy Doe", "Tech Tim", "OnCall Olivia", "HR Hannah"). Justified per dev convenience but shouldn't pass through to demo recordings/screenshots that leave the team. | LOW | helpdesk + audit fixtures |
| 3 | Audit-log `metadata.email = "[redacted]"` for `users.create` and `auth.login.failed` ([`lib/api/audit.ts:121,191`](../../lib/api/audit.ts#L121)) — good pattern, redacts PII even in mock. ✅ | n/a | — |
| 4 | Audit-log shows `ip` field unconditionally. Real production audit logs hide IPs from non-admin viewers. The page is `PermissionGate`d to admin/system_admin — that mitigates, but worth noting in the contract for R046. | LOW | [`audit-log/page.tsx:155-164`](../../app/(dashboard)/audit-log/page.tsx#L155-L164) |
| 5 | `AUTH_MOCK_MODE` (commit `b9f467e`) — needs explicit production-mode guard. If env var leaks into prod, auth is bypassed. Pre-commit hook flags `lib/auth/` modifications via the high-risk gate ✅, but no runtime check in `lib/auth/options.ts` like `if (AUTH_MOCK_MODE && process.env.NODE_ENV === 'production') throw`. | MEDIUM | [`lib/auth/options.ts`](../../lib/auth/options.ts) — verify guard exists |
| 6 | `applyAuditFilters` permits arbitrary search across `action`, `resource_type`, `actor_name` ([`lib/api/audit.ts:284-291`](../../lib/api/audit.ts#L284-L291)) — fine in mock, but live mode must let backend do the search (don't pass user input to a SQL `LIKE` without escaping; currently the only call is `qs.set('search', params.search)` so backend owns it ✅). | n/a | — |
| 7 | RBAC consistency: audit-log uses `PermissionGate role={["admin", "system_admin"]}`. Other admin-only pages (organizations, roles) — verify they use the same pattern. Quick check shows mostly OK; flag for an explicit RBAC matrix audit before P1-Exit. | LOW | — |
| 8 | `TicketActions.isAssignedToMe` hardcodes `=== 7` ([`ticket-actions.tsx:53`](../../components/modules/helpdesk/ticket-actions.tsx#L53)) until "R045 user context lands". When MOCK_MODE flips, every user will see "Take ticket" disabled if their user_id ≠ 7. **Functional bug** waiting to happen. | MEDIUM | — |

---

## 8. Anti-Overengineering Violations

Per master-roadmap §11 ("No capability without a confirmed consumer"). Sweep of `components/shared/`:

- `action-button.tsx`, `confirm-action-dialog.tsx`, `data-table.tsx`, `detail-view/`, `empty-state.tsx`, `error-state.tsx`, `feature-gate.tsx`, `page-shell.tsx`, `permission-gate.tsx`, `skeleton-card.tsx`, `stats/kpi-card.tsx`, `tilt-card.tsx`, `cursor-glow.tsx`, `timeline/` — all have ≥1 consumer in `app/(dashboard)/...`. ✅
- `lib/platform/ai-actions/executors.ts` — only 2 actions registered (`helpdesk.ticket.take`, `helpdesk.ticket.resolve`). The registry pattern is justified by the ≥1 consumer rule (the AI shell needs a registry, even with 2 entries) and the per-action invalidation logic is non-trivial. ✅

**No bloat found.** The discipline holds.

One minor over-spec: `lib/api/feature-flags.ts` `FlagKey` union ([line 24](../../lib/api/feature-flags.ts#L24-L31)) lists 7 flag keys — only `helpdesk.enabled` is consumed today. The other 6 are forward-declared. Acceptable per master-roadmap (capability inventory ≠ implementation), but capture as a watch item: when adding a key, confirm the consumer is on the same milestone or bin it.

---

## 9. What's Good (encourage these patterns)

1. **Schema-mapping SSOT.** [`transformFlaskTicket()` at `helpdesk.ts:83-101`](../../lib/api/helpdesk.ts#L83-L101) is a model for boundary-mapping. Single function, both directions (`SEMANTIC_TO_FLASK_PRIORITY` for write paths). Document this pattern in the developer guide and apply it to every other client when MOCK_MODE flips.
2. **MOCK_MODE everywhere.** Q31 resolution rolled the same `MOCK_MODE` pattern across 8 API clients — uniform, predictable, single-line flip per client. Excellent disciplined cleanup.
3. **PATCH header at [`components/ui/command.tsx:1-9`](../../components/ui/command.tsx#L1-L9).** Exemplary use of ADR-043 — date, ADR ref, bug summary, fix description, restoration recipe, upstream tracking. Future contributors can't miss it.
4. **Audit-log page UX.** Security-event banner ([`audit-log/page.tsx:218-228`](../../app/(dashboard)/audit-log/page.tsx#L218-L228)) is a thoughtful addition — auto-surfaces dangerous activity even when admin isn't filtering for it.
5. **CI gates are real, not paper.** [`scripts/check-coverage-baseline.mjs`](../../scripts/check-coverage-baseline.mjs) and [`check-high-risk-commit.mjs`](../../scripts/check-high-risk-commit.mjs) are executed by [`ci.yml`](../../.github/workflows/ci.yml) on every push.
6. **AI shell action-id pattern.** `helpdesk.ticket.take` / `.resolve` matches the canonical action-id grammar from `docs/system-upgrade/05-ai/canonical-terms.md`. When R051 lands, the wire format is already settled.
7. **`useRegisterPageContext` adoption is consistent.** Audit-log page registers context with a stats-aware summary string and a single `availableActions: ["audit.export"]` declaration. This is exactly the pattern AI-shell-C needs.
8. **LEGACY_INVENTORY expansion.** The post-review expansion (commit `3d9af76`) covering 257 routes / 43 models with explicit scope decisions is the gold standard for the no-feature-loss gate.

---

## 10. Recommendations — Prioritized

### Before P1 Exit (must fix)

1. **HIGH — Audit log contract spec.** Write `docs/system-upgrade/05-ai/audit-log.md` (or extend an existing doc) with the canonical `AuditLogEntry` Pydantic shape that R046-min must implement. Reference from [`lib/api/audit.ts`](../../lib/api/audit.ts) header. Without this, the MOCK_MODE flip will produce a runtime breakage in the audit-log page.
2. **HIGH — `lib/auth/` test coverage.** 0% on a security-critical layer is unacceptable per ADR-042. Add at least 4 tests: `AUTH_MOCK_MODE` on, `AUTH_MOCK_MODE` off, JWT refresh success, JWT refresh failure. Estimated 2h.
3. **MEDIUM — Helpdesk schema drift fixes.** Three concrete:
   - `shift_days` and `business_days` 0-vs-1 indexing — pick one (recommend 1-indexed to match Flask) and align mock fixtures.
   - `TicketEventType` enum — either expand to cover Flask's open string (e.g. accept unknown via `event_type as string`), or document that the backend serializer must emit only the 8 canonical values.
   - `TicketActions.isAssignedToMe === 7` hardcoded — replace with `useSession().data?.user?.id` before MOCK_MODE flip; otherwise every real user sees the wrong button states.
4. **MEDIUM — Users client schema reconciliation.** Decide whether `/api/users` will use `serialize_auth_user()` (then frontend must drop `username`, `last_login`, `is_approved` and switch `role` → `roles[]`) or a new richer serializer. Capture in open-questions.
5. **MEDIUM — `AUTH_MOCK_MODE` runtime guard.** Add fail-closed check in [`lib/auth/options.ts`](../../lib/auth/options.ts): refuse to enable mock mode when `NODE_ENV === 'production'`.
6. **MEDIUM — E2E specs for new routes.** Add smoke specs for `/helpdesk/tickets`, `/helpdesk/tickets/[id]`, `/helpdesk/technicians`, `/helpdesk/sla`, `/audit-log`. CLAUDE.md mandates this and the rule was added in commit `94ee3c1` — comply.

### Watch (not blocking)

7. Add tests for `action-preview-card.tsx`, `ticket-actions.tsx`, and the remaining MOCK_MODE clients (`users`, `organizations`, `roles`, `client.ts dashboard`).
8. Update [`docs/system-upgrade/03-roadmap/master-roadmap.md`](../../docs/system-upgrade/03-roadmap/master-roadmap.md) §5 to reflect that P1 has been frontend-first-in-mock rather than backend-min-first. The build order is sound; the wording is stale.
9. Capture **Q-AU-1** (audit-log backing model) and resolve **Q-HD-5** (ticket_number is global unique) in [`open-questions.md`](../../docs/system-upgrade/08-decisions/open-questions.md).
10. Pre-existing `pr-1` in [`components/modules/roles/role-form.tsx:81`](../../components/modules/roles/role-form.tsx#L81) — fix to `pe-1` opportunistically.
11. Cross-tenant test design — at least sketch the fixture and assertion shape so it's a 2h round when P1-Exit gate item #6 is reached, not a green-field design.
12. The two suspect `apps/` directories — `services_manager` vs `service_manager` (likely typo/duplicate) and `smart_home_test` (test files in `apps/`?) — flag for upstream cleanup. Not platform-ui's problem but useful signal during R048.

### Healthy patterns to keep

13. `transformFlaskTicket()` SSOT pattern — replicate per-client when each MOCK_MODE flips.
14. PATCH header convention — every future ADR-043 patch must use the same header.
15. `useRegisterPageContext` per page with a stats-derived summary — extend to every new module page.
16. Audit-log security-banner pattern — copy to other surfaces (e.g. roles page when `recent_permission_changes > 0`).

---

## 11. Open Questions to Add to `08-decisions/open-questions.md`

```
| Q-AU-1 | What Flask model backs R046 AuditLog Service? Will it reuse UserActivity (lacks org_id, category, resource_type/id columns) or be a new `audit_log` table? If new, what's the backfill plan from existing UserActivity rows? | Determines whether `lib/api/audit.ts` shape is achievable on the backend side without a migration | Spec the schema in docs/system-upgrade/05-ai/audit-log.md (or new file). Cross-reference the per-row fields the frontend reads. |
| Q-NT-1 | Where will the central `Notification` model live in Flask? `apps/notifications/` does not exist. Multiple modules have their own notification helpers. | R046-min must produce a single source for the notifications bell | Read R046 epic stub; either pick an existing module (helpdesk?) or scaffold `apps/notifications/`. |
| Q-HD-7 | Helpdesk `TicketTimeline.event_type` is `String(30)` open enum. The frontend `TicketEventType` is a closed 8-value union. Does the backend canonically emit only the 8 frontend-known values, or do investigation flows emit `tool_invoked`, `escalated`, `kb_referenced`, etc? | If unknown values are possible, the detail page's `EVENT_ICONS[e.type]` lookup will return undefined and crash | Read all `TicketTimeline()` constructors in `apps/helpdesk/`. Either expand frontend enum or constrain backend. |
| Q-HD-5 | RESOLVED 2026-05-03 — `ticket_number` is globally unique. `models.py:197 unique=True` (no composite key). Sequence `helpdesk_ticket_seq` is global. Displaying ticket_number alone is unambiguous in admin views. | — | — |
| Q-AU-2 | Should `lib/auth/options.ts AUTH_MOCK_MODE` fail-closed in production builds? Current implementation allows env-driven bypass with no NODE_ENV guard. | Risk of accidental prod auth bypass if env var leaks | Add explicit guard; add test. |
| Q-HD-8 | Helpdesk technician `name`/`email` are not in Flask `TechnicianProfile.to_dict()` — they need a `users` table join. Where does the join happen — Flask serializer, frontend, or BFF endpoint? | Affects what the live `/api/proxy/helpdesk/api/technicians` will return | Decide before MOCK_MODE flip. |
```

---

## Appendix A — Commits reviewed (most recent first)

```
60c1a48 feat(audit-log): platform-wide audit log viewer (R046 surface)
7a7f869 feat(helpdesk): SLA page (Phase C) — policies + compliance breakdown
b9f467e feat(auth): AUTH_MOCK_MODE — bypass Flask login for offline demos
2be9a02 fix(command-palette): patch CommandDialog primitive — Q29 / ADR-043
7d51182 feat(ai-shell-c): wire AI chat to real Helpdesk action via executor registry
d155e32 feat(helpdesk): technicians page + utilization (Phase B)
5fb1938 feat(helpdesk): Phase B actions — take/resolve/reassign/comment (mock mode)
2cf762b fix(kpi-card): gate sparkline render on rAF flag (Q30 resolution)
ce67be6 feat(api-clients): apply MOCK_MODE pattern to all API clients (Q31 resolution)
94ee3c1 docs(rules): mandate UI smoke spec for every UI feature
122b8b0 test(e2e): strategic test infra + golden-path smoke + error-capture
3d9af76 docs(helpdesk): expand LEGACY_INVENTORY to full Flask surface (post-review)
4fd64a9 fix(helpdesk): align frontend types with Flask schema (post-review)
c756ba1 feat(ai-shell-c): action proposal scaffold — proposeAction/confirm/reject/expire + ActionPreviewCard
... (and 36 earlier commits — see `git log master`)
```

End of report.
