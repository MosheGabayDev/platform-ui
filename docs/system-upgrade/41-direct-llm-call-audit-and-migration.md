# 41 — Direct LLM Call Audit and Migration Plan

_Round 030 deliverable. Audit date: 2026-04-24. No runtime code changed._

---

## §01 — Executive Summary

The platform has a complete, production-grade AI provider layer (`apps/ai_providers/`) with registry, adapters, cost tracking, circuit breaker, and fallback chains. However, **~40 production files in `apps/` bypass it entirely** and call LLM/embedding/STT providers directly or through local wrapper objects. An additional ~20+ files exist in `scripts/`, `services/`, `libs/`, and `gateway-src/`.

The two critical consequences:

1. **Billing blind spots**: Every direct call is unbilled. Usage costs are invisible to the quota and billing system.
2. **Key leakage risk**: Any module that reads `os.getenv('OPENAI_API_KEY')` bypasses the org-scoped key resolution hierarchy.

Most bypasses were written before `apps/ai_providers/` existed or matured. They are not intentional security holes — they are technical debt from incremental development. The provider layer is now complete enough to be the mandatory entry point. What is missing is `gateway.py` (the `GatewayRequest` wrapper), `policy.py` (quota pre-check), `billing_adapter.py`, and the `AIUsageLog` schema extension — all designed in doc 40.

---

## §02 — Total Bypass Count

| Scope | Count | Notes |
|-------|-------|-------|
| `apps/` production files | **40** | Excludes tests, module_backups |
| `scripts/` one-off admin scripts | 8 | Embeddings for RAG seeding |
| `services/` Go gateway wrappers | 3 | mini_gateway, media_gateway |
| `libs/` shared library | 1 | call_summary/generator.py |
| `gateway-src/` | 2 | gemini_streamer.py (source copy) |
| `module_backups/` | 2 | Dead code |
| `deployment/kubernetes/docker/` | mirrors | Source copies — same as above |
| **Total unique bypass points** | **~56** | Unique source files |

---

## §03 — Provider Usage Summary

| Provider | Files (apps/ only) | Call types |
|----------|-------------------|------------|
| OpenAI (openai SDK) | 28 | chat, embeddings, vision/multimodal |
| Google Gemini (google.generativeai / google.genai) | 18 | chat, multimodal vision, transcription |
| Anthropic | 4 | computer_use vision, chat |
| OpenAI Realtime (openai_realtime_adapter) | 2 | realtime voice (gateway-src, voice failback) |

> Note: Some files use multiple providers (multi-provider switch logic).

---

## §04 — Module Usage Summary

| Module | Files bypassing | Providers used | Priority |
|--------|----------------|----------------|----------|
| `personal_info` | 10 | OpenAI, Gemini | P2 |
| `jira_integration` | 4 | OpenAI, Gemini | P0 |
| `life_assistant` | 3 | OpenAI, Gemini | P1 (wrapper) |
| `helpdesk` | 3 | OpenAI (embed), Gemini (vision), Anthropic | P1 |
| `ai_settings` | 2 | OpenAI | P1 |
| `mobile_voice` | 2 | OpenAI, Anthropic | P1 |
| `ops_intelligence` | 2 | OpenAI (embed), Gemini | P1 |
| `fitness_nutrition` | 2 | Gemini | P0 |
| `ala` | 2 | Gemini (genai SDK), OpenAI | P0 |
| `cicd_assistant` | 3 | OpenAI | P1 |
| `ai_agents` | 1 | Anthropic | P1 |
| `voice_support` | 1 | Gemini | P0 |
| `admin` | 1 | OpenAI, Gemini (test-connection endpoints) | P2 |
| `testing` | 2 | OpenAI | P2 |

---

## §05 — Bypass Wrapper Deep Review

### A. `apps/life_assistant/services/gemini_client.py`

**What calls it:** Life assistant daily analysis, event processing (`life_assistant` module, Celery tasks).

**What provider/model:** Primary path calls `get_chat_provider(module="life_assistant")` via registry (correct). Fallback path calls `OpenAI(api_key=get_api_key(...))` directly with `gpt-4o-mini`.

**Data sent:** Life event insights prompt (may contain user life data — PII risk: HIGH).

**Attribution:**
- `org_id`: passed (default 1) — present but potentially wrong (hardcoded default)
- `user_id`: passed
- `session_id`: absent
- `feature_id`: absent
- `conversation_id`: absent

**Key access:** Uses `get_api_key()` — ✅ compliant on key access.

**Billing:** None. Neither path writes `AIUsageLog`.

