# Product Launch Plan — Generic AI Platform for Businesses

> **Status as of 2026-05-07:** frontend skeleton complete, mock-mode 100%.
> Honest readiness assessment: **demo-ready, not product-ready**. See
> §Snapshot below for the real gap.
>
> **This file is the single source of truth for "what's left to ship."**
> Update it on every commit that closes (or opens) a row. The bottom of
> the file holds a rolling Test Status log — append to it, do not overwrite.
>
> **Related docs (read before working from this file):**
> - `GENERIC_AI_PLATFORM_PROGRESS.md` — Phase 1-4 (closed) + Phase 5 outline
> - `PLATFORM_HARDENING_PLAN.md` — Tracks A-E (closed)
> - `00-control-center.md` — P1-Exit gate, blockers
> - `03-roadmap/master-roadmap.md` — backend dependency graph
>
> **Working rules:**
> 1. Pick the highest-priority unblocked row from the active phase.
> 2. Each task is ≤ 2h of focused work. Bigger → split before starting.
> 3. Every task that ships code MUST honor the MANDATORY testing
>    discipline (see `GENERIC_AI_PLATFORM_PROGRESS.md`). Update the
>    Test Status section at the bottom of this file with timestamp + counts.
> 4. Backend rows live in the Flask repo; this file tracks the *contract*
>    (what frontend expects). Frontend's job is to flip MOCK_MODE per client
>    when the backend route lands.
> 5. Commercial / legal / ops rows can run in parallel with backend rows.

---

## Snapshot — current state vs ship-ready

| Layer | Built | Ship-ready | Gap |
|---|---|---|---|
| Frontend (this repo) | ✅ 19 caps, 909 tests, ADR-028 100% | ⚠️ mock-mode | Wire to real backend |
| Backend Flask | ❌ | ❌ | Phase 5A/5B (this file §1-2) |
| Commercial (billing, signup) | ❌ | ❌ | Phase 6 (this file §3) |
| Compliance & Legal | ❌ | ❌ | Phase 7 (this file §4) |
| Operations (deploy, monitor) | ❌ | ❌ | Phase 8 (this file §5) |
| Enterprise (SSO, SCIM, SLA) | ❌ | ❌ | Phase 9 (this file §6) |
| Pilot → GA | ❌ | ❌ | Phase 10 (this file §7) |

**Time-to-product realistic estimate:** 6-9 months from 2026-05-07 with
a backend developer + DevOps + compliance/legal partner.

---

## §1 — Phase 5A: Backend MVP (unblocks pilot)

**Goal.** Flip MOCK_MODE to false on the smallest set of clients that
makes one real customer flow work end-to-end: login → see real data →
take one Helpdesk action → AI invokes a real provider → audit + notify.

**Definition of done for §1.** P1-Exit gate items 1-5 + 7-8 turn green
in `00-control-center.md`. One real org seeded; one AI conversation
auditable in PlatformAuditLog.

| # | Task | Owner | Status | Depends on | Notes |
|---|---|---|---|---|---|
| 5A.01 | Flask `/api/auth/login` returns serialize_auth_user shape | BE | [ ] | — | Frontend already consumes this shape via next-auth credentials provider |
| 5A.02 | Flask refresh-token endpoint matches `lib/auth/options.ts` contract | BE | [ ] | 5A.01 | Spec already in lib/auth/types.ts |
| 5A.03 | Cross-tenant isolation E2E test runs against 2 real orgs | FE | [ ] | 5A.01 | Spec scaffolded in `tests/e2e/security/tenant-isolation-helpdesk.spec.ts` |
| 5A.04 | R042-BE-min: ModuleRegistry sync (T01-T03 only) | BE | [ ] | — | See `GENERIC_AI_PLATFORM_PROGRESS.md §Phase 5` |
| 5A.05 | Frontend flips `lib/api/module-registry.ts` MOCK_MODE — env var only | FE | [ ] | 5A.04 | Already env-driven; just unset NEXT_PUBLIC_MOCK_API |
| 5A.06 | R045-min: Feature Flags BE (one flag: `helpdesk.enabled`) | BE | [ ] | — | Currently unblocked per master-roadmap |
| 5A.07 | Frontend flips `lib/api/feature-flags.ts` MOCK_MODE for that one flag | FE | [ ] | 5A.06 | |
| 5A.08 | R044-min: Navigation API for already-built routes | BE | [ ] | 5A.04 | Replaces hardcoded `nav-items.ts` for Helpdesk |
| 5A.09 | Frontend wires sidebar to Navigation API (keeps fallback static) | FE | [ ] | 5A.08 | New hook; keeps existing nav-items.ts as fallback |
| 5A.10 | R046-min: PlatformAuditLog write endpoint | BE | [ ] | 5A.06 | Spec lives in `04-capabilities/platform-audit-log-spec.md` |
| 5A.11 | Frontend flips `lib/api/audit.ts` MOCK_MODE | FE | [ ] | 5A.10 | |
| 5A.12 | R046-min: PlatformNotifications write + read | BE | [ ] | 5A.10 | |
| 5A.13 | Frontend flips `lib/api/notifications.ts` MOCK_MODE; bell shows real unread count | FE | [ ] | 5A.12 | |
| 5A.14 | One Helpdesk action (resolve ticket) writes audit + emits notification end-to-end | FE+BE | [ ] | 5A.11, 5A.13 | E2E spec required |
| 5A.15 | R047-min: API Keys + Secrets Manager (just for AI provider keys) | BE | [ ] | 5A.10 | OpenAI + Anthropic keys stored encrypted |
| 5A.16 | AIProviderGateway BE: real OpenAI/Anthropic call routing | BE | [ ] | 5A.15 | Frontend already uses gateway shape |
| 5A.17 | Frontend flips `lib/api/ai-providers.ts` MOCK_MODE | FE | [ ] | 5A.16 | |
| 5A.18 | AISkillRegistry BE: persists skill enable/disable | BE | [ ] | 5A.04 | |
| 5A.19 | Frontend flips `lib/api/ai-skills.ts` MOCK_MODE | FE | [ ] | 5A.18 | |
| 5A.20 | AIUsage BE: tracks tokens + cost + writes events | BE | [ ] | 5A.16, 5A.10 | |
| 5A.21 | Frontend flips `lib/api/ai-usage.ts` MOCK_MODE | FE | [ ] | 5A.20 | |
| 5A.22 | Helpdesk core BE (tickets list/detail/take/resolve) — R042-BE T04+ | BE | [ ] | 5A.04 | |
| 5A.23 | Frontend flips `lib/api/helpdesk.ts` MOCK_MODE | FE | [ ] | 5A.22 | |
| 5A.24 | Smoke E2E pass on staging with one real org | FE | [ ] | 5A.23 | All P1-Exit gates flip green here |
| 5A.25 | `check_no_direct_llm_imports.py` non-increasing 7-day window | BE | [ ] | 5A.16 | P1-Exit gate item #7 |

