# Module 14 — API Keys

**Priority:** 🟡 Medium | **Est:** 1 day | **Depends on:** Users (01)

## Flask Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/api/api-tokens` | List API tokens |
| POST | `/admin/api/api-tokens` | Create token |
| DELETE | `/admin/api/api-tokens/<id>` | Revoke token |

> Verify: `grep -n "api.token\|api_token\|ApiToken" apps/authentication/routes.py`

## Proxy Mapping

Uses existing `"admin": "/admin/api"` prefix.

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface APIToken {
  id: number;
  name: string;
  prefix: string;       // first 8 chars, e.g. "sk-abc123"
  scopes: string[];
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  is_active: boolean;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
apiKeys: {
  list: ["api-keys", "list"] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/api-keys/page.tsx` | `/api-keys` | Token management |

## Components

- `TokenTable` — DataTable with prefix, scopes, last used, revoke button
- `CreateTokenDialog` — name + scope picker, shows secret once on creation
- `SecretRevealCard` — one-time display of new token with copy button
- `ScopeBadgeGroup` — list of scope badges

## Definition of Done

- [ ] Token list with last-used timestamp
- [ ] Create token dialog
- [ ] Secret one-time reveal on create
- [ ] Revoke with confirmation
- [ ] Skeleton + EmptyState