**Can be replaced by gateway:** YES — easily. Primary path already calls registry; add `GatewayRequest` wrapper, remove `_try_ai_fallback()` (gateway handles fallback chain natively).

**Deletion criteria:**
1. `gateway.py` Phase 1 ships
2. Callers updated to call `AIProviderGateway.call(GatewayRequest(module_id="life_assistant", feature_id="daily_analysis", ...))`
3. Tests updated to mock gateway, not the raw OpenAI client
4. `test_gemini_circuit_breaker.py` refactored (currently imports `openai_fallback_analyze` directly)

---

### B. `apps/life_assistant/services/openai_fallback.py`

**Location:** `apps/life_assistant/services/openai_fallback.py`

**What fallback it implements:** Secondary fallback (after Gemini circuit breaker opens) to OpenAI GPT-4o-mini. Guard: `AI_FALLBACK_ENABLED=true` env var AND `OPENAI_API_KEY` set.

**AI Providers fallback chain:** YES — `AIFallbackChain` + `is_paid_fallback_allowed()` already implement this at registry level. This file is a pre-registry-era workaround.

**Can it be deleted after migration:** YES.

**Risk of double-fallback if left:** HIGH. If `gemini_client.py` is migrated to use the gateway (which has fallback chain natively) and `openai_fallback.py` is also still referenced, a call may cascade: gateway → primary fails → registry fallback chain → AND still call `openai_fallback_analyze()` from calling code.

**Deletion criteria:**
1. `gemini_client.py` fully migrated to gateway
2. `test_gemini_circuit_breaker.py` test for `openai_fallback_analyze` replaced with gateway mock
3. Confirmed no other callers (grep: only `gemini_client.py` and the test file)

---

### C. `apps/personal_info/ai_chat/providers/openai_provider.py` + `gemini_provider.py`

**What providers exist:** Two provider classes: `OpenAIProvider` (openai SDK direct) and `GeminiProvider` (google.generativeai direct), implementing a common `AIProvider` interface from `../interfaces.py`.

**How API keys are stored:** Passed as constructor arg `api_key: str`. The orchestrator (`orchestrator.py`) is responsible for obtaining the key — it appears to call `openai.OpenAI(api_key=api_key)` inline. No `get_api_key()` usage in the provider files themselves.

**PII handling:** YES — `personal_info` processes personal diary entries, documents, tasks, transcriptions. PII risk: CRITICAL.

**Billing bypass:** YES — no AIUsageLog, no cost tracking anywhere in the `ai_chat/providers/` chain.

**Migration plan:** Replace `orchestrator.py` to call `AIProviderGateway.call(GatewayRequest(module_id="personal_info", feature_id="ai_chat", ...))` instead of constructing provider objects directly. Delete both provider files once orchestrator is migrated.

**Deletion criteria:**
1. `orchestrator.py` migrated to gateway
2. `orchestrator.py` no longer imports `OpenAIProvider` or `GeminiProvider`
3. No other callers of either provider class (grep confirms)
4. Gateway handles multi-provider switching natively via `AIFallbackChain`

---

## §06 — Full Inventory Table

> Legend: **CB** = circuit breaker, **KR** = uses key_resolver, **UL** = AIUsageLog, **org** = org_id present, **user** = user_id present, **sess** = session_id present

### P0 — Must migrate before any new AI feature

| # | File | Provider | Call type | Sync/Async | KR | UL | org | PII | Difficulty |
|---|------|----------|-----------|-----------|----|----|-----|-----|------------|
| 1 | `apps/voice_support/call_manager.py` | Gemini | chat | sync | ❌ | ❌ | ❌ | Low | Medium |
| 2 | `apps/fitness_nutrition/ai_service.py` | Gemini | chat | sync | ❌ | ❌ | ❌ | Medium | Easy |
| 3 | `apps/fitness_nutrition/ai_coach.py` | Gemini | chat/multimodal | sync | ❌ | ❌ | ❌ | Medium | Easy |
| 4 | `apps/jira_integration/ai_service.py` | OpenAI, Gemini | chat | sync | ❌ | ❌ | ❌ | Medium | Hard |
| 5 | `apps/jira_integration/troubleshooting_service.py` | OpenAI | chat | sync | ❌ | ❌ | ❌ | Low | Medium |
| 6 | `apps/jira_integration/routes.py` | OpenAI | chat | sync | ❌ | ❌ | ❌ | Low | Easy |
| 7 | `apps/jira_integration/devops_ai_service.py` | OpenAI | chat | sync | ❌ | ❌ | ❌ | Low | Medium |
| 8 | `apps/ala/tasks/commitment_task.py` | OpenAI | chat | async (Celery) | ❌ | ❌ | ❌ | High | Medium |
| 9 | `apps/personal_info/ai_chat/providers/openai_provider.py` | OpenAI | chat | sync | ❌ | ❌ | ❌ | Critical | Easy |
| 10 | `apps/personal_info/ai_chat/providers/gemini_provider.py` | Gemini | chat | sync | ❌ | ❌ | ❌ | Critical | Easy |