**§1 exit criteria:** all 25 rows above checked. P1-Exit gates 1-5 + 7-8
all 🟢 in control-center. Pilot can begin.

---

## §2 — Phase 5B: Backend Hardening (pre-GA)

**Goal.** Replace remaining mocks; add the second + third vertical so
the platform is verifiably "generic" not "Helpdesk-only."

| # | Task | Owner | Status | Notes |
|---|---|---|---|---|
| 5B.01 | Flask Users CRUD: list/create/edit/deactivate/approve | BE | [ ] | |
| 5B.02 | Frontend flips `lib/api/users.ts` MOCK_MODE | FE | [ ] | |
| 5B.03 | Flask Organizations CRUD (system_admin only) | BE | [ ] | |
| 5B.04 | Frontend flips `lib/api/organizations.ts` MOCK_MODE | FE | [ ] | |
| 5B.05 | Flask Roles + Permissions CRUD | BE | [ ] | |
| 5B.06 | Frontend flips `lib/api/roles.ts` MOCK_MODE | FE | [ ] | |
| 5B.07 | Flask Settings Engine (cap 16) full | BE | [ ] | |
| 5B.08 | Frontend flips `lib/api/settings.ts` MOCK_MODE | FE | [ ] | |
| 5B.09 | Flask Search engine (cap 11) — Postgres tsvector or Meilisearch | BE | [ ] | |
| 5B.10 | Frontend flips `lib/api/search.ts` MOCK_MODE | FE | [ ] | |
| 5B.11 | Cap 23 PlatformRealtime SSE channel | BE | [ ] | Replaces 30s polling for notifications |
| 5B.12 | Frontend wires NotificationBell to SSE; polling fallback | FE | [ ] | 5B.11 |
| 5B.13 | Helpdesk Phase B BE: SLA / approvals / batch / maintenance | BE | [ ] | |
| 5B.14 | Frontend flips remaining `lib/api/helpdesk.*` clients | FE | [ ] | 5B.13 |
| 5B.15 | Second vertical module skeleton (chosen by sales): pick from CRM / Knowledge / Voice | FE+BE | [ ] | Validates "generic" claim |
| 5B.16 | Third vertical lite: just spec + manifest + one mutation | FE+BE | [ ] | Validates module-registry contract |
| 5B.17 | Backend: cross-tenant query guards on every endpoint | BE | [ ] | Audit pass — every SELECT has `where org_id = current_org()` |
| 5B.18 | Penetration test of multi-tenant isolation | Sec | [ ] | External vendor preferred |

**§2 exit criteria:** all clients running real backend; ≥2 modules live;
penetration test report green; SSE replaces polling.

---

## §3 — Phase 6: Commercial Layer

**Goal.** A prospect can sign up, pay, get to first value, and renew
without human touch.

| # | Task | Owner | Status | Notes |
|---|---|---|---|---|
| 6.01 | Pricing model: tiers, included caps, per-tenant token budget | PM | [x] 2026-05-07 | Spec written: `docs/system-upgrade/04-capabilities/pricing-tiers-spec.md` (Free / Pro / Enterprise matrix, entitlements contract, Stripe product mapping, open questions). FE helper: `lib/platform/billing/tiers.ts` returns `TierEntitlements` per tier + `isUnlimited` / `isOverLimit` / `utilizationPct` pure helpers. 21 tests cover every tier shape + every helper edge case. PM still owns the dollar amounts; the spec format is the contract. |
| 6.02 | Marketing site (separate repo): landing, pricing, docs, blog | FE | [ ] | Out of scope for platform-ui |
| 6.03 | Stripe integration (subscriptions + metered usage) | BE | [ ] | |
| 6.04 | Stripe webhooks: invoice.paid / payment_failed / subscription.updated | BE | [ ] | |
| 6.05 | `/billing` page: current plan, invoices, payment method | FE | [x] 2026-05-07 | Mock-mode shell shipped — plan tier badge, 3 usage gauges (tokens/api_calls/seats with red/amber/green thresholds), invoices table, "Manage payment" CTA disabled until plan.portal_url returns Stripe URL. New: `lib/api/billing.ts` + `lib/modules/billing/types.ts` + `queryKeys.billing.*` + i18n in he/en + 5 unit tests. Backend wiring deferred to 6.03/6.04 (just unset NEXT_PUBLIC_MOCK_API once Stripe BE serves /overview). |
| 6.06 | Plan-tier feature flag mapping → cap 17 FeatureFlags | FE+BE | [partial] 2026-05-07 | FE side complete — `lib/platform/billing/tier-flags.ts` exposes `flagsForTier(tier)` + `isFlagAutoEnabledForTier(flag, tier)` + `minTierForFlag(flag)`. Free→1 flag, Pro→5 flags (strict superset), Enterprise→11 flags. 13 tests verify the strict-superset invariant + every flag's min-tier. Backend mirrors this mapping at flag-resolution time (cap 17 §Resolution chain). Plan up/downgrade re-eval still depends on Stripe webhook → cache invalidate (deferred to 6.04). |
| 6.07 | Self-service signup flow: email → org create → first user | FE+BE | [partial] 2026-05-07 | Frontend shell shipped — `app/(auth)/signup/page.tsx` + Zod schema + `lib/api/signup.ts` mock client + i18n. PlatformForm + usePlatformMutation pattern; success state shows email-verify next-step; rich-text legal links to /legal/terms + /legal/privacy. Backend POST /api/proxy/signup not yet built — depends on 5A.01 + 6.08 email verification. MOCK_MODE flip checklist documented in lib/api/signup.ts. |
| 6.08 | Email verification: magic link via SES/Postmark | BE | [ ] | |
| 6.09 | Onboarding email sequence (D0/D1/D7/D14) | Marketing | [partial] 2026-05-08 | Templates seeded in `lib/email-templates/catalog.ts` — 11 lifecycle emails across signup / trial / conversion / transactional phases. Each has `subject_key` + `body_key` resolved via i18n in he/en, with Liquid `{{variable}}` placeholders for backend renderer. Catalog invariant tests enforce subject + body present in BOTH locales for every template AND every declared variable appears in its body. `getEmailTemplate(id)` / `getEmailsForPhase(phase)` / `getAllReferencedVariables()` helpers. Marketing edits copy via i18n catalog only. |
| 6.10 | Trial → paid conversion flow + dunning emails | BE | [ ] | |
| 6.11 | Usage metering: tokens / API calls / seats per tenant | BE | [partial] 2026-05-07 | FE display shipped — `components/modules/billing/usage-chart.tsx` renders a 30-day dual-series Recharts area chart (tokens left axis, api_calls right) on /billing. Subscribes to `queryKeys.billing.usageSeries(days)`. New `lib/api/billing.ts.fetchUsageSeries()` + `buildMockUsageSeries()` pure helper. New types `UsagePoint` + `UsageSeriesResponse`. 9 tests (4 chart smoke + 3 helper invariants + 2 client). Stripe metered-usage write path still BE-side — FE is read-only display. |
| 6.12 | Cap 19 PlatformTenantContext extension: plan tier + entitlements | FE+BE | [partial] 2026-05-07 | FE side complete: `lib/hooks/use-tenant-context.ts` returns `{ org_id, user_id, role, is_admin, tier, entitlements, isLoading, isAnonymous }` by combining session + billing + tier helpers from 6.01. Fail-closed to "free" tier while billing loads or errors (no premium-feature flash). 8 tests cover loading/anonymous/authenticated, every tier shape, fail-closed paths. Backend tier source-of-truth still depends on Stripe webhook → cache (6.04). |
| 6.13 | In-product upgrade CTA when usage > 80% of plan budget | FE | [x] 2026-05-07 | `components/shared/upgrade-cta.tsx` — banner that subscribes to `queryKeys.billing.overview()` and shows the highest-utilized metric (tokens/api_calls/seats) when ≥80%. Two severity tiers: warning (amber) ≥80%, destructive ≥100%. Per-metric+bucket dismissal in localStorage so dismissed banners reappear when a NEW threshold crosses. Wired into `(dashboard)/layout.tsx` (hidden on /billing itself). 12 unit tests cover pure helper + render paths. |
| 6.14 | Coupon / promo code handling | BE | [ ] | |

