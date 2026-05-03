# PlatformSearch — Backend Contract Spec (cap 11)

> **Status:** spec drafted 2026-05-03 — frontend implementing against this shape in MOCK MODE. Backend MUST adopt this contract verbatim before MOCK flip.
>
> **Unblocks:** Helpdesk full-text search (Phase C inventory row 5), command-palette result merging, cross-module quick-jump.

---

## 1. Endpoint

```
GET /api/proxy/search?q=<query>&types=<csv>&limit=<n>
```

Frontend wraps this via `lib/api/search.ts searchGlobal()`; the proxy forwards to the Flask `/api/search/` blueprint.

### Request parameters

| Param   | Type          | Required | Default                                          | Notes |
|---------|---------------|----------|--------------------------------------------------|-------|
| `q`     | string        | yes      | —                                                | User query. Empty string MUST 200 with `results: []`. |
| `types` | csv string    | no       | `tickets,users,kb,orgs`                          | Restrict to specific result kinds. Unknown values silently dropped. |
| `limit` | int           | no       | `8` per type, max `25` per type                 | Per-type cap; total response bounded by `types.length × limit`. |
| `org_id`| not accepted  | —        | derived from session                            | NEVER passed from the client; Flask uses `g.org_id`. |

### Response envelope

```jsonc
{
  "success": true,
  "data": {
    "query": "VPN",
    "took_ms": 14,
    "results": [
      {
        "type": "ticket",
        "id": 1004,
        "title": "VPN clients failing handshake",
        "subtitle": "TKT-2026-01004 · critical · in_progress",
        "href": "/helpdesk/tickets/1004",
        "score": 0.92,
        "match_field": "title",
        "match_excerpt": "<mark>VPN</mark> clients failing handshake on..."
      },
      {
        "type": "kb",
        "id": "kb-vpn-troubleshooting",
        "title": "Troubleshooting VPN handshake failures",
        "subtitle": "Knowledge base · 4 min read",
        "href": "/helpdesk/kb/kb-vpn-troubleshooting",
        "score": 0.81,
        "match_field": "body",
        "match_excerpt": "Common <mark>VPN</mark> handshake failure modes..."
      }
    ],
    "totals_by_type": { "ticket": 3, "user": 0, "kb": 2, "org": 0 }
  }
}
```

### Result shape (canonical)

| Field           | Type                     | Notes |
|-----------------|--------------------------|-------|
| `type`          | `"ticket" \| "user" \| "kb" \| "org"` (open enum) | Frontend MUST tolerate unknown `type` and render with a default icon. |
| `id`            | `number \| string`       | String allowed for KB slugs; numeric for DB rows. |
| `title`         | string                   | Primary display line. ≤120 chars; backend SHOULD truncate. |
| `subtitle`      | string \| null           | Secondary display line — module name + status hint. |
| `href`          | string                   | Relative URL the frontend navigates to on select. |
| `score`         | float (0..1)             | Relevance score; results pre-sorted desc by score. |
| `match_field`   | string                   | Which field matched (`title`, `body`, `name`, …). For UX hint only. |
| `match_excerpt` | string                   | HTML snippet with `<mark>` tags around the match. **Backend MUST escape user content; only `<mark>` is allowed.** |

---

## 2. Multi-tenant safety

- `org_id` is derived server-side from the authenticated session. **Never** trust an `org_id` in the URL or body.
- Every searchable table participates via a `WHERE org_id = :org_id` clause **in the same query** as the text match. No post-filter.
- KB articles published as platform-wide are returned in addition to org-scoped ones; the join is `org_id = :org_id OR is_global = true`.
- `users` results are scoped to the requesting user's org; tenant admins see only their tenant.
- Cross-tenant test: query crafted to match both org A and org B data MUST return only org A's results when called as org A. Captured as a P1-Exit gate item.

---

## 3. Score model (initial)

- Postgres trigram (`pg_trgm` GiST index) on titles, names, ticket numbers.
- For body/description matches, `to_tsvector('simple', body) @@ plainto_tsquery(...)` with rank.
- Combined score: `0.7 * trgm_similarity(title, q) + 0.3 * ts_rank(body_tsv, query)`.
- Title hits beat body hits at equal trigram score by the 0.7 weight.
- Tickets get a recency bias: multiply final score by `1 + 0.1 * exp(-age_days / 14)`. Implementation flag `SEARCH_TICKET_RECENCY_BIAS` so the bias can be killed.

---

## 4. Performance budget

- p95 ≤ 150ms for `q.length ≥ 3`. Empty/short queries return immediately with `results: []`.
- Frontend debounces input by 200ms; backend MAY return early (under 50ms) if the index is warm.
- Bulk search (`limit=25` per type, all 4 types) MUST stay under 400ms p95.
- `EXPLAIN ANALYZE` plans MUST use the GiST index — backend test asserts `Bitmap Index Scan on idx_*_trgm` is in the plan.

---

## 5. Index migrations

- `idx_tickets_subject_trgm` on `tickets.subject` using `gin_trgm_ops`.
- `idx_tickets_body_tsv` on `tickets.description_tsv` (GENERATED column from `to_tsvector`).
- `idx_users_name_trgm` on `users.full_name` and `users.email`.
- `idx_kb_title_trgm` on `kb_articles.title`; `idx_kb_body_tsv` on `kb_articles.body_tsv`.
- All migrations CONCURRENTLY-safe; frontend MOCK_MODE flip happens AFTER migration completes in prod.

---

## 6. Error handling

- 400 for `q` longer than 256 chars (don't ship that to Postgres).
- 503 with `{ success: false, message: "search degraded" }` if the search service is unavailable; the command palette shows a single "Search temporarily unavailable" empty-state row.
- 200 with `results: []` is the right answer for "no matches"; never 404.

---

## 7. MOCK_MODE flip checklist

- [ ] Migration `add_search_indexes` applied and verified
- [ ] `/api/search/` blueprint registered with the response shape above
- [ ] Cross-tenant test (`tests/backend/security/test_search_isolation.py`) green
- [ ] p95 latency on prod-shaped data measured ≤150ms
- [ ] Frontend: flip `MOCK_MODE = false` in `lib/api/search.ts`
- [ ] Coverage: regression tests in `lib/api/search.test.ts` rerun against live service

---

## 8. Open questions (frontend → backend)

- **Q-S-1** — Do we want `recent` to share this endpoint (saved search history) or stay client-side via `useNavHistory`? Recommendation: client-side until session-recall is a product requirement.
- **Q-S-2** — Multi-word query semantics: AND vs OR? Recommendation: AND (`plainto_tsquery` default), with a fall-through OR pass for queries returning <3 results.
- **Q-S-3** — Highlight escaping: should the frontend re-render `match_excerpt` as HTML (`dangerouslySetInnerHTML` with sanitization), or should the API return `[start, end]` offsets? Recommendation: HTML with explicit `<mark>`-only allowlist via a 5-line sanitizer.