### P1 — Migrate before production

| # | File | Provider | Call type | Sync/Async | KR | UL | org | PII | Difficulty |
|---|------|----------|-----------|-----------|----|----|-----|-----|------------|
| 11 | `apps/ai_agents/engine/agent_runner.py` | Anthropic | chat (computer use) | async | ✅ | ❌ | ✅ | Medium | Medium |
| 12 | `apps/helpdesk/services/vision_service.py` | Gemini | vision/multimodal | sync | ✅ | ❌ | ✅ | High | Medium |
| 13 | `apps/helpdesk/services/screen_analyzer.py` | Anthropic | vision/multimodal | sync | ✅ | ❌ | ✅ | High | Medium |
| 14 | `apps/helpdesk/services/incident_memory_service.py` | OpenAI | embedding | sync | ✅ | ❌ | partial | Low | Easy |
| 15 | `apps/ai_settings/services/interview_engine.py` | OpenAI | chat | sync | ✅ | ❌ | partial | Low | Easy |
| 16 | `apps/ai_settings/services/agent_engine.py` | OpenAI | chat (fallback) | sync | ✅ | ❌ | partial | Low | Easy |
| 17 | `apps/ala/text_session.py` | Gemini (genai) | chat+function_calling | sync | partial | ❌ | partial | Medium | Medium |
| 18 | `apps/mobile_voice/title_generator.py` | OpenAI, Anthropic | chat | sync | partial | ❌ | partial | Low | Easy |
| 19 | `apps/mobile_voice/conversation_engine.py` | OpenAI, Anthropic | chat | sync | ✅ | ❌ | partial | Low | Medium |
| 20 | `apps/ops_intelligence/services/ops_rag_indexer.py` | OpenAI | embedding | sync | ✅ | ❌ | ✅ | Low | Easy |
| 21 | `apps/cicd_assistant/ai_service.py` | OpenAI | chat | sync | ✅ | ❌ | partial | Low | Medium |
| 22 | `apps/cicd_assistant/routes.py` | OpenAI | chat | sync | ❌ | ❌ | ❌ | Low | Easy |
| 23 | `apps/cicd_assistant/settings.py` | OpenAI | chat | sync | ❌ | ❌ | ❌ | Low | Easy |
| 24 | `apps/ops_intelligence/tools/bootstrap_catalog.py` | Gemini | chat | sync | ❌ | ❌ | ❌ | Low | Easy |
| 25 | `apps/life_assistant/services/gemini_client.py` | OpenAI (fallback) | chat | sync | ✅ | ❌ | partial | High | Easy |
| 26 | `apps/life_assistant/services/openai_fallback.py` | OpenAI | chat | sync | ✅ | ❌ | ❌ | High | Easy |

### P2 — Migrate before billing launch

| # | File | Provider | Call type | Sync/Async | KR | UL | PII | Difficulty |
|---|------|----------|-----------|-----------|----|----|-----|------------|
| 27 | `apps/personal_info/document_recognition_service.py` | OpenAI | vision+chat | sync | ✅ | ❌ | Critical | Hard |
| 28 | `apps/personal_info/routes.py` | OpenAI | chat | sync | ❌ | ❌ | Critical | Easy |
| 29 | `apps/personal_info/settings_routes.py` | OpenAI | chat | sync | ❌ | ❌ | Critical | Easy |
| 30 | `apps/personal_info/ai_settings_routes.py` | OpenAI | chat | sync | ❌ | ❌ | Critical | Easy |
| 31 | `apps/personal_info/task_ai_service.py` | OpenAI | chat | async (Celery) | ❌ | ❌ | High | Easy |
| 32 | `apps/personal_info/services/transcription_service.py` | Gemini, OpenAI | transcription/STT | sync | partial | ❌ | High | Medium |
| 33 | `apps/personal_info/services/secretary_service.py` | Gemini | chat | sync | ❌ | ❌ | High | Easy |
| 34 | `apps/personal_info/services/memory_indexing_service.py` | Gemini | embedding | sync | ❌ | ❌ | High | Easy |
| 35 | `apps/personal_info/services/rag_answer_service.py` | Gemini | chat/RAG | sync | ❌ | ❌ | High | Easy |
| 36 | `apps/personal_info/ai_chat/orchestrator.py` | OpenAI | embedding | sync | ❌ | ❌ | Critical | Easy |
| 37 | `apps/testing/ai_discovery/test_plan_generator.py` | OpenAI | chat | sync | ❌ | ❌ | Low | Easy |
| 38 | `apps/testing/ai_discovery/result_analyzer.py` | OpenAI | chat | sync | ❌ | ❌ | Low | Easy |
| 39 | `apps/admin/routes.py` | OpenAI, Gemini | chat (test-connection) | sync | ✅ | ❌ | None | Easy |
| 40 | `apps/life_assistant/services/recording_transcriber.py` | Gemini, OpenAI | transcription/STT | sync | partial | ❌ | High | Medium |

