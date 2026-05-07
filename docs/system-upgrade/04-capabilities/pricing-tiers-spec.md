# Pricing Tiers — Capability Specification

> Spec for §3 task 6.01 of `PRODUCT_LAUNCH_PLAN.md`.
> Source of truth for **what each plan tier includes** — read by the
> frontend (`lib/platform/billing/tiers.ts`), the backend (TBD), and
> Stripe product configuration. **Pricing dollars are illustrative**
> and subject to PM finalisation; structure of the entitlements is
> the contract.

## Tiers

| Tier | Monthly USD | Audience | Key boundary |
|---|---|---|---|
| **Free** | $0 | Self-evaluation, hobbyists | Single org, 1 seat, 100k tokens/mo |
| **Pro** | $99 | Small teams, design-partner pilots | 25 seats, 5M tokens/mo, all caps |
| **Enterprise** | Custom (sales) | ≥50 seats, regulated industries | Unlimited usage envelope, SSO, SLA, BYOK |

## Entitlements per tier

The shape below is the **canonical entitlements contract**.
`lib/platform/billing/tiers.ts` returns this exact shape per tier.

```ts
interface TierEntitlements {
  monthly_usd: number | "custom";
  limits: {
    seats: number;             // -1 = unlimited
    tokens_per_month: number;  // LLM tokens (input + output combined)
    api_calls_per_month: number;
    orgs: number;              // 1 for free/pro; -1 for ent
    audit_log_retention_days: number;
  };
  features: {
    sso_saml: boolean;
    sso_oidc: boolean;
    scim: boolean;
    custom_domain: boolean;
    byok: boolean;            // bring-your-own LLM keys
    sla_uptime_99_9: boolean;
    audit_log_export: boolean;
    ip_allowlist: boolean;
    priority_support: boolean;
  };
  flags: string[];            // FeatureFlag keys auto-enabled at this tier
}
```

## Tier matrix

| Entitlement | Free | Pro | Enterprise |
|---|---|---|---|
| Monthly price (USD) | 0 | 99 | "custom" |
| Seats | 1 | 25 | unlimited (-1) |
| Tokens / month | 100,000 | 5,000,000 | unlimited (-1) |
| API calls / month | 1,000 | 100,000 | unlimited (-1) |
| Orgs (multi-tenant) | 1 | 1 | unlimited (-1) |
| Audit log retention | 30 days | 90 days | 365 days |
| SSO (SAML/OIDC) | ❌ | ❌ | ✅ |
| SCIM provisioning | ❌ | ❌ | ✅ |
| Custom domain | ❌ | ❌ | ✅ |
| BYOK (LLM keys) | ❌ | ❌ | ✅ |
| 99.9% uptime SLA | ❌ | ❌ | ✅ |
| Audit log export | ❌ | ✅ | ✅ |
| IP allowlist | ❌ | ❌ | ✅ |
| Priority support | ❌ | ✅ | ✅ |

## Feature-flag mapping

Each tier auto-enables these `cap-17 PlatformFeatureFlags` keys (consumed
by `useFeatureFlag()` / `<FeatureGate />`):

- **Free**: `helpdesk.enabled`
- **Pro**: `helpdesk.enabled`, `audit_log.export`, `ai_agents.enabled`,
  `automation.enabled`, `priority_support.enabled`
- **Enterprise**: every Pro flag plus `sso.enabled`, `scim.enabled`,
  `custom_domain.enabled`, `byok.enabled`, `ip_allowlist.enabled`,
  `audit_log.long_retention`

This mapping is encoded in `lib/platform/billing/tier-flags.ts` (task 6.06)
so frontend can compute a tenant's full flag set without an extra round
trip when only the tier is known.

## Stripe product mapping

| Tier | Stripe product id | Recurring price id | Metered usage events |
|---|---|---|---|
| Free | `prod_free` (no charge) | — | — |
| Pro | `prod_pro` | `price_pro_99_monthly` | `tokens`, `api_calls` |
| Enterprise | (one product per contract) | (manual) | (manual reconciliation) |

Stripe wiring tracked separately in §3 tasks 6.03 + 6.04.

## Open questions (tracked in `08-decisions/open-questions.md`)

- **Annual billing discount** — 20% standard? Documented at sales-enablement time.
- **Trial length for Pro** — 14 days assumed; PM to confirm.
- **Seat overage behaviour** — block / warn / charge per seat? Default
  recommendation: warn at 100%, block at 110%, sales upsell email at 80%.
- **Token overage behaviour** — same recommendation.

## Updating this spec

1. Edit the matrix above.
2. Mirror the change in `lib/platform/billing/tiers.ts`.
3. Mirror the flag changes in `lib/platform/billing/tier-flags.ts`.
4. Update Stripe products via `stripe products update` (out of repo).
5. Add an entry to `08-decisions/decision-log.md` if entitlements
   changed for an existing tier (customer-impact).
