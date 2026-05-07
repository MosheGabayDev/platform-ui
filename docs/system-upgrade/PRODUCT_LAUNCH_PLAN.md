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
| 6.01 | Pricing model: tiers, included caps, per-tenant token budget | PM | [ ] | Document before code |
| 6.02 | Marketing site (separate repo): landing, pricing, docs, blog | FE | [ ] | Out of scope for platform-ui |
| 6.03 | Stripe integration (subscriptions + metered usage) | BE | [ ] | |
| 6.04 | Stripe webhooks: invoice.paid / payment_failed / subscription.updated | BE | [ ] | |
| 6.05 | `/billing` page: current plan, invoices, payment method | FE | [ ] | Frontend uses stub today; needs Stripe customer portal embed |
| 6.06 | Plan-tier feature flag mapping → cap 17 FeatureFlags | FE+BE | [ ] | Plan up/downgrade triggers flag re-eval |
| 6.07 | Self-service signup flow: email → org create → first user | FE+BE | [ ] | |
| 6.08 | Email verification: magic link via SES/Postmark | BE | [ ] | |
| 6.09 | Onboarding email sequence (D0/D1/D7/D14) | Marketing | [ ] | |
| 6.10 | Trial → paid conversion flow + dunning emails | BE | [ ] | |
| 6.11 | Usage metering: tokens / API calls / seats per tenant | BE | [ ] | Feeds Stripe metered usage |
| 6.12 | Cap 19 PlatformTenantContext extension: plan tier + entitlements | FE+BE | [ ] | |
| 6.13 | In-product upgrade CTA when usage > 80% of plan budget | FE | [ ] | |
| 6.14 | Coupon / promo code handling | BE | [ ] | |

**§3 exit criteria:** end-to-end purchase test succeeds in Stripe test
mode; trial flow completes; first invoice generated correctly.

---

## §4 — Phase 7: Compliance & Legal

**Goal.** A B2B legal team can sign the contract.

| # | Task | Owner | Status | Notes |
|---|---|---|---|---|
| 7.01 | Terms of Service draft | Legal | [ ] | Vendor: SaaS attorney |
| 7.02 | Privacy Policy draft (covers AI data usage explicitly) | Legal | [ ] | |
| 7.03 | Data Processing Agreement (DPA) template | Legal | [ ] | EU customer requirement |
| 7.04 | Cookie consent banner (EU-compliant) | FE | [ ] | Use existing OSS lib |
| 7.05 | GDPR data export endpoint (`/api/me/export`) | BE | [ ] | Returns ZIP of all user data |
| 7.06 | GDPR data delete endpoint (Right to be Forgotten) | BE | [ ] | Cascades + audit log entry |
| 7.07 | SOC 2 Type I readiness assessment | Compliance | [ ] | 6-month track |
| 7.08 | Audit log retention policy (90/180/365 days per plan) | BE | [ ] | |
| 7.09 | PII data classification + encryption-at-rest review | BE+Sec | [ ] | |
| 7.10 | Security disclosure policy + `security@` mailbox | Sec | [ ] | |
| 7.11 | Penetration test report (rolls into SOC 2) | External | [ ] | |
| 7.12 | DPIA (Data Protection Impact Assessment) for AI features | Legal | [ ] | EU AI Act preparation |
| 7.13 | Subprocessor list page (OpenAI, Anthropic, AWS, Stripe, ...) | Legal+FE | [ ] | |

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
| 9.05 | Audit log export (CSV / SIEM webhook) | BE | [ ] | |
| 9.06 | IP allowlist per org | BE | [ ] | |
| 9.07 | SLA contract: uptime + support response times | Sales+Legal | [ ] | |
| 9.08 | Data residency choice (US / EU) | DevOps | [ ] | Multi-region deployment |
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
| 10.05 | Beta feedback → backlog conversion process | Product | [ ] | Linear / GitHub Issues |
| 10.06 | Customer support tooling (Intercom / Crisp / built-in) | Product | [ ] | |
| 10.07 | Documentation site: API reference + admin guide + AI agent guide | Tech writing | [ ] | |
| 10.08 | Self-service knowledge base populated | CS | [ ] | Cap 09 already has the surface |
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