### P3 — Legacy / defer / non-`apps/`

| # | File | Notes |
|---|------|-------|
| 41 | `libs/call_summary/generator.py` | Genai for call summaries — shared lib |
| 42 | `services/mini_gateway_inbound/gemini.py` | Go-side gateway wrapper — separate service |
| 43 | `services/mini_gateway_outbound/gemini.py` | Go-side gateway wrapper — separate service |
| 44 | `services/media_gateway/gemini_streamer.py` | Media gateway service |
| 45 | `scripts/add_sample_data_to_rag.py` | Admin RAG seeding script |
| 46 | `scripts/import_torah_content.py` | One-off import script |
| 47 | `scripts/import_personal_data_to_rag.py` | One-off import script |
| 48 | `scripts/rag/*.py` | Admin demo/test scripts |
| 49 | `scripts/seed_test_data_phase2.py` | Test data seeding |
| 50 | `call_summary/call_summary/generator.py` | Legacy root dir — likely dead |
| 51 | `module_backups/` | Dead code — archived |
| 52 | `gateway-src/` | Go gateway source — separate concern |
| 53 | `IaC/terraform-ec2-asterisk/` | Terminated FreePBX — dead |
| 54 | `deployment/kubernetes/docker/` | Docker build copies — mirror sources |

---

## §07 — Billing / Usage Tracking Gaps

| Gap | Severity | Affected modules |
|-----|----------|-----------------|
| No `AIUsageLog` write for direct provider calls | Critical | All 40 files |
| No `feature_id` in existing `AIUsageLog` | High | All modules — even registry-routed calls |
| No `conversation_id` linkage | High | floating_assistant, helpdesk sessions |
| No `action_id` / `ai_action_invocation_id` linkage | High | AI Action Platform (future) |
| No `status` / `started_at` / `completed_at` | High | Streaming billing, error attribution |
| No quota pre-check before provider call | Critical | All modules (unlimited spend possible) |
| Streaming call aborts → unbilled usage | High | Streaming-capable modules |
| Voice STT+LLM+TTS not linked by `session_id` in UsageLog | High | mobile_voice, ala |
| No `billable_cost` field for finalized cost | Medium | Billing reconciliation |
| Partial stream estimation (`is_estimated=true`) not tracked | Medium | Streaming billing integrity |

---

## §08 — Attribution Gaps

| Module | org_id | user_id | session_id | feature_id | conversation_id |
|--------|--------|---------|------------|------------|-----------------|
| voice_support/call_manager.py | ❌ | ❌ | ❌ | ❌ | ❌ |
| fitness_nutrition | ❌ | ❌ | ❌ | ❌ | ❌ |
| jira_integration | ❌ | ❌ | ❌ | ❌ | ❌ |
| personal_info/ai_chat | ❌ | ❌ | ❌ | ❌ | ❌ |
| ala/tasks | ❌ | ❌ | ❌ | ❌ | ❌ |
| life_assistant (gemini_client) | partial (default 1) | ✅ | ❌ | ❌ | ❌ |
| helpdesk (vision/screen) | ✅ | ✅ | partial | ❌ | ❌ |
| ai_agents (agent_runner) | ✅ | ✅ | partial | ❌ | ❌ |
| mobile_voice | partial | partial | partial | ❌ | ❌ |
| ai_settings (engine) | partial | ❌ | ❌ | ❌ | ❌ |

**Org_id gap is the most dangerous**: a direct call with no `org_id` cannot be attributed to a tenant. Any unbilled cost is the platform's loss, not the tenant's.

---

## §09 — PII Risk Review

