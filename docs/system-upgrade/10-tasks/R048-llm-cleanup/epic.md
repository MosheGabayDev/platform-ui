# R048 — P0 LLM Direct Import Cleanup

**Phase:** P1 — Foundation Gates
**Track:** platformengineer
**Status:** 🟡 partial-ready
**Depends on:** R043 (full routing-aware cleanup); simple gateway substitution can start immediately
**Estimate:** ~8 hours (40 files × ~10 min average)

## Scope
- Eliminate 55+ direct `import openai` / `import anthropic` / `import google.generativeai` calls
- Replace with `AIProviderGateway.call(service, params)` per `05-ai/llm-migration.md` audit
- Delete bypass wrappers (`life_assistant/services/gemini_client.py`, `openai_fallback.py`, `personal_info/ai_chat/providers/`)
- Activate CI gate (R041A) — `check_no_direct_llm_imports.py` blocks PRs

## Out of scope
- New gateway features (existing gateway is sufficient)
- Provider-specific routing logic (R043 owns this)

## Why now
Every direct import bypasses billing, audit, and policy. AI cost control and governance are porous until this closes.

## Decomposition
P0/P1/P2/P3 priority groups defined in `05-ai/llm-migration.md`. Each task migrates one logical group.

## Tasks
- [ ] T01 — P0 simple: `fitness_nutrition`, `ala`, `ai_coach` (no service routing needed) — 3 files
- [ ] T02 — P0 voice: `voice_support`, `mobile_voice` — coordinate with voice agent live calls
- [ ] T03 — P0 integrations: `jira_integration`, `personal_info/ai_chat/providers/`
- [ ] T04 — P1 modules: `helpdesk`, `ai_agents`, `ala/commitment_task`
- [ ] T05 — P2 modules: `ops_intelligence`, `personal_info` (10 files), `life_assistant`
- [ ] T06 — P3 remaining 15+ files
- [ ] T07 — Delete bypass wrappers + verify no callers
- [ ] T08 — Activate `check_no_direct_llm_imports.py` in CI as blocking gate (R041A intersect)
- [ ] T09 — Tests: every migrated module's AI feature still works (smoke + AI usage logged)

## Acceptance Criteria
- [ ] `grep -rE "^import (openai|anthropic|google\.generativeai)" apps/` returns zero results outside `apps/ai_providers/`
- [ ] CI fails any new PR that introduces a direct import
- [ ] `AIUsageLog` rows created for every migrated module's calls
- [ ] No regression in AI features (manual smoke test per module)

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
