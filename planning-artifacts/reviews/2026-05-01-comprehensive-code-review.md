# Comprehensive Code Review — 2026-05-01

**Scope:** 32 commits on `master` from `90de5cb` to `c756ba1`. Three streams: planning/governance reorg + ADRs 037–042, AI Shell A/B/C scaffold (mock), Helpdesk Phase A + B-start (mock).
**Reviewer mode:** read-only audit; no fixes committed (no Hard Rules violations found that meet the auto-fix bar).

---

## 1. Verdict — 🟢 PASS (with watch-items)

The day's work is **disciplined, well-scoped, and Hard-Rules-compliant**. Every page has `pb-20 md:pb-0`, every API call uses centralized query keys, every Helpdesk page is feature-gated, no LLM SDK leaks, no `window.confirm`, no physical direction classes. Both feature streams (AI Shell, Helpdesk) are explicitly mock-flagged with documented backend wiring paths. Compensating controls (ADR-037 high-risk gate, ADR-042 coverage baseline) are real, executable scripts — not paper. The two material concerns are **functional-parity drift risk** (the helpdesk types mirror a much smaller surface than legacy provides — see §4) and **schema drift risk** in mock fixtures vs Flask serializers (§6). Neither blocks P1 — both want explicit follow-up entries.

---

## 2. Critical issues — none

No critical issues found. P1 Exit Gate items 1–8 are all still 🔴 by design (this work is *toward* the gate, not crossing it).

---

## 3. Hard Rules violations

None found.

| Check | Result |
|---|---|
| Physical direction classes (`pl-`/`pr-`/`ml-`/`mr-`/`left-`/`right-` + digit) in today's files | 0 hits |
| `text-white`, `bg-gray-*`, hex colors in className | 0 hits |
| `window.confirm` / `alert` / `prompt` | 0 hits |
| `fetch("http…)` direct calls (bypassing proxy) | 0 hits |
| `import openai|anthropic|@anthropic-ai|google.generativeai` in frontend | 0 hits |
| `pb-20 md:pb-0` on every dashboard page | 3/3 helpdesk pages OK |
| `LazyMotion` wrap on pages using Framer Motion | All 3 helpdesk pages + AI components use `m.*` from `framer-motion` correctly |
| `useQuery` keys from `lib/api/query-keys.ts` (no inline arrays) | All new queries use `queryKeys.helpdesk.*` |
| `mounted` guard on theme-dependent rendering | N/A — no theme-conditional render added today |