| Risk level | Files | Notes |
|------------|-------|-------|
| **Critical** | `personal_info/` (10 files), `personal_info/ai_chat/` (4 files) | Personal diary, documents, medical info sent to OpenAI/Gemini without PII redaction policy |
| **High** | `life_assistant/` (3 files), `ala/tasks/commitment_task.py`, `life_assistant/services/recording_transcriber.py` | Life events, voice transcripts, scheduling context |
| **Medium** | `helpdesk/services/vision_service.py`, `helpdesk/services/screen_analyzer.py` | Screen captures may contain sensitive data |
| **Low** | `jira_integration/`, `cicd_assistant/`, `mobile_voice/title_generator.py` | JIRA tickets and CI logs usually non-personal |
| **None** | `testing/ai_discovery/`, `admin/routes.py` test-connection endpoints | No user data involved |

**Key PII findings:**
1. `personal_info/ai_chat/providers/gemini_provider.py` — sends full chat history to `google.generativeai` without any PII redaction. No audit log of what was sent.
2. `life_assistant/services/recording_transcriber.py` — sends raw audio or transcripts to Gemini/OpenAI. The `pii_redaction_policy` from `AIActionDescriptor` is never applied here.
3. `ala/tasks/commitment_task.py` — sends commitment/scheduling data to OpenAI with no PII check.

---

## §10 — Streaming / Voice Usage Gaps

| Gap | File | Notes |
|-----|------|-------|
| No streaming finalization | All streaming calls | `chat_stream_with_usage()` not yet implemented in gateway |
| Voice STT unbilled | `apps/ala/text_session.py` | Gemini function-calling calls have no usage log |
| Voice LLM unbilled | `apps/mobile_voice/conversation_engine.py` | Anthropic/OpenAI fallback path no billing |
| TTS unbilled | No TTS calls found in apps/ | TTS happens in Go gateway — separate concern |
| Audio token field unused | `AIUsageLog` has `audio_input_tokens` | Populated nowhere in bypass files |
| Realtime voice (go gateway) | `gateway-src/`, `libs/voice_failback/` | Go-side, separate billing concern |

---

## §11 — Gateway Phase 1 Readiness Assessment

### What exists today in `apps/ai_providers/`

| Component | Status | Notes |
|-----------|--------|-------|
| Provider registry (`registry.py`) | ✅ Production-ready | 4-level hierarchy, Redis CB, 60s cache, `get_chat_provider()` / `get_embedding_provider()` |
| Adapters (openai, gemini, anthropic, ollama) | ✅ Production-ready | All implement `AIProviderAdapter` base (chat, embed, stream) |
| Key resolver (`key_resolver.py`) | ✅ Production-ready | `get_api_key(org_id, capability, module_name)`, org-scoped |
| Fallback chain (`AIFallbackChain`, registry) | ✅ Exists | `is_paid_fallback_allowed()` + ordered fallback chain in DB |
| Circuit breaker | ✅ Redis-backed | In `registry.py` — per-org, per-provider |
| Cost tracker (`cost_tracker.py`) | ✅ Exists | `calculate_cost()` + `log_usage()` via Celery fire-and-forget |
| `AIUsageLog` model | ✅ Exists | Partitioned monthly, has org_id, user_id, session_id, module_name, tokens, cost_usd, audio tokens |
| Health monitor | ✅ Exists | `run_health_checks()` + Celery task |
| Drivers (perplexity, tavily, computer_use) | ✅ Exists | Special-purpose LLM drivers |
| Test coverage | ✅ Good | adapters, registry, key_resolver, fallback chain, usage_limits, internal_routes |
| Streaming support | ✅ Partial | `chat_stream()` exists in adapters; no `chat_stream_with_usage()` finalizer |
| Billing outbox bridge | ❌ Missing | `emit_billing_event()` not called from ai_providers |
| Quota pre-check | ❌ Missing | No Redis quota buckets, no pre-call enforcement |
| `gateway.py` entry point | ❌ Missing | No `GatewayRequest` / `GatewayResponse` wrapper |
| `policy.py` | ❌ Missing | No `AIProviderPolicy` quota gate |
| `billing_adapter.py` | ❌ Missing | No bridge to `service_billing.emit_billing_event()` |
| `AIUsageLog` schema extension | ❌ Missing | 12 new fields not yet in DB/model |
| module_id / feature_id attribution | ❌ Missing | `log_usage()` does not accept `feature_id` or `conversation_id` |
| CI lint enforcement | ❌ Missing | No rule blocking direct provider imports |
| Mandatory usage (enforcement) | ❌ Missing | Modules can bypass; no runtime check |

**Verdict: The provider layer is 70% complete. The registry and adapters are production-ready. What is missing is the GatewayRequest wrapper, quota enforcement, billing bridge, and the schema extension for full attribution.**

