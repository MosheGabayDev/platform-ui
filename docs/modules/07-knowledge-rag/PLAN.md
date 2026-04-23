# Module 07 — Knowledge & RAG

**Priority:** 🟠 High | **Est:** 2 days | **Depends on:** AI Agents (05)

## Flask Endpoints

Blueprint prefixes: `/api/rag` (API), `/admin/rag` (UI-backing)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rag/sources` | List knowledge sources |
| POST | `/api/rag/sources` | Add source (URL, file, text) |
| DELETE | `/api/rag/sources/<id>` | Remove source |
| POST | `/api/rag/query` | Query RAG (test search) |
| GET | `/api/rag/stats` | Index stats (doc count, vector count) |
| GET | `/api/rag/ingestion/jobs` | Ingestion job history |
| POST | `/api/rag/ingestion/trigger` | Re-index source |

> Verify: `grep -n "@.*route" apps/rag/api/blueprint.py apps/rag/api/query_api.py`

## Proxy Mapping (add to `app/api/proxy/[...path]/route.ts`)

```
"rag": "/api/rag"
```

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface RAGSource {
  id: number;
  name: string;
  source_type: "url" | "file" | "text" | "confluence";
  status: "indexed" | "pending" | "failed";
  doc_count: number;
  last_indexed_at?: string;
}

export interface RAGStats {
  total_sources: number;
  total_vectors: number;
  index_size_mb: number;
  last_full_reindex?: string;
}

export interface RAGQueryResult {
  answer: string;
  sources: Array<{ title: string; score: number; excerpt: string }>;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
rag: {
  stats: ["rag", "stats"] as const,
  sources: ["rag", "sources"] as const,
  jobs: ["rag", "ingestion-jobs"] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/knowledge/page.tsx` | `/knowledge` | Overview + stats |
| `app/(dashboard)/knowledge/sources/page.tsx` | `/knowledge/sources` | Source management |
| `app/(dashboard)/knowledge/test/page.tsx` | `/knowledge/test` | Test RAG query |

## Components

- `RAGStatCards` — sources count, vectors, index size
- `SourceTable` — DataTable with status badge, re-index button
- `AddSourceDialog` — URL/file/text type picker + form
- `RAGTestPanel` — query input + streamed results with source citations

## Definition of Done

- [ ] Source list with status badges
- [ ] Add / delete sources
- [ ] Re-index trigger
- [ ] Test query panel
- [ ] Stats cards
- [ ] Skeleton + EmptyState
