# Module 18 — Integrations

**Priority:** 🟢 Low | **Est:** 2 days | **Depends on:** Settings (09)

## Flask Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/integrations/api/list` | List configured integrations |
| POST | `/integrations/api/connect/<type>` | Connect integration |
| DELETE | `/integrations/api/<id>` | Disconnect integration |
| GET | `/integrations/api/<id>/status` | Integration health |
| POST | `/integrations/api/<id>/test` | Test connection |

> Verify exact paths: `grep -n "@.*route" apps/integrations/ui/routes.py`

## Proxy Mapping (add to `app/api/proxy/[...path]/route.ts`)

```
"integrations": "/integrations"
```

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface Integration {
  id: number;
  type: "slack" | "jira" | "google" | "github" | "n8n" | "saml";
  name: string;
  status: "connected" | "error" | "disconnected";
  connected_at?: string;
  last_sync_at?: string;
  config?: Record<string, unknown>;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
integrations: {
  list: ["integrations", "list"] as const,
  detail: (id: number) => ["integrations", "detail", id] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/integrations/page.tsx` | `/integrations` | Integration marketplace |
| `app/(dashboard)/integrations/[type]/page.tsx` | `/integrations/:type` | Connect / configure |

## Components

- `IntegrationCard` — logo, name, status dot, connect/disconnect button
- `IntegrationGrid` — responsive card grid grouped by category
- `ConnectDialog` — OAuth redirect or API key input per type
- `IntegrationStatusBadge` — connected/error/disconnected

## Definition of Done

- [ ] Integration card grid
- [ ] Connect / disconnect flow
- [ ] Status badge per integration
- [ ] Test connection button
- [ ] Skeleton + EmptyState
