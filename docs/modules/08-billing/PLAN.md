# Module 08 — Billing

**Priority:** 🟠 High | **Est:** 2 days | **Depends on:** Users (01), Organizations (02)

## Flask Endpoints

Blueprint prefix: `/api/billing`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/billing/balance` | Current balance + credits |
| GET | `/api/billing/history` | Transaction history |
| GET | `/api/billing/dashboard` | Dashboard charts data |
| GET | `/api/billing/summary` | Monthly summary |
| GET | `/api/billing/usage` | Usage breakdown by module |
| GET | `/api/billing/rates` | AI model pricing rates |
| PUT | `/api/billing/rates` | Update rates (admin) |
| GET | `/api/billing/pending-count` | Unprocessed billing events |
| GET | `/api/billing/call/<session_id>` | Per-call cost breakdown |
| GET | `/api/billing/storage/status` | Storage billing status |

## Proxy Mapping (add to `app/api/proxy/[...path]/route.ts`)

```
"billing": "/api/billing"
```

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface BillingBalance {
  balance_cents: number;
  credits_cents: number;
  currency: string;
  last_updated: string;
}

export interface BillingTransaction {
  id: number;
  type: "charge" | "credit" | "refund";
  amount_cents: number;
  description: string;
  created_at: string;
  module?: string;
}

export interface BillingDashboard {
  monthly_spend: Array<{ month: string; amount_cents: number }>;
  spend_by_module: Record<string, number>;
  top_sessions: Array<{ session_id: string; cost_cents: number }>;
}

export interface BillingRate {
  model: string;
  capability: string;
  input_per_1k_cents: number;
  output_per_1k_cents: number;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
billing: {
  balance: ["billing", "balance"] as const,
  history: (page: number) => ["billing", "history", page] as const,
  dashboard: ["billing", "dashboard"] as const,
  usage: (period?: string) => ["billing", "usage", period] as const,
  rates: ["billing", "rates"] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/billing/page.tsx` | `/billing` | Balance + spend charts |
| `app/(dashboard)/billing/history/page.tsx` | `/billing/history` | Transaction history |
| `app/(dashboard)/billing/usage/page.tsx` | `/billing/usage` | Usage by module |
| `app/(dashboard)/billing/rates/page.tsx` | `/billing/rates` | Rate management |

## Components

- `BalanceCard` — large balance display + credit balance
- `SpendChart` — monthly area chart (Recharts)
- `ModuleBreakdownChart` — donut or bar chart spend by module
- `TransactionTable` — DataTable with type badge, amount formatted
- `RateTable` — editable rates grid (admin only)

## Definition of Done

- [ ] Balance card on main page
- [ ] Spend chart (monthly trend)
- [ ] Module breakdown chart
- [ ] Transaction history with pagination
- [ ] Usage breakdown table
- [ ] Rate management (admin)
- [ ] Skeleton + EmptyState