---

## §12 — Migration Phases

### Phase 1 — Gateway Infrastructure (prerequisite for all migration)

Deliver `gateway.py`, `policy.py`, `billing_adapter.py`, schema migration, CI lint.
This phase has no module-level migrations — it only builds the mandatory entry point.

**Files to create:**
- `apps/ai_providers/gateway.py` — `AIProviderGateway.call(GatewayRequest)` entry point
- `apps/ai_providers/policy.py` — `AIProviderPolicy` quota pre-check
- `apps/ai_providers/billing_adapter.py` — bridge to `emit_billing_event()`
- `apps/ai_providers/schemas.py` — `GatewayRequest`, `GatewayResponse` dataclasses
- Migration `20260424_extend_ai_usage_log.py` — 12 new fields

**CI lint rule (exact planned script):**
```yaml
- name: Check for direct LLM provider imports outside apps/ai_providers/
  run: |
    VIOLATIONS=$(grep -rn \
      "import openai\|from openai import\|import anthropic\|from anthropic import\
      \|import google\.generativeai\|from google\.generativeai\|import google.genai\|from google import genai" \
      apps/ \
      --include="*.py" \
      --exclude-dir=ai_providers \
      --exclude-dir=__pycache__ \
      -l \
      | grep -v "_test\|test_\|conftest" \
    )
    if [ -n "$VIOLATIONS" ]; then
      echo "FAIL: Direct LLM provider imports found outside apps/ai_providers/:"
      echo "$VIOLATIONS"
      echo ""
      echo "Use AIProviderGateway.call(GatewayRequest(...)) instead."
      echo "See: docs/system-upgrade/40-ai-provider-gateway-billing.md"
      exit 1
    fi
```

**CI allowlist (files exempt from lint):**
```
apps/ai_providers/adapters/openai_adapter.py
apps/ai_providers/adapters/gemini_adapter.py
apps/ai_providers/adapters/anthropic_adapter.py
apps/ai_providers/adapters/ollama_adapter.py
apps/ai_providers/adapters/openai_compatible_adapter.py
apps/ai_providers/drivers/anthropic_computer_use.py
```

All other Python files in `apps/` must not import LLM provider SDKs directly.

---

### Phase 2 — P0 Module Migrations

Migrate modules with no key_resolver and no billing attribution. These have the worst risk profile.

**Migration order (by blast radius):**
1. `apps/voice_support/call_manager.py` — Gemini module-level import (load-time risk)
2. `apps/fitness_nutrition/ai_service.py` + `ai_coach.py` — Gemini module-level import
3. `apps/jira_integration/ai_service.py` — largest file, multi-provider switch
4. `apps/jira_integration/troubleshooting_service.py`, `routes.py`, `devops_ai_service.py`
5. `apps/ala/tasks/commitment_task.py` — Celery task, voice adjacent
6. Delete `apps/personal_info/ai_chat/providers/openai_provider.py` + `gemini_provider.py` after orchestrator migrated

---

### Phase 3 — P1 Module Migrations

Migrate modules that already use key_resolver but have no billing/usage attribution.

**Migration order:**
1. `apps/life_assistant/services/gemini_client.py` + `openai_fallback.py` (delete after)
2. `apps/helpdesk/services/vision_service.py` + `screen_analyzer.py` + `incident_memory_service.py`
3. `apps/ai_agents/engine/agent_runner.py`
4. `apps/ai_settings/services/interview_engine.py` + `agent_engine.py`
5. `apps/ala/text_session.py`
6. `apps/mobile_voice/title_generator.py` + `conversation_engine.py`
7. `apps/ops_intelligence/services/ops_rag_indexer.py` + `tools/bootstrap_catalog.py`
8. `apps/cicd_assistant/ai_service.py` + `routes.py` + `settings.py`

---

### Phase 4 — P2 Module Migrations

Migrate `personal_info` (10 files, Critical PII risk) and remaining modules.

**Note:** `personal_info` is the highest PII risk module. It requires careful testing because the module handles personal diary, documents, medical info. Each sub-service must be verified independently.

**Migration order:**
1. `apps/personal_info/ai_chat/orchestrator.py`
2. `apps/personal_info/services/transcription_service.py`
3. `apps/personal_info/services/rag_answer_service.py`
4. `apps/personal_info/services/memory_indexing_service.py`
5. `apps/personal_info/services/secretary_service.py`
6. `apps/personal_info/document_recognition_service.py` (complex — vision)
7. `apps/personal_info/task_ai_service.py`
8. `apps/personal_info/routes.py` + `settings_routes.py` + `ai_settings_routes.py`
9. `apps/life_assistant/services/recording_transcriber.py`
10. `apps/testing/ai_discovery/test_plan_generator.py` + `result_analyzer.py`
11. `apps/admin/routes.py` (test-connection endpoints only)