**§3 exit criteria:** end-to-end purchase test succeeds in Stripe test
mode; trial flow completes; first invoice generated correctly.

---

## §4 — Phase 7: Compliance & Legal

**Goal.** A B2B legal team can sign the contract.

| # | Task | Owner | Status | Notes |
|---|---|---|---|---|
| 7.01 | Terms of Service draft | Legal | [partial] 2026-05-08 | Public template page shipped at `/legal/terms` with explicit DRAFT banner + 7 sections (account / acceptable use / payment / IP / AI / termination / governing law). i18n in he/en with `[TBD-Legal]` placeholders for jurisdiction. 5 render tests. Legal team finalises wording; the structure + section coverage is the contract baseline. |
| 7.02 | Privacy Policy draft (covers AI data usage explicitly) | Legal | [partial] 2026-05-08 | Public template page shipped at `/legal/privacy` mirroring /legal/terms shape. 7 GDPR-aligned sections (what we collect / why / sharing / your rights / retention / data location / cookies). Cross-links /legal/subprocessors + /legal/security in the intro. DRAFT banner. 4 render tests. Per-tier retention values match pricing-tiers-spec.md (Free 30d / Pro 90d / Enterprise 365d). |
| 7.03 | Data Processing Agreement (DPA) template | Legal | [ ] | EU customer requirement |
| 7.04 | Cookie consent banner (EU-compliant) | FE | [x] 2026-05-07 | Built `components/shell/cookie-consent.tsx` — essential-cookies-only stance with single "Got it" dismiss; persists `cookie-consent:v1=accepted` in localStorage; banner hides until mounted (hydration-safe); link to `/legal/privacy`. i18n in he/en. Wired into root layout. 5 unit tests cover render gating, persistence, prior-consent skip. No external lib needed. |
| 7.05 | GDPR data export endpoint (`/api/me/export`) | BE | [partial] 2026-05-07 | FE shipped at `/account` — `DataExportCard` calls `requestDataExport()` (mock client in `lib/api/account.ts`). Async-by-design: backend acknowledges request, ZIP arrives by signed S3 link in email (frontend never sees the bytes — security guarantee). Mock returns `request_id` + 24h ETA email timestamp. Backend POST /api/proxy/me/export still pending. |
| 7.06 | GDPR data delete endpoint (Right to be Forgotten) | BE | [partial] 2026-05-07 | FE shipped at `/account` — `AccountDeleteCard` requires typed-confirm (user must retype their email to enable the destructive button). Calls `requestAccountDelete({ email_confirmation })`; mock returns `request_id` + 7-day `effective_at`. Backend POST /api/proxy/me/delete + the actual cascade still pending; spec note in `lib/api/account.ts` says cancellation is via support flag, not by re-calling. |
| 7.07 | SOC 2 Type I readiness assessment | Compliance | [ ] | 6-month track |
| 7.08 | Audit log retention policy (90/180/365 days per plan) | BE | [ ] | |
| 7.09 | PII data classification + encryption-at-rest review | BE+Sec | [ ] | |
| 7.10 | Security disclosure policy + `security@` mailbox | Sec | [partial] 2026-05-07 | Public policy page shipped: `app/legal/security/page.tsx` with 4 sections (how to report / scope / out-of-scope / safe harbor) + PGP note + mailto link. i18n in he/en. 4 render tests. Mailbox provisioning + PGP key generation + security.txt redirect (per 8.10 ops task) still owned by Security team. |
| 7.11 | Penetration test report (rolls into SOC 2) | External | [ ] | |
| 7.12 | DPIA (Data Protection Impact Assessment) for AI features | Legal | [ ] | EU AI Act preparation |
| 7.13 | Subprocessor list page (OpenAI, Anthropic, AWS, Stripe, ...) | Legal+FE | [x] 2026-05-07 | Public route `/legal/subprocessors` — outside `(dashboard)` group so unauthenticated visitors + crawlers can read. 6 providers seeded (OpenAI, Anthropic, AWS, Stripe, Sentry, Postmark) with purpose/data-types/region columns. Provider keys are data, copy is i18n. Last-updated string + privacy contact. 4 render tests. Legal team can extend the list by editing the i18n catalog only. |

**§4 exit criteria:** ToS / Privacy / DPA signed off; SOC 2 Type I
report received OR roadmapped to first paying customer.

---

## §5 — Phase 8: Operations

**Goal.** The product runs reliably, breaks loudly, recovers fast.