Minor stylistic notes (NOT violations):
- [`message-input.tsx:85`](../../components/shell/ai-assistant/message-input.tsx#L85) uses native `<select>` instead of shadcn `Select` in the tickets list filter ([`tickets/page.tsx:155`](../../app/(dashboard)/helpdesk/tickets/page.tsx#L155)). Acceptable for Phase A scaffold; flag for design-system polish later.
- AI assistant strings are English-only (e.g. "Open AI assistant", "Ask the assistant…"). Per task scope this is correctly **out of scope**; flag for i18n follow-up.

---

## 4. Functional parity gaps

### 4.1 Helpdesk — `platformengineer/apps/helpdesk/`

Legacy reality (from [`models.py`](../../../platformengineer/apps/helpdesk/models.py) + [`routes.py`](../../../platformengineer/apps/helpdesk/routes.py)) is dramatically larger than what the inventory captures. **The 23-cap inventory is a faithful PHASE PLAN, not a complete capability list** — the legacy app holds 39 SQLAlchemy models and 100+ blueprint routes covering investigations, runbooks, workflows, approvals, RA/voice, topology, autonomy, SLA, KB, queue routing, maintenance windows, batch tasks, connectors, decisions, plans/billing, etc.

| Legacy capability | Mirrored? | Phase | Gap / risk |
|---|---|---|---|
| 23 inventory items | ✓ phase-mapped | A–D | OK — well-organized |
| Investigation sessions (`HelpdeskSession`, `InvestigationDecision`, `SessionGoal`, `ExecutionGraphNode/Edge`, `InvestigationStrategy`) | ❌ | not in inventory | High — these are the AI-investigation core; AI-shell-C/D will need them |
| Workflow engine (`WorkflowDefinition`/`Execution`/`Step`, Epic 10) | ❌ | not in inventory | Medium — critical for autonomous runbooks |
| Org connectors / SSH credentials (`OrgConnector`) | ❌ | not in inventory | High — required before remote-action features |
| Self-healing patterns + AutonomousActionLog (Phase 19) | ❌ | not in inventory | Medium — autonomy roadmap dependency |
| Topology graph (`OrgTopologyNode/Edge`, Phase 15) | ❌ | not in inventory | Low — feature-flagged module |
| Plans / billing / autonomy (`OrgPlan`, `OrgAutonomy`, Phase 16) | ❌ | not in inventory | Medium — overlaps with org settings |
| Remote-assist endpoints (`/api/remote-assist/*`) | ❌ | not in inventory | Low — separate feature |
| Department/employee CRUD (`/api/departments/*`, `/api/employees`) | ❌ | not in inventory | Likely belongs to Users module |
| Phone/user endpoint mappings | ❌ | not in inventory | Low — voice-routing feature |
| Knowledge base CRUD (`/api/kb/articles`) | ✓ Phase D (deferred to Knowledge module) | D | OK — explicit deferral |
| Maintenance windows (`/api/maintenance/*`) | ❌ | not in inventory | Medium |
| Circuit breakers + degraded mode (Sprint B) | ❌ | not in inventory | Medium — platform-cross-cutting |
| Batch tasks (`/api/batch-tasks/*`) | ❌ | not in inventory | Medium |

**Action:** add an open-question to expand `LEGACY_INVENTORY.md` to include **all** legacy capabilities even if explicitly out-of-scope, so the “No Feature Loss” gate has a complete checklist.

**Type-shape mismatches** — [`lib/modules/helpdesk/types.ts`](../../lib/modules/helpdesk/types.ts) vs Flask `Ticket.to_dict()` ([`models.py:274`](../../../platformengineer/apps/helpdesk/models.py#L274)):

| Frontend field | Flask field | Status |
|---|---|---|
| `title` | `subject` | ⚠ Renamed — must be mapped at proxy or Flask serializer; otherwise breaks live mode |
| `priority: "low"\|"medium"\|"high"\|"critical"` | `priority: "P1"–"P4"` (`String(4)`) | 🔴 **Drift** — legacy stores P1-P4 strings; frontend uses semantic words. Mapping layer required. |
| `status: "new"\|"in_progress"\|"resolved"\|"closed"` | matches | OK |
| `assignee_id` | `assigned_to` | ⚠ Renamed |
| `requester_id` | `requester_user_id` | ⚠ Renamed |
| `sla_breach_at`, `sla_breached` (single boolean) | `response_due_at`, `resolution_due_at`, `sla_response_breached`, `sla_resolution_breached` (separate) | 🔴 **Drift** — frontend collapses two SLA tracks into one |
| Missing | `ticket_number` (TKT-2026-00042 — primary user-facing identifier) | 🔴 Gap — UI shows numeric `id`, not ticket number |
| Missing | `ai_summary`, `ai_diagnosis`, `ai_commands_run`, `ai_kb_articles_checked`, `ai_confidence` | Phase B/C — flag |
| Missing | `category`, `subcategory`, `tags`, `source_type`, `endpoint_id` | Flag |
| Missing | `org_id` (filtering happens server-side, but no client check possible) | Phase-A acceptable |
| `requester_phone`, `requester_email` | exists in Flask | Flag (PII concern in mock data — see §6) |

**Recommendation:** before flipping `MOCK_MODE=false` in [`lib/api/helpdesk.ts:21`](../../lib/api/helpdesk.ts#L21), define an explicit Flask→Frontend mapping (probably in `lib/api/helpdesk.ts` or a backend `/api/proxy/helpdesk` transform layer). Without this, going live silently breaks.

### 4.2 AI providers — `platformengineer/apps/ai_providers/`

The Flask `ChatResponse` ([`adapters/base.py:14`](../../../platformengineer/apps/ai_providers/adapters/base.py#L14)) is `{content, model, input_tokens, output_tokens, raw}`. The frontend `ChatResponse` in [`lib/api/ai.ts:29`](../../lib/api/ai.ts#L29) is `{text, contextVersion, actionProposal}` — **no overlap**. This is **expected and OK**: the gateway adapter is provider-internal; the frontend will speak to a higher-level `/api/ai/chat` endpoint that doesn't exist yet (R048 partial cleanup). Just be explicit when that endpoint lands that the contract is `{text, contextVersion, actionProposal}`, not the adapter shape.

**No `ChatRequest`/page-context contract exists in Flask yet.** Backend story for AI-shell will need to formalize `PageContext` + `contextVersion` semantics on the Python side.

### 4.3 AI agents / agent_runtime / cicd_assistant

The floating assistant doesn't bind to any of these today. When AI-shell-C goes live, [`ActionProposal`](../../lib/hooks/use-assistant-session.ts#L67) maps conceptually to whatever issues confirmation tokens — likely `apps/ai_agents/` or a new `AIActionRegistry` (R051). Note this for the AI-shell-C live-mode story.

### 4.4 Page-context vs RBAC

Wired pages (`dashboard, users, users/[id], organizations, roles`) declare `availableActions: []` in their context — they don't yet expose Flask-level RBAC. Helpdesk detail page [`tickets/[id]/page.tsx:101`](../../app/(dashboard)/helpdesk/tickets/[id]/page.tsx#L101) **does** branch on ticket status to gate `take/resolve/reassign`, which is sensible; but it does not consult the user's session RBAC (e.g. `helpdesk.assign`). Phase-A acceptable but flag — the `availableActions` array is a security-adjacent surface (LLM acts on it).

---

## 5. Anti-overengineering findings

Mostly clean. Points worth noting:

- [`lib/hooks/use-assistant-session.ts:67`](../../lib/hooks/use-assistant-session.ts#L67) declares 9 states but only ~6 are exercised today (voice trio dormant). Comment explicitly defers them to AI-shell-D. Acceptable — premature *declaration* is cheap; premature *implementation* is what we'd flag, and that's not happening.
- [`use-assistant-session.ts:121`](../../lib/hooks/use-assistant-session.ts#L121) leaves a `TODO(AI-shell-D)` for voice — also fine.
- [`components/shared/timeline`](../../components/shared/timeline) and [`components/shared/detail-view`](../../components/shared/detail-view) are reused by the new ticket detail page — good, no duplication. ([`tickets/[id]/page.tsx:34-42`](../../app/(dashboard)/helpdesk/tickets/[id]/page.tsx#L34))
- `_resetMockState()` exported in [`lib/api/ai.ts:88`](../../lib/api/ai.ts#L88) is test-only — comment says so. Tolerable.
- Two `select` filters in [`tickets/page.tsx:155`](../../app/(dashboard)/helpdesk/tickets/page.tsx#L155) duplicate the same shape but aren't extracted to a `<FilterSelect>` shared component. Don't extract yet — needs a third caller before extraction is justified (per master-roadmap §11).
- `formatDate()` defined locally in [`tickets/[id]/page.tsx:74`](../../app/(dashboard)/helpdesk/tickets/[id]/page.tsx#L74). Fine; a general date util across modules would be premature.
- No dead exports detected in changed files.

---

## 6. MOCK_MODE risks — schema-drift table

| Risk | Where | Severity | Recommendation |
|---|---|---|---|
| Field-name drift (subject↔title, assigned_to↔assignee_id) | [`lib/api/helpdesk.ts:34-95`](../../lib/api/helpdesk.ts#L34) | 🔴 High | Mapping layer before MOCK_MODE off |
| Priority enum drift (P1-P4 ↔ low/medium/high/critical) | [`types.ts:10`](../../lib/modules/helpdesk/types.ts#L10) vs `models.py:205` | 🔴 High | Pick one and document; recommend frontend semantic, backend transforms |
| SLA field collapse (single `sla_breached` vs response/resolution split) | [`types.ts:24`](../../lib/modules/helpdesk/types.ts#L24) | 🟡 Medium | Decide whether UI surfaces both tracks |
| Missing `ticket_number` — UI shows numeric `id` | [`tickets/page.tsx:96`](../../app/(dashboard)/helpdesk/tickets/page.tsx#L96), [`tickets/[id]/page.tsx:141`](../../app/(dashboard)/helpdesk/tickets/[id]/page.tsx#L141) | 🟡 Medium | Add `ticket_number` to `TicketSummary` |
| Mock fixtures contain plausible-PII names ("Daisy Doe", "HR Hannah") in [`helpdesk.ts:163-184`](../../lib/api/helpdesk.ts#L163) | mock data only | 🟢 Low | Acceptable — test fixtures, no real PII |
| `dataSamples` in PageContext is documented as PII-caller-responsibility but no callers populate it yet | [`use-register-page-context.ts:10`](../../lib/hooks/use-register-page-context.ts#L10) | 🟢 Low | Add a redaction helper before any caller uses it |
| Cross-tenant: mock data has no `org_id`, so cross-tenant leakage is impossible *in mock*, but tests don't exist for the live path | n/a | 🟡 Medium | P1 Exit gate item #6 covers this — explicitly deferred |
| MOCK_MODE toggle path: clear single-line constant | [`lib/api/ai.ts:19`](../../lib/api/ai.ts#L19), [`lib/api/helpdesk.ts:21`](../../lib/api/helpdesk.ts#L21) | 🟢 Good | Clear |
| AI mock-response counter is module-global state — tests reset via `_resetMockState()` | [`lib/api/ai.ts:54`](../../lib/api/ai.ts#L54) | 🟢 Low | Fine for mock |

---

## 7. ADR application audit

| ADR | Applied? | Evidence |
|---|---|---|
| **ADR-037** Single-trunk + compensating controls | ✓ | [`scripts/check-high-risk-commit.mjs`](../../scripts/check-high-risk-commit.mjs) covers auth, AI providers, proxy, shared-services blacklist, migrations, `components/ui/`. [`scripts/git-hooks/pre-commit`](../../scripts/git-hooks/pre-commit) + installer [`scripts/install-git-hooks.sh`](../../scripts/install-git-hooks.sh) present. |
| **ADR-038** Mock-mode AI demo slice | ✓ | `MOCK_MODE = true` at [`lib/api/ai.ts:19`](../../lib/api/ai.ts#L19); no real LLM SDK imports anywhere in frontend (grep clean). |
| **ADR-039** Joint-development window during P1 | ✓ (governance only) | Documented in [`00-control-center.md:100`](../../docs/system-upgrade/00-control-center.md#L100). |
| **ADR-040** Helpdesk-validated foundation slicing | ✓ | Helpdesk Phase A scaffold landed (mock); no `-full` rounds before this. Master-roadmap reflects the slicing per the commit log. |
| **ADR-041** P1 Exit Gate (8 criteria) | ✓ | [`00-control-center.md:137-150`](../../docs/system-upgrade/00-control-center.md#L137) lists exactly 8 gate items, all 🔴 (correct — work is in progress). |
| **ADR-042** Project-wide coverage gate | ✓ | [`tests/.coverage-baseline.json`](../../tests/.coverage-baseline.json) has 10 layer floors with `regression_tolerance_pp: 1`; [`scripts/check-coverage-baseline.mjs`](../../scripts/check-coverage-baseline.mjs) enforces ≤1pp drop per layer. Baseline updated 3× today as new tests landed (ai.ts, helpdesk.ts ticket detail, drawer test). |

All 6 ADRs from today have executable artifacts, not just docs.

---

## 8. Tests assessment

**Counts** — 8 unit/component test files added today + 2 e2e specs:

```
lib/api/ai.test.ts                              (Story 2.x)
lib/api/helpdesk.test.ts                        (Phase A)
lib/hooks/use-assistant-session.test.ts         (Story 1.1 — 345 LOC, 9-state machine coverage)
lib/hooks/use-assistant-session-persistence.test.ts
lib/hooks/use-register-page-context.test.ts     (Story 1.2)
lib/utils.test.ts                               (R-OPS-01 baseline anchor)
components/shell/ai-assistant/drawer.test.tsx
components/shell/ai-assistant/floating-button.test.tsx
tests/e2e/ai-shell/fab-drawer.spec.ts
tests/e2e/helpdesk/dashboard.spec.ts
```

Pre-existing e2e (auth, smoke, users, security) brings total e2e to 10. Total spec count today: 10 new (8 vitest + 2 playwright). The "66 unit + e2e" claim from the prompt does **not** match what's in the repo — actual is well below 66.

**Coverage baseline reality** — most layers are still <10% (lib/api 24%, lib/hooks 32%, components/shell 5%, components/shared 0%, app/api/proxy 0%). The gate's job today is to **prevent regression**, not enforce the floor — that's correctly noted in [`tests/.coverage-baseline.json`](../../tests/.coverage-baseline.json) `target_floor` fields. ADR-042 floors are aspirational.

**Cross-tenant isolation** — `tests/e2e/security/tenant-isolation.spec.ts` exists from prior work but no Helpdesk-specific cross-tenant test was added. Correctly deferred — P1 Exit Gate #6 will require it before P1 closes.

**Test quality spot-check** — [`lib/hooks/use-assistant-session.test.ts`](../../lib/hooks/use-assistant-session.test.ts) at 345 LOC for a 275-LOC store is appropriate; covers state-machine transitions including no-op invariants. Well-written.

---

## 9. What's good — patterns to repeat

1. **Every API client has explicit `MOCK_MODE` constant + clear toggle path** — easier than env-var indirection. Repeat for future modules.
2. **Type module is React-free** — [`lib/modules/helpdesk/types.ts:7`](../../lib/modules/helpdesk/types.ts#L7) explicitly forbids React imports. Good architectural hygiene.
3. **Page-context registration is debounced** ([`use-register-page-context.ts:28`](../../lib/hooks/use-register-page-context.ts#L28)) — prevents thrashing on filter changes.
4. **State machine with idle-path-only stories** — Stories 1.1 ships 9-state typing but only 4 transitions wired. Future stories add transitions without retyping. Good incremental design.
5. **Reuse of `PageShell`, `FeatureGate`, `DataTable`, `DetailView`, `Timeline`, `ErrorState`, `EmptyState`, `StatCardSkeleton`** — shared primitives consumed by Helpdesk; **zero new "shared" components were added today** for Helpdesk. Healthy.
6. **First-error-wins** invariant in `setError` ([`use-assistant-session.ts:163`](../../lib/hooks/use-assistant-session.ts#L163)) — prevents error storm overwriting root cause; documented + tested.
7. **Coverage baseline updated atomically with code** — note in `tests/.coverage-baseline.json` records exact deltas per change.
8. **High-risk commit check is path-pattern-based, including the shared-services blacklist** — exactly what ADR-028 needed.
9. **ARIA correctness on AI drawer**: `role="log"`, `aria-live="polite"`, `aria-label` everywhere, `role="dialog"` on action card. FAB has `aria-label="Open AI assistant"`, icon `aria-hidden`. ✅

---

## 10. Recommendations — prioritized

### Before P1 Exit
1. **Define Flask↔Frontend mapping for Helpdesk** before flipping MOCK_MODE. Specifically: `subject→title`, `assigned_to→assignee_id`, `requester_user_id→requester_id`, priority enum (P1-P4 ↔ low/medium/high/critical), SLA field consolidation, surface `ticket_number`. Add an open-question entry in [`docs/system-upgrade/08-decisions/open-questions.md`](../../docs/system-upgrade/08-decisions/open-questions.md).
2. **Expand `LEGACY_INVENTORY.md`** to include the ~75 unmapped legacy capabilities (investigations, workflows, connectors, autonomy, RA, topology, …). Even if every one is "out of scope for migration", listing them is the No-Feature-Loss gate's contract.
3. **Formalize `/api/ai/chat` contract on Flask side** — the frontend `{message, context, contextVersion}` request and `{text, contextVersion, actionProposal}` response need a backend story. Capture as open-question.
4. **Add `availableActions` RBAC validation** — server should re-check; LLM should never receive an action it isn't permitted to invoke.

### Watch (not blocking)
5. **Replace native `<select>`** in tickets list filters with shadcn `Select` once a3rd consumer exists.
6. **Surface `ticket_number`** in list and detail headers — primary user identifier.
7. **i18n** — AI shell + Helpdesk strings hardcoded English; flag for module-i18n round.
8. **PII redaction helper** for `dataSamples` before any page populates it.

### Healthy patterns to keep
9. Continue mock-mode-with-MOCK_MODE-constant approach for new modules.
10. Continue updating `tests/.coverage-baseline.json` in the same commit as the code that raises coverage.

---

**Net:** Today's 32 commits represent a strong, well-governed day of scaffold work. The biggest risk is **silent contract drift** when MOCK_MODE flips to false — the frontend types do not yet match Flask serializer reality. That's a flip-day problem, not a today problem, and the ADR-040 phasing keeps the flip far enough away to fix it cleanly.
