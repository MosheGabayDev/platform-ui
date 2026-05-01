# R043 — AI Service-to-Provider Routing Matrix Backend

**Phase:** P1 — Foundation Gates
**Track:** platformengineer
**Status:** ⬜ ready
**Depends on:** R040 ✅
**Estimate:** ~5 hours

## Scope
- `AIServiceDefinition` model (canonical service identifiers: chat, summarize, classify, embed, transcribe, tts, voice-realtime, vision, code, agent)
- `AIServiceProviderRoute` model (per-org overrides: service → provider mapping with priority + fallback)
- `AIUsageLog` extension fields (service_id, route_id, fallback_step) — additive migration
- Routing resolver: given (org_id, service_id) → ordered list of providers to try
- Spec ref: `05-ai/providers-hub.md §16-28`

## Out of scope
- Provider Hub UI (R054+)
- Voice-specific routing (separate concern)
- Quota enforcement (R045)

## Why now
55+ files call LLMs directly because there's no routing layer. Even after `AIProviderGateway` rollout, the gateway needs this matrix to know which provider to call per service. R048 cleanup is partial-blocked without it.

## Decomposition rationale
Schema first, then resolver pure-function (testable in isolation), then wire into gateway.

## Tasks
- [ ] T01 — Migration: `ai_service_definitions` + `ai_service_provider_routes` tables (additive, with seeds)
- [ ] T02 — Migration: extend `ai_usage_log` with `service_id`, `route_id`, `fallback_step` (nullable)
- [ ] T03 — `resolve_route(org_id, service_id)` pure function + unit tests (no DB I/O abstracted)
- [ ] T04 — Wire resolver into `AIProviderGateway.call()` request path
- [ ] T05 — Seed: default routes for chat / summarize / embed / transcribe (system_admin org)
- [ ] T06 — Cross-tenant test: org A's routes invisible to org B
- [ ] T07 — Audit: every route resolution logged in `AIUsageLog`

## Acceptance Criteria
- [ ] `resolve_route("system", "chat")` returns ordered fallback list from seed
- [ ] Per-org override beats system default
- [ ] AIUsageLog rows include service_id + route_id after gateway call
- [ ] Cross-tenant isolation verified
- [ ] All tests pass

## Definition of Done
- [ ] AC met
- [ ] G-Routing gate added to control center if not present
- [ ] Final commit SHA recorded below

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