---

## §13 — P0 Migration List

These files must be migrated before any new AI feature is shipped (Round 031+):

| Priority | File | Why urgent |
|----------|------|------------|
| P0.1 | `apps/voice_support/call_manager.py` | Module-level genai import = fails at import time if key missing |
| P0.2 | `apps/fitness_nutrition/ai_service.py` | Module-level genai import |
| P0.3 | `apps/fitness_nutrition/ai_coach.py` | Module-level genai import |
| P0.4 | `apps/jira_integration/ai_service.py` | No key_resolver, no billing, largest jira AI file |
| P0.5 | `apps/jira_integration/troubleshooting_service.py` | Direct openai_client field, no billing |
| P0.6 | `apps/jira_integration/routes.py` | Inline openai import in route handler |
| P0.7 | `apps/jira_integration/devops_ai_service.py` | Direct openai import |
| P0.8 | `apps/ala/tasks/commitment_task.py` | Celery task, voice path adjacent, no billing |
| P0.9 | `apps/personal_info/ai_chat/providers/openai_provider.py` | Bypass wrapper, Critical PII |
| P0.10 | `apps/personal_info/ai_chat/providers/gemini_provider.py` | Bypass wrapper, Critical PII |

**Blocker:** P0 migration depends on Phase 1 (gateway.py) being available.

---

## §14 — P1 Migration List

These files must be migrated before production (same round as or immediately after gateway.py ships):

1. `apps/life_assistant/services/gemini_client.py` (+ delete `openai_fallback.py`)
2. `apps/helpdesk/services/vision_service.py`
3. `apps/helpdesk/services/screen_analyzer.py`
4. `apps/helpdesk/services/incident_memory_service.py`
5. `apps/ai_agents/engine/agent_runner.py`
6. `apps/ai_settings/services/interview_engine.py`
7. `apps/ai_settings/services/agent_engine.py`
8. `apps/ala/text_session.py`
9. `apps/mobile_voice/title_generator.py`
10. `apps/mobile_voice/conversation_engine.py`
11. `apps/ops_intelligence/services/ops_rag_indexer.py`
12. `apps/ops_intelligence/tools/bootstrap_catalog.py`
13. `apps/cicd_assistant/ai_service.py`
14. `apps/cicd_assistant/routes.py`
15. `apps/cicd_assistant/settings.py`

---

## §15 — P2/P3 Deferred List

### P2 (before billing launch)
- All 10+ `personal_info/` files
- `life_assistant/services/recording_transcriber.py`
- `testing/ai_discovery/*.py`
- `admin/routes.py` (test-connection endpoints)

### P3 (legacy / defer)
- `scripts/*.py` — admin scripts, not metered (intentional)
- `libs/call_summary/generator.py` — review whether still used
- `services/mini_gateway_*/gemini.py` — Go service, separate architecture concern
- `call_summary/call_summary/generator.py` — verify dead code status

---

## §16 — Enforcement Design

### Rule 1 — CI lint (block direct imports)

Planned script in §12 above. Implementation: add to `.github/workflows/ci.yml` as a pre-test step.

### Rule 2 — Allowlist (`apps/ai_providers/adapters/` only)

Files that may import provider SDKs directly:
- `apps/ai_providers/adapters/openai_adapter.py`
- `apps/ai_providers/adapters/gemini_adapter.py`
- `apps/ai_providers/adapters/anthropic_adapter.py`
- `apps/ai_providers/adapters/ollama_adapter.py`
- `apps/ai_providers/adapters/openai_compatible_adapter.py`
- `apps/ai_providers/drivers/anthropic_computer_use.py`

All other files must use `AIProviderGateway.call()` or `get_api_key()` (key-only legacy path).

### Rule 3 — CLAUDE.md enforcement (already updated in Round 029)

```python
# BANNED outside apps/ai_providers/:
import openai
import anthropic
import google.generativeai

# REQUIRED:
from apps.ai_providers.gateway import AIProviderGateway, GatewayRequest
response = AIProviderGateway.call(GatewayRequest(
    org_id=current_user.org_id, ...
))
```

### Rule 4 — Code review checklist