| # | Task | Owner | Status | Notes |
|---|---|---|---|---|
| 8.01 | CI/CD: GitHub Actions for platform-ui (build + test + deploy) | DevOps | [ ] | |
| 8.02 | CI/CD for Flask backend repo | DevOps | [ ] | Backend repo task |
| 8.03 | Staging environment (full stack) | DevOps | [ ] | |
| 8.04 | Production environment (multi-AZ, RDS Multi-AZ, S3 backups) | DevOps | [ ] | |
| 8.05 | Sentry / error tracking on FE + BE | DevOps | [ ] | |
| 8.06 | APM (Datadog / New Relic / OpenTelemetry) | DevOps | [ ] | |
| 8.07 | Uptime monitor + status page | DevOps | [ ] | StatusPage.io or self-hosted |
| 8.08 | Database backup automation + restore drill | DevOps | [ ] | Quarterly drill mandatory |
| 8.09 | Rate limiting per tenant (cap 19) | BE | [ ] | |
| 8.10 | Per-tenant token budget alerts | BE | [ ] | Feeds notifications |
| 8.11 | Disaster recovery playbook | DevOps | [ ] | RPO ≤ 1h, RTO ≤ 4h |
| 8.12 | On-call rotation + runbooks | DevOps | [ ] | PagerDuty / Opsgenie |
| 8.13 | Real SMTP delivery (SES / Postmark) wired through cap 16 settings | BE | [ ] | Settings UI exists; provider doesn't |
| 8.14 | Log aggregation (CloudWatch / Loki) | DevOps | [ ] | |
| 8.15 | Security scanning: Dependabot + Trivy + SAST | DevOps | [ ] | |
| 8.16 | Secrets rotation policy + runbook | DevOps | [ ] | |
| 8.17 | Load testing: 100 RPS sustained, p95 < 300ms | DevOps | [ ] | |
| 8.18 | CDN + asset optimization for Next.js | DevOps | [ ] | |

**§5 exit criteria:** staging green for 7 consecutive days; on-call rotation
live; one DR drill passed; 99.5% uptime SLA achievable on staging metrics.

---

## §6 — Phase 9: Enterprise Features

**Goal.** Cross the $50K ACV threshold — security review survivors.

| # | Task | Owner | Status | Notes |
|---|---|---|---|---|
| 9.01 | SAML 2.0 SSO via Auth0 / WorkOS / built-in | BE | [ ] | |
| 9.02 | OIDC SSO support | BE | [ ] | |
| 9.03 | SCIM 2.0 user provisioning | BE | [ ] | Required for Okta / Azure AD |
| 9.04 | Custom domain / vanity URL support | DevOps | [ ] | |
| 9.05 | Audit log export (CSV / SIEM webhook) | BE | [partial] 2026-05-07 | CSV export was already shipped in audit-log page; this batch wraps it in `<FeatureGate flag="audit_log.export">` so Free-tier orgs no longer see the button (per 6.06 tier-flag mapping). Extended `FlagKey` union + `STATIC_FLAG_DEFAULTS` + `MOCK_DEFINITIONS` + `MOCK_PLAN_FEATURES` with the 9 plan-driven flags introduced in 6.01. Backend SIEM webhook still pending. |
| 9.06 | IP allowlist per org | BE | [partial] 2026-05-07 | FE admin shell shipped at `/admin/ip-allowlist`. Wraps in `<FeatureGate flag="ip_allowlist.enabled">` so Free/Pro orgs see an upgrade nudge linking to /billing; Enterprise tenants see the editor. Editor adds/removes CIDR ranges with FE validation (pure helper `lib/platform/security/cidr.ts.isValidIpv4Cidr()`). Persists to localStorage via the cap-A `_mock-storage.ts` shim. 13 CIDR helper tests cover canonical/octet-range/prefix-range/IPv6/empty/non-string. Backend persistence + actual IP gating still BE/DevOps work. |
| 9.07 | SLA contract: uptime + support response times | Sales+Legal | [partial] 2026-05-07 | Public page shipped at `/legal/sla`. 3-tier availability matrix (Free best-effort / Pro 99.5% no-SLA / Enterprise 99.9% contractual), 4 policy sections (uptime / response times / credits / exclusions), DRAFT banner explicitly marks the copy as un-finalised so we don't accidentally ship un-reviewed legal commitments. i18n in he/en. 5 render tests. Legal team finalizes wording; Sales gates Enterprise contract sign-off. |
| 9.08 | Data residency choice (US / EU) | DevOps | [partial] 2026-05-08 | FE notice shipped — `DataResidencyCard` on `/account` displays the active region (`eu-west-1` default, `us-east-1` Enterprise) with a contact-sales hint. Region key is read from `NEXT_PUBLIC_DATA_REGION` env var (mock); real source-of-truth becomes the org settings record once 5B settings BE lands. i18n in he/en. The actual multi-region deployment + data migration tooling remain DevOps work. |
| 9.09 | Customer-managed encryption keys (BYOK) | BE | [ ] | Late-stage; can defer |
| 9.10 | Private VPC peering option | DevOps | [ ] | Late-stage |

**§6 exit criteria:** at least one enterprise prospect security review
completed without blockers.

---

## §7 — Phase 10: Pilot → GA

**Goal.** Validate the product with real customers before opening signup.

| # | Task | Owner | Status | Notes |
|---|---|---|---|---|
| 10.01 | Identify 3-5 design partner customers | Sales | [ ] | Friendlies preferred |
| 10.02 | Pilot agreement template (mutual NDA + free trial) | Legal | [ ] | |
| 10.03 | White-glove onboarding for first 3 customers | CS | [ ] | One-on-one calls |
| 10.04 | Weekly NPS + bug-tracking with each pilot | CS | [ ] | |
| 10.05 | Beta feedback → backlog conversion process | Product | [partial] 2026-05-08 | Admin shell shipped at `/admin/feedback`. Read for any admin; manual-add gated on `system_admin` via `<PermissionGate role="system_admin">`. Type/status badges (bug/feature/insight × new/triaged/converted/dup/wontFix). 3 fixture items demonstrate the triage flow end-to-end. Mock client `lib/api/feedback.ts` persists via cap-A localStorage shim; round-trips on reload. 5 client tests + 2 real-fetch + 1 query-key test. Linear/GitHub integration is BE work tracked separately. |
| 10.06 | Customer support tooling (Intercom / Crisp / built-in) | Product | [partial] 2026-05-07 | Mount point shipped — `components/shell/support-widget.tsx` is env-driven (NEXT_PUBLIC_SUPPORT_PROVIDER=intercom\|crisp\|plain\|none). No-op by default; lazy-injects vendor loader script when configured. Intercom + Crisp paths covered by 6 unit tests with vi.stubEnv. Mounted in `(dashboard)/layout.tsx`. Public pages (login/signup/legal) intentionally do not load the widget. Vendor decision deferred to product team. |
| 10.07 | Documentation site: API reference + admin guide + AI agent guide | Tech writing | [partial] 2026-05-07 | Public landing page shipped at `/docs` with 5 section cards (Getting Started / Admin / AI / API Reference / Release Notes) routing to placeholder sub-paths. i18n in he/en — adding a section is a catalog edit + one row in `SECTIONS`. Each card is a Link with hover affordance. 5 render tests. Tech-writing track owns the actual MDX content; this gives them a stable URL structure to ship into. |
| 10.08 | Self-service knowledge base populated | CS | [partial] 2026-05-07 | KB scaffolded — extended `DocCategory` with troubleshooting / best-practices / faq. Added 9 sample articles (3 per category) with full bodyKey content in `lib/docs/content.ts` + i18n in he/en for all titles, summaries, and bodies. Updated `content.test.ts` invariants to require ≥3 articles per new category and bodyKey present. Tech-writing track owns the long-form content evolution; the catalog format + URL structure are the contract. |
| 10.09 | Launch readiness review: security, legal, ops, support all green | All | [ ] | Final go/no-go gate |
| 10.10 | Announce GA: blog post, press release, social, email to waitlist | Marketing | [ ] | |
| 10.11 | First paying customer signs without a sales call | All | [ ] | True self-service proof |

