# Module 09 — Settings

**Priority:** 🟠 High | **Est:** 2 days | **Depends on:** Users (01), Roles (03)

## Flask Endpoints

Multiple blueprints contribute to settings:

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/admin/general-settings` | General platform settings |
| POST | `/admin/general-settings/save` | Save settings |
| GET/POST | `/admin/settings/email` | Email (SMTP) settings |
| POST | `/admin/settings/email/test` | Test email send |
| GET | `/ai-providers/api/providers` | AI provider list |
| POST | `/ai-providers/api/providers` | Add provider |
| PUT | `/ai-providers/api/providers/<id>` | Update provider |
| DELETE | `/ai-providers/api/providers/<id>` | Remove provider |
| POST | `/ai-providers/api/providers/<id>/test` | Test provider connection |
| GET | `/ai-providers/api/defaults` | Default capabilities |
| POST | `/ai-providers/api/defaults` | Set defaults |
| GET | `/ai-providers/api/usage-limits` | Usage limits |
| POST | `/ai-providers/api/usage-limits` | Set usage limit |

## Proxy Mapping (add to `app/api/proxy/[...path]/route.ts`)

```
"ai-providers": "/ai-providers"
// "admin" already mapped
```

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface AIProvider {
  id: number;
  name: string;
  provider_type: "openai" | "gemini" | "anthropic" | "azure";
  is_active: boolean;
  model_name?: string;
  capabilities: string[];
}

export interface ProviderDefault {
  capability: string;
  provider_id: number;
  provider_name: string;
  model?: string;
}

export interface UsageLimit {
  id: number;
  capability: string;
  max_monthly_cents: number;
  current_spend_cents: number;
  alert_threshold_pct: number;
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/settings/page.tsx` | `/settings` | Settings hub |
| `app/(dashboard)/settings/general/page.tsx` | `/settings/general` | General settings |
| `app/(dashboard)/settings/email/page.tsx` | `/settings/email` | Email / SMTP |
| `app/(dashboard)/settings/ai-providers/page.tsx` | `/settings/ai-providers` | AI provider management |
| `app/(dashboard)/settings/usage-limits/page.tsx` | `/settings/usage-limits` | Token budget limits |

## Components

- `SettingsNav` — left sub-nav with section groups
- `AIProviderCard` — provider name, status dot, capabilities badges
- `AddProviderDialog` — type picker + API key input
- `CapabilityDefaultsTable` — capability → provider mapping
- `UsageLimitMeter` — progress bar + remaining budget

## Definition of Done

- [ ] Settings hub with section nav
- [ ] General settings form
- [ ] Email settings + test send
- [ ] AI provider CRUD
- [ ] Capability defaults grid
- [ ] Usage limits with progress meters
- [ ] Skeleton + EmptyState
