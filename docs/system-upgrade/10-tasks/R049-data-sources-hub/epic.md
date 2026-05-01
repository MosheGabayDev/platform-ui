# R049 — Data Sources Hub Backend Foundation

**Phase:** P1 — Foundation Gates → P2 entry
**Track:** platformengineer
**Status:** 🔴 blocked on R047
**Depends on:** R047 (Secrets Manager), R046 (AuditLog), R040 ✅
**Estimate:** ~10 hours (multi-task — likely 2 sittings)

## Scope
- Conceptual models from `_legacy/47-…-roadmap.md §9`:
  - `DataConnection` — authenticated connection (MCP, DB, Google, Jira, GitHub, Slack, S3, …)
  - `DataSource` — specific entity within a connection (inbox, schema, repo)
  - `SourceAccessPolicy` — who can access at what level (incl. ai_allowed, voice_allowed, pii_allowed)
  - `SourceSyncJob` — discover / sync / index operations
  - `KnowledgeIndex` — index state per source
- AI Retrieval Policy enforcement: 10 rules in `_legacy/47-…-roadmap.md §9.5`
- MCP server registration governance (allowlist, danger levels)
- DB connection governance (read-only by default, query allowlists)

## Out of scope
- UI hub (separate platform-ui round R049-UI)
- Embedding/RAG pipeline (R052)
- Specific connectors (Google OAuth etc.) (R049+ per connector)

## Why now
AI assistants cannot safely access org data without a governed access layer. MCP servers and DB connections are currently ad-hoc per module — must become a platform service before R051 AI Action Platform ships.

## Decomposition
Spec is large — split into 3 sittings: (1) schema + models, (2) policy enforcement, (3) sync jobs + audit.

## Tasks (planned in 3 batches)

### Batch A — Schema (~3h)
- [ ] T01 — Migration: `data_connections` table (per spec)
- [ ] T02 — Migration: `data_sources` + `source_access_policies` tables
- [ ] T03 — Migration: `source_sync_jobs` + `knowledge_indexes` tables
- [ ] T04 — Models + Pydantic schemas

### Batch B — Policy enforcement (~4h)
- [ ] T05 — `SourceAccessChecker.can(user, source, action)` — implements 10 rules
- [ ] T06 — Connector secrets via R047 SecretService — never returned to frontend
- [ ] T07 — MCP register flow: tool/resource discovery + danger-level classification
- [ ] T08 — DB register flow: read-only default + query allowlist enforcement
- [ ] T09 — Tests: cross-tenant isolation, AI denial when ai_allowed=false, PII denial

### Batch C — Sync + audit (~3h)
- [ ] T10 — `SourceSyncJob` lifecycle: pending → running → completed/failed
- [ ] T11 — Discovery job: enumerate sources from connection
- [ ] T12 — Audit every sync + every retrieval via R046 AuditLog
- [ ] T13 — `GET /api/data-sources/connections` + `/sources` + RBAC

## Acceptance Criteria
- [ ] DataConnection / DataSource / SourceAccessPolicy CRUD via JWT API
- [ ] AI agent cannot access source if policy.ai_allowed=false (test)
- [ ] Cross-tenant: org A's connections invisible to org B (test)
- [ ] No connector secret ever appears in API response (test)
- [ ] Sync job audit trail complete

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