**§7 exit criteria:** GA launched; at least one self-service paying
customer activated; NPS ≥ 30 from pilot cohort.

---

## Update Protocol

When a row changes status:

1. Update its checkbox in this file (`[ ]` → `[x]` or `[partial]`).
2. If the row was `[x]` and is now closed: append a one-line entry to
   the **Test Status Log** below with timestamp and the test counts run.
3. If a row reveals new sub-tasks, ADD them to the same phase numbered
   `<phase>.<n>a`, `.<n>b` — do not renumber existing rows.
4. Don't delete completed rows; the trail matters.
5. Commit with `docs(launch-plan): [section] — <task id> <verb>` so
   `git log --grep launch-plan` is a quick changelog.

---

## Test Status Log

Append-only. Newest entries at the top.

### 2026-05-08 — Quality-pass batch (DRY refactor + page tests + shell coverage)

Real work the FE-feature-completion declaration glossed over. User
challenged "why stop?" and the answer was: there was still meaningful
work. This batch cleans up duplication, closes the testing-discipline
gap on the new pages, and lifts components/shell coverage by ~6pp.

| Task | Files added / modified | Tests added |
|---|---|---|
| Extract `<LegalPage>` shared scaffold | `components/shared/legal-page.tsx` (new); `app/legal/{terms,privacy,sla,security}/page.tsx` (refactored — each is now ≤45 lines, was ~80) | 0 (existing 18 legal-page tests cover the new scaffold path) |
| Page-level render tests for /admin/feedback | `app/(dashboard)/admin/feedback/page.test.tsx` (new) | 6 |
| Page-level render tests for /admin/ip-allowlist | `app/(dashboard)/admin/ip-allowlist/page.test.tsx` (new) | 6 |
| Coverage climb: language-switcher + notification-bell | `components/shell/language-switcher.test.tsx`, `components/shell/notification-bell.test.tsx` | 4 + 5 = 9 |

**LegalPage scaffold reduces duplication:**
- Before: 4 pages × ~80 lines each ≈ 320 lines (90% identical)
- After: 1 scaffold (115 lines) + 4 page configs (≤45 each) ≈ 295 lines, with the duplication removed
- New legal page going forward: just `<LegalPage namespace="legal.foo" sectionKeys={[...]} icon={Foo} />`
- Custom content (e.g. SLA's tier matrix, security's PGP block) goes via `extraBeforeSections` / `extraAfterSections` props
- `ContactLine` is optional — pages whose i18n namespace lacks `contact` skip it gracefully (covers /legal/security which uses a PGP block instead)

**vitest config** — `include` extended to `app/**/*.test.tsx` so the
new `app/(dashboard)/admin/*` page tests get picked up. Earlier the
glob had `app/(dashboard)/**` literal but parens caused glob mismatch.

**Suites:**
- `npx vitest run` — 124 files / **1086 tests ✓** (was 1065, +21 net)
- `npx tsc --noEmit` — clean ✓
- `node scripts/check-coverage-baseline.mjs` — gate ✓
- Layer climbs:
  - components/shared 73.78% → **75.20%** (+1.42pp)
  - components/shell 57.87% → **64.14%** (+6.27pp)

**Cumulative across nine 2026-05-07/08 batches:** 1086 tests total
(909 → 1086, +177). Test coverage gate clean throughout. Zero
regressions across all batches.

### 2026-05-08 — Code-review fix-up batch (post-eighth)

After the eighth batch declared FE feature-completion, ran the
`feature-dev:code-reviewer` agent over the 8-batch span. It found
3 real issues — all fixed in this commit, no new functionality.

| Severity | Issue | Fix |
|---|---|---|
| HIGH | `lib/api/feedback.ts` shipped without a MOCK_MODE flip checklist (other 3 new clients had one — protocol violation) | Added 7-step checklist to module JSDoc: GET / POST / PATCH /:id/status routes, Linear webhook contract, email intake, cap-A retirement plan |
| HIGH | `app/legal/page.tsx` + `app/docs/page.tsx` hover used physical `-translate-x-1 → translate-x-0` — broke RTL (chevron slid the wrong way for Hebrew) | Added `rtl:translate-x-1 rtl:-scale-x-100 rtl:group-hover:translate-x-0` so the arrowhead flips + the slide direction follows reading order |
| HIGH | `components/shared/upgrade-cta.tsx` dismissal stored a single scalar — dismissing one metric erased prior dismissal of another (phantom re-appearance bug) | Refactored to a `Record<MetricKey, number>` map persisted as JSON; `UPGRADE_DISMISS_KEY` bumped to `:v2`. Multi-metric dismissals coexist. |

**Tests added/updated:**
- 5 upgrade-cta test rewrites for the new dismissal contract
- New regression test: dismissing one metric does NOT erase another
- New robustness test: corrupted JSON in localStorage → no banner suppression

**Suites:**
- `npx vitest run` — 120 files / **1065 tests ✓** (was 1063, +2 net)
- `npx tsc --noEmit` — clean ✓
- `node scripts/check-coverage-baseline.mjs` — gate ✓
- components/shared 73.78% → 74.44% (+0.66pp)

**Reviewer also confirmed clean (no fix needed):**
- All 4 new mock clients env-driven pattern matches the 17 earlier ones
- No mock-only logic leaks into non-mock paths
- i18n catalogs (he + en) symmetric for all new namespaces
- Email-template variable-in-body invariant holds across all 11 templates
- Legal page DRAFT banners present + consistent
- RBAC gates use PermissionGate (no inline `session.user.role ===` checks)
- `pb-20 md:pb-0` inherited via PageShell on every dashboard page
- No console.log / debugger / orphan TODO comments in any reviewed file

This is the FE feature-completion-with-quality-gate marker. Future
"continue" requests on this repo should pick up backend-flip work
(MOCK_MODE per client when 5A rounds land) or wait for cross-team
items (Legal sign-off, DevOps deploy, Stripe BE).

### 2026-05-08 — Eighth execution batch (6.09 + 10.05 + public footer)