Add to PR template:
- [ ] No `import openai` / `from openai` outside `apps/ai_providers/adapters/`
- [ ] No `import anthropic` / `from anthropic` outside `apps/ai_providers/adapters/`
- [ ] No `import google.generativeai` outside `apps/ai_providers/adapters/`
- [ ] Every LLM call uses `AIProviderGateway.call(GatewayRequest(...))`
- [ ] `org_id`, `user_id`, `module_id`, `feature_id` all present in `GatewayRequest`

---

## §17 — Required Tests

### Phase 1 gateway tests
- `test_gateway_request_validation.py` — GatewayRequest required fields
- `test_gateway_billing_integration.py` — verify `AIUsageLog` row written on every `call()`
- `test_gateway_quota_enforcement.py` — verify quota pre-check blocks over-limit orgs
- `test_gateway_streaming_finalize.py` — verify partial stream writes `is_estimated=True`
- `test_gateway_no_direct_provider_imports.py` — CI scan test (module-level lint)

### Per-module migration tests
For each migrated module, verify:
1. `AIUsageLog` row written with correct `org_id`, `user_id`, `module_id`, `feature_id`
2. Old direct provider import removed
3. Fallback behavior preserved (now via gateway fallback chain, not local fallback wrapper)
4. PII-sensitive modules: verify no raw personal data in log fields

### Regression tests
- Life assistant daily analysis still produces results after `gemini_client.py` migration
- Helpdesk vision analysis still works with new gateway path
- ALA text session still produces function calls after `text_session.py` migration
- Mobile voice title generator still works after migration

---

## §18 — Deletion Criteria for Bypass Wrappers

### `apps/life_assistant/services/gemini_client.py`
Delete when:
1. `gateway.py` Phase 1 complete and deployed
2. All callers updated to use `AIProviderGateway.call()`
3. `test_gemini_circuit_breaker.py` refactored to not import this file
4. CI lint passes with file deleted

### `apps/life_assistant/services/openai_fallback.py`
Delete when:
1. `gemini_client.py` deleted (removes primary caller)
2. All references in tests replaced with gateway mock
3. `GEMINI_FALLBACK_USES` metric either removed or re-wired to gateway metric
4. `AI_FALLBACK_ENABLED` env var documented as obsolete in `CLAUDE.md`

### `apps/personal_info/ai_chat/providers/openai_provider.py`
Delete when:
1. `orchestrator.py` migrated to use `AIProviderGateway.call()`
2. No other imports of `OpenAIProvider` in codebase
3. CI lint passes with file deleted

### `apps/personal_info/ai_chat/providers/gemini_provider.py`
Delete when:
1. Same as `openai_provider.py` above (same caller: `orchestrator.py`)
2. `apps/personal_info/ai_chat/providers/__init__.py` updated to remove exports
3. Consider deleting entire `providers/` directory if `orchestrator.py` is the only consumer

---

## §19 — Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Module-level genai imports fail at load time if key missing | High | P0.1–P0.3 must migrate before next deploy |
| `personal_info` PII sent to providers without PII redaction | Critical | P2 migration required before billing launch |
| Double-fallback if `openai_fallback.py` left while gateway handles fallback | High | Delete `openai_fallback.py` in same PR as `gemini_client.py` migration |
| Celery tasks with direct provider calls (commitment_task, task_ai_service) | High | Gateway must be importable from Celery worker context (it will be — same Flask app) |
| Streaming callers that don't call `finalize_stream()` after migration | High | Gateway Phase 1 must include streaming finalization contract + tests |
| ops_rag_indexer falls back to `os.getenv("OPENAI_API_KEY")` if key_resolver fails | Medium | After migration, remove env fallback — gateway handles fallback chain |
| 40 files in one sprint causes regressions | Medium | Phase by phase, with tests per module |
| CI lint added before migration completes causes PR failures | High | Add lint with `--warn-only` flag first, convert to hard failure after Phase 3 completes |

---

## §20 — Acceptance Criteria Before New AI Features

This round is complete when:

- [ ] This document (`41-direct-llm-call-audit-and-migration.md`) is reviewed and accepted
- [ ] P0 migration list is assigned to a named implementation round
- [ ] Phase 1 infrastructure tasks added to backlog with clear owner
- [ ] CI lint rule design documented and approved (not yet implemented — requires Phase 3 completion before hard failure)
- [ ] Bypass wrapper deletion criteria documented and agreed
- [ ] `docs/system-upgrade/40-ai-provider-gateway-billing.md` updated with audit findings reference
- [ ] `docs/system-upgrade/35-platform-capabilities-build-order.md` updated with Phase 2/3/4 migration tracks
- [ ] `docs/system-upgrade/15-action-backlog.md` updated with P0 migration tasks

**No new AI features may be added to any P0 module until that module's direct provider calls are migrated.**