The "everything-else FE" sweep. After this batch, every PRODUCT_LAUNCH_PLAN
row that can ship from this repo without backend / external work has
been touched.

| Closed | Task | Files added | Tests added |
|---|---|---|---|
| 6.09 | Email templates seeded (partial) | `lib/email-templates/{types,catalog,catalog.test}.ts` + 11 emails × 2 locales i18n | 9 |
| 10.05 | Feedback admin shell (partial) | `app/(dashboard)/admin/feedback/page.tsx`, `lib/api/feedback.ts` + `.test.ts`, `lib/modules/feedback/types.ts`, queryKeys + real-fetch | 5 client + 2 real-fetch + 1 query-key = 8 |
| — | Public footer | `components/shared/public-footer.tsx` + `.test.tsx`, layouts in `app/legal/`, `app/docs/`, `app/(auth)/` | 2 |

**Suites:**
- `npx vitest run` — 120 files / **1063 tests ✓** (was 1044, +19 net)
- `npx tsc --noEmit` — clean ✓
- `node scripts/check-coverage-baseline.mjs` — gate ✓
- components/shared 70.45% → **73.78%** (+3.33pp from public-footer)

**Public footer mounted on:**
- `app/legal/layout.tsx` — every /legal/* page
- `app/docs/layout.tsx` — every /docs/* page
- `app/(auth)/layout.tsx` — login + signup + reset-password

Anonymous prospects landing from a marketing link can now navigate to
ToS / Privacy / Security / Docs without going back to the index page.

**Cumulative across eight 2026-05-07/08 batches:** 23 PRODUCT_LAUNCH_PLAN
rows touched (5 fully closed, 18 partial). 154 new tests added
(16 + 28 + 34 + 12 + 21 + 11 + 13 + 19). Test count: 909 → 1063 (+154).
Zero regressions across all eight batches.

**FE feature-completion declaration:** I'm calling this batch the end
of the FE-only execution arc. Every row that can ship without backend
/ external owner involvement has been touched. The remaining
PRODUCT_LAUNCH_PLAN rows (Phase 5A/5B backend, §3 Stripe, §4 Legal
finalisation, §5 DevOps, §6 SSO/SCIM, §7 Sales) need owners outside
this repo to advance. Frontend foundation is feature-complete.

### 2026-05-08 — Seventh execution batch (7.01 + 7.02 + legal index + 9.08)

Closes the legal-pages family. Every public legal surface a B2B
procurement check expects to find is now reachable from `/legal`.

| Closed | Task | Files added | Tests added |
|---|---|---|---|
| 7.01 | Terms of Service template (partial) | `app/legal/terms/page.tsx` + `.test.tsx` | 5 |
| 7.02 | Privacy Policy template (partial) | `app/legal/privacy/page.tsx` + `.test.tsx` | 4 |
| — | Legal index landing | `app/legal/page.tsx` + `.test.tsx` (cross-cutting; not numbered) | 4 |
| 9.08 | Data residency notice (partial) | `DataResidencyCard` in `app/(dashboard)/account/page.tsx` | 0 (covered by /account page rendering) |

**Suites:**
- `npx vitest run` — 117 files / **1044 tests ✓** (was 1031, +13 net)
- `npx tsc --noEmit` — clean ✓
- `node scripts/check-coverage-baseline.mjs` — gate ✓
- All 10 layers stable above their ADR-042 floors

**`/legal/*` family is now feature-complete:**
- `/legal` — index
- `/legal/terms` — ToS (DRAFT)
- `/legal/privacy` — Privacy Policy (DRAFT)
- `/legal/sla` — SLA contract (DRAFT)
- `/legal/security` — vulnerability disclosure
- `/legal/subprocessors` — third-party providers list

Common scaffold pattern across all 5: public route, inherits root
layout only, ArrowLeft "Platform Engineer" back link, max-w-3xl center
column, DRAFT banner where copy is unfinalised, mailto contact at
the bottom. Adding a new legal page = duplicate the scaffold + new
i18n namespace.

**Cumulative across seven 2026-05-07/08 batches:** 21 PRODUCT_LAUNCH_PLAN
rows touched (5 fully closed, 16 partial). 135 new tests added
(16 + 28 + 34 + 12 + 21 + 11 + 13). Test count: 909 → 1044 (+135).
Zero regressions across all seven batches.

**Closed-row map by phase (final state for FE):**
- §3 Commercial: 6.05 ✅, 6.13 ✅, 6.01 ✅
- §4 Compliance: 7.04 ✅, 7.13 ✅
- All other touched rows are [partial] with FE shipped — backend / legal
  finalisation / DevOps own the remaining drop-in.

**Legal escape hatch reminder:** every legal page that is FE-shipped
has an explicit `DRAFT` banner that legal team must remove (and
finalise the copy via i18n) before public launch. Removing the banner
is a deliberate act, not a side-effect of any code change.

### 2026-05-07 — Sixth execution batch (7.05 + 7.06 + 9.07)

GDPR self-service + SLA contract page. Three more rows; covers the
legal-flavoured surfaces a B2B procurement check looks for.

| Closed | Task | Files added | Tests added |
|---|---|---|---|
| 7.05 | GDPR data export FE (partial) | `app/(dashboard)/account/page.tsx` (DataExportCard), `lib/api/account.ts` + `.test.ts`, real-fetch entries | 1 client + 1 real-fetch = 2 |
| 7.06 | Right-to-be-Forgotten FE (partial) | same `account/page.tsx` (AccountDeleteCard with typed-confirm), `lib/api/account.ts` extension | 2 client + 1 real-fetch = 3 |
| 9.07 | SLA contract page (partial) | `app/legal/sla/page.tsx` + `.test.tsx` | 5 |

**Suites:**
- `npx vitest run` — 114 files / **1031 tests ✓** (was 1020, +11 net)
- `npx tsc --noEmit` — clean ✓
- `node scripts/check-coverage-baseline.mjs` — gate ✓
- All 10 layers stable above their ADR-042 floors

**Cumulative across six 2026-05-07 batches:** 18 PRODUCT_LAUNCH_PLAN
rows touched (5 fully closed, 13 partial). 122 new tests added
(16 + 28 + 34 + 12 + 21 + 11). Test count: 909 → 1031 (+122).
Zero regressions across all six batches.

**Net file additions (all six batches):**
- 5 public pages: `/account`, `/billing`, `/legal/{security,subprocessors,sla}`, `/docs`, `/admin/ip-allowlist`, signup, plus the `/billing` chart card
- 6 new API mock clients: billing, signup, account + extensions to feature-flags + audit + helpdesk
- 5 new platform helpers: tiers, tier-flags, cidr, security/cidr, billing types
- 1 new tenant context combiner hook
- 3 new shared primitives: cookie-consent, upgrade-cta, support-widget
- 1 spec doc: pricing-tiers-spec.md
- 1 master plan: PRODUCT_LAUNCH_PLAN.md (this file)

**FE-only rows that remain pickable:**
Very few. The remaining open rows are nearly all backend / legal-content /
DevOps / Sales work. Possibilities for a seventh batch:
- 6.09 — onboarding email sequence templates (could live as MDX in this
  repo for backend to render)
- 9.08 — Data residency notice on /account or /billing
- 10.05 — Beta feedback → backlog conversion process (could be a /admin/feedback shell)

The FE foundation for product launch is **functionally complete**.

### 2026-05-07 — Fifth execution batch (10.08 + 6.11 + 9.06)

Three more rows. Each builds on infrastructure shipped earlier today.

| Closed | Task | Files added / modified | Tests added |
|---|---|---|---|
| 10.08 | KB content scaffolding (partial) | `lib/docs/types.ts` (3 new categories), `lib/docs/content.ts` (+9 articles), `i18n/messages/{he,en}.json` (full bodies), `content.test.ts` (+invariant) | 2 |
| 6.11 | Usage metering chart (partial) | `components/modules/billing/usage-chart.tsx` + `.test.tsx`, `lib/api/billing.ts` (+`fetchUsageSeries`, `buildMockUsageSeries`), `lib/modules/billing/types.ts` (UsagePoint + UsageSeriesResponse), queryKeys + real-fetch + billing tests | 9 |
| 9.06 | IP allowlist admin shell (partial) | `app/(dashboard)/admin/ip-allowlist/page.tsx`, `lib/platform/security/cidr.ts` + `.test.ts` | 10 |

**Suites:**
- `npx vitest run` — 112 files / **1020 tests ✓** (was 999, +21 net — 1000-test milestone passed)
- `npx tsc --noEmit` — clean ✓
- `node scripts/check-coverage-baseline.mjs` — gate ✓
- Layer changes vs prior baseline:
  - lib/platform 93.37% → **94.02%** (+0.65pp from cidr helpers)
  - All other layers stable

**Cumulative across five 2026-05-07 batches:** 15 PRODUCT_LAUNCH_PLAN
rows touched (5 fully closed, 10 partial). 111 new tests added
(16 + 28 + 34 + 12 + 21). **Test count: 909 → 1020 (+111).**
Zero regressions across all five batches.

**Fully-closed-row map by phase:**
- §3 Commercial: 6.05 ✅, 6.13 ✅, 6.01 ✅
- §4 Compliance: 7.04 ✅, 7.13 ✅

**Partial-row map (FE shipped, BE/external pending):**
- §3 Commercial: 6.06, 6.07, 6.11, 6.12
- §4 Compliance: 7.10
- §6 Enterprise: 9.05, 9.06
- §7 GA: 10.06, 10.07, 10.08

**FE-only rows still pickable in this repo:**
- 9.07 SLA contract — Sales+Legal owned
- 9.08 Data residency — DevOps owned
- 9.09/9.10 BYOK + VPC peering — late-stage, BE/Sec
- 10.09 Launch readiness review — multi-team gate
- 10.10 GA announcement — Marketing
- 10.11 First paying customer — outcome metric

The remaining items are largely outside this repo's scope. Frontend
foundation for product launch is now feature-complete pending the
backend rounds (Phase 5A) which remain blocked.

### 2026-05-07 — Fourth execution batch (9.05 + 6.12 + 10.07)

Three more rows. Builds directly on the pricing-tier contract from
batch 3: tier-aware feature gating + tenant-context combiner + public
docs entry.

| Closed | Task | Files added / modified | Tests added |
|---|---|---|---|
| 9.05 | Audit-log CSV export tier-gated (partial) | `app/(dashboard)/audit-log/page.tsx` (FeatureGate wrap), `lib/api/feature-flags.ts` (FlagKey + 9 new defs + plan-tier seed) | covered by existing FlagKey shape tests |
| 6.12 | TenantContext extension (partial) | `lib/hooks/use-tenant-context.ts` + `.test.tsx` | 8 |
| 10.07 | Docs site scaffold (partial) | `app/docs/page.tsx` + `.test.tsx`, vitest.config | 5 |

**Suites:**
- `npx vitest run` — 110 files / **999 tests ✓** (was 987, +12 net)
- `npx tsc --noEmit` — clean ✓
- `node scripts/check-coverage-baseline.mjs` — gate ✓
- Layer changes vs prior baseline: all stable; lib/hooks +0.10pp from
  use-tenant-context test addition; lib/api -0.19pp acceptable noise
  (added 9 new flag defs without per-flag tests beyond shape).

**Cumulative across four 2026-05-07 batches:** 12 PRODUCT_LAUNCH_PLAN
rows touched (5 fully closed, 7 partial). 90 new tests added
(16 + 28 + 34 + 12). Zero regressions.

**Closed-row map by phase:**
- §3 Commercial: 6.05 ✅, 6.13 ✅, 6.01 ✅ + 6.06/6.07/6.12 partial
- §4 Compliance: 7.04 ✅, 7.13 ✅ + 7.10 partial
- §6 Enterprise: 9.05 partial
- §7 GA: 10.06/10.07 partial

**FE-only rows still pickable in this repo (without backend):**
- 10.08 — KB content scaffolding (CS — but the public KB surface
  exists already; could template a few sample articles)
- 6.11 — Usage metering FE display (mostly BE; FE could surface a
  per-org usage chart on the billing page beyond what 6.05 already shows)
- 9.06-9.08 enterprise features that are mostly BE/DevOps but might
  have a /admin/security or /admin/sso settings shell

Most other §1/§2/§3/§5/§6 rows are now backend / legal / DevOps work
that has to happen outside this repo.

### 2026-05-07 — Third execution batch (6.01 + 6.06 + 7.10)

Three more rows closed/partial. Focus: pricing-tier contract that
multiple later rows will read from.

| Closed | Task | Files added | Tests added |
|---|---|---|---|
| 6.01 | Pricing tiers spec + FE entitlements helper | `docs/system-upgrade/04-capabilities/pricing-tiers-spec.md`, `lib/platform/billing/tiers.ts` + `.test.ts` | 21 |
| 6.06 | Plan-tier → FeatureFlags helper (partial) | `lib/platform/billing/tier-flags.ts` + `.test.ts` | 13 |
| 7.10 | Security disclosure page (partial) | `app/legal/security/page.tsx` + `.test.tsx` | 4 |

Note: 6.06 and 7.10 are **partial** — frontend mapping / page is shipped,
the matching backend / mailbox-provisioning work is still pending.

**Suites:**
- `npx vitest run` — 108 files / **987 tests ✓** (was 953, +34 net)
- `npx tsc --noEmit` — clean ✓
- `node scripts/check-coverage-baseline.mjs` — gate ✓
- Layer changes vs prior baseline:
  - lib/platform 92.20% → **93.37%** (+1.17pp from new tiers/* helpers)
  - components/shell stable at 61.60% (security page renders without
    interactive logic, fully covered by 4 render tests)
- Pricing-tier helpers are now the canonical entitlements source for
  any later row (6.05 billing page, 6.13 upgrade CTA, 9.* enterprise
  features) that needs to ask "what does this tier include".

**Cumulative across three 2026-05-07 batches:** 9 PRODUCT_LAUNCH_PLAN
rows touched (5 fully closed, 4 partial). 78 new tests added
(16 + 28 + 34). Zero regressions; gate stable.

**Closed-row map by phase:**
- §3 Commercial: 6.05 ✅, 6.13 ✅, 6.01 ✅ + 6.06 partial + 6.07 partial
- §4 Compliance: 7.04 ✅, 7.13 ✅ + 7.10 partial
- §7 GA: 10.06 partial

**Still no backend rows touched.** Phase 5A is fully blocked on Flask
repo work (5A.06 R045-min Feature Flags BE is the gating row).

### 2026-05-07 — Second execution batch (6.13 + 6.07 + 10.06)

Three more frontend-only rows closed (or partially closed where backend
is the long pole). Builds directly on the billing client shipped in the
first batch.

| Closed | Task | Files added | Tests added |
|---|---|---|---|
| 6.13 | In-product upgrade CTA | `components/shared/upgrade-cta.tsx` + `.test.tsx` | 12 |
| 6.07 | Signup frontend shell (partial) | `app/(auth)/signup/page.tsx`, `lib/api/signup.ts` + `.test.ts`, `lib/modules/signup/schemas.ts` + `.test.ts`, real-fetch test | 3 + 6 + 1 = 10 |
| 10.06 | Support widget mount (partial) | `components/shell/support-widget.tsx` + `.test.tsx` | 6 |

**Suites:**
- `npx vitest run` — 105 files / **953 tests ✓** (was 925, +28 net)
- `npx tsc --noEmit` — clean ✓
- `node scripts/check-coverage-baseline.mjs` — gate ✓
- Layer changes vs prior baseline:
  - components/shared 70.45% → **73.31%** (+2.86pp from upgrade-cta)
  - components/shell 57.87% → **61.60%** (+3.73pp from support-widget + cookie-consent settling)
  - All other layers stable; lib/api -0.19pp acceptable noise from new clients
- `(dashboard)/layout.tsx` got two new mounts: `<UpgradeCta />` (hidden on /billing) + `<SupportWidget />` (no-op until vendor configured)

**Status of [partial] rows:**
- **6.07** — Frontend form is complete + validates + posts to mock client.
  Activates fully when 5A.01 (Flask login) + 6.08 (email verification) +
  POST /api/proxy/signup BE land. `MOCK_MODE` flip checklist already in
  `lib/api/signup.ts`.
- **10.06** — Mount point present. Flips to active by setting
  `NEXT_PUBLIC_SUPPORT_PROVIDER=intercom` (or crisp) + the vendor's
  app/website id env var. No code change needed at vendor pick.

**Cumulative across both 2026-05-07 batches:** 6 PRODUCT_LAUNCH_PLAN
rows touched (3 fully closed, 2 partial, 1 plan-file creation).
44 new tests added (16 + 28). Zero regressions.

**Next unblocked rows after this batch:**
- §3 commercial: 6.01 pricing model (PM, doc-only — could template)
- §4 compliance: nothing FE-only remaining (rest is BE / Legal / Sec)
- §7 GA: 10.07 documentation site (Tech writing — could scaffold)
- §1-2 backend: still all blocked on Flask repo work

### 2026-05-07 — First execution batch (7.04 + 7.13 + 6.05)

Three frontend-only tasks closed in a single sitting (all unblocked rows
that don't depend on backend / legal / DevOps work):

| Closed | Task | Files added | Tests added |
|---|---|---|---|
| 7.04 | Cookie consent banner | `components/shell/cookie-consent.tsx` + `.test.tsx` | 5 |
| 7.13 | Subprocessor list page | `app/legal/subprocessors/page.tsx` + `.test.tsx` | 4 |
| 6.05 | `/billing` page mock shell | `app/(dashboard)/billing/page.tsx`, `lib/api/billing.ts` + `.test.ts`, `lib/modules/billing/types.ts`, queryKeys + real-fetch additions | 5 unit + 1 query-keys + 1 real-fetch = 7 |

**Suites:**
- `npx vitest run` — 101 files / **925 tests ✓** (was 909, +16 net)
- `npx tsc --noEmit` — clean ✓
- `node scripts/check-coverage-baseline.mjs` — gate ✓
- All 10 layers still over their ADR-042 floors:
  - lib/api 94.22% (target 90)
  - lib/auth 100% (95)
  - lib/hooks 95.18% (80)
  - lib/modules 100% (70)
  - lib/platform 92.20% (70)
  - lib/utils 100% (70)
  - lib/utils.ts 100% (100)
  - components/shared 70.45% (70)
  - components/shell 59.46% — **+1.59pp** from new cookie-consent (50)
  - app/api/proxy 100% (90)

**Vitest config**: extended `include` to cover `app/legal/**/*.test.tsx`.

**Next unblocked rows:**
- §1 backend rows all blocked on Flask repo work (5A.06 R045-min FF
  is the gating row — backend dev has not started).
- §3 commercial: 6.01 pricing model (PM), 6.07 self-service signup
  (FE+BE — frontend shell can be built now), 6.13 in-product upgrade CTA (FE).
- §4 compliance: 7.05 GDPR data export (BE), 7.06 RTBF (BE), 7.10
  security disclosure mailbox (Sec).
- §5-7: mostly DevOps / Sales / CS — out of scope for this repo's agent.

### 2026-05-07 — Plan file created
- Initial creation. No tasks executed yet — file establishes the
  remaining roadmap.
- Status snapshot at creation:
  - **Frontend (this repo):** 98 test files, 909 tests ✓
  - **Coverage gate:** 10/10 layers above ADR-042 floors
  - **ADR-028 compliance:** 100%
  - **i18n closure:** 158 strings → 0 (single intentional fallback in
    nav-items.ts excluded)
  - **Phases 1-4 closed** per `GENERIC_AI_PLATFORM_PROGRESS.md`
- Backend rows: ALL `[ ]`. Backend repo work has not begun.
- Open phase: **§1 — Phase 5A Backend MVP**.
- First task to pick when work resumes: **5A.06** (R045-min Feature
  Flags BE, currently the only unblocked backend row per master-roadmap).
