# 15 — Action Backlog

_Last updated: 2026-04-23_

---

## Now (Phase 0 — highest urgency)

| Task | Why It Matters | Dependencies | Status |
|------|---------------|--------------|--------|
| **Wire real auth in platform-ui** | Platform-ui is useless without real login. Everything downstream depends on this. | Flask login endpoint must be identified and tested | `[ ]` TODO |
| **Implement `/api/proxy/[...path]` route handler** | Dashboard API calls currently break — proxy route is a stub | Auth must be established first | `[ ]` TODO |
| **Verify dashboard stats work end-to-end** | The dashboard page fetches data but connection to real backend unverified | Proxy route working | `[ ]` TODO |
| **Add Next.js middleware for route guards** | Unauthenticated users can access dashboard routes | Auth session established | `[ ]` TODO |
| **Add error boundary to dashboard layout** | API failures currently may crash the page silently | — | `[ ]` TODO |
| **Answer Q1 (auth contract)** | Cannot build auth bridge without knowing Flask's auth response shape | — | `[ ]` TODO |
| **Answer Q4 (API paths)** | Confirm `/api/ai-settings/stats` and health endpoint paths are correct | TEST environment running | `[ ]` TODO |

---

## Next (Phase 1 — 2-8 weeks)

| Task | Why It Matters | Dependencies | Status |
|------|---------------|--------------|--------|
| Add `flask-smorest` to platformengineer + annotate top 10 endpoints | Enables TypeScript codegen | Phase 0 complete | `[ ]` TODO |
| Set up `openapi-typescript` codegen in platform-ui | Eliminates manual type drift | OpenAPI spec available | `[ ]` TODO |
| Implement standard API response envelope in Flask | Frontend gets consistent shapes | — | `[ ]` TODO |
| Set up Storybook in platform-ui | Design system documentation; component catalog | — | `[ ]` TODO |
| Move hardcoded Hebrew strings to `messages/he.json` | i18n correctness; required for full next-intl | — | `[ ]` TODO |
| Add Playwright smoke tests (login, dashboard, logout) | Any refactor without tests is dangerous | Auth working | `[ ]` TODO |
| Add Vitest for `lib/` utilities | Unit test coverage for API client, hooks | — | `[ ]` TODO |
| Add `nuqs` for URL search param state | Filter/pagination state survives navigation | — | `[ ]` TODO |
| Set up `import-linter` in platformengineer CI | Document module boundaries before they get worse | — | `[ ]` TODO |
| Structured logging (JSON formatter) in Flask | Incident debugging currently impossible | — | `[ ]` TODO |
| Delete dead code: `api_auth_OLD_BACKUP.py` + other clearly dead files | Reduces confusion | — | `[ ]` TODO |
| Answer open questions Q1-Q9 | Block on multiple Phase 1 tasks | — | `[ ]` TODO |

---

## Later (Phase 2-3 — 8+ weeks)

| Task | Why It Matters | Dependencies | Status |
|------|---------------|--------------|--------|
| Migrate User Management to platform-ui | First full domain migration — proves pattern | Phase 1 API contract | `[ ]` TODO |
| Migrate Helpdesk Sessions + Tickets to platform-ui | Core product — high value | User management migration as test | `[ ]` TODO |
| Implement SSE endpoint + useEventSource hook | Live investigation status | Helpdesk migration | `[ ]` TODO |
| Migrate AI Agents console to platform-ui | Most visible feature | SSE infrastructure | `[ ]` TODO |
| Stand up FastAPI gateway service | New API surface with auto-generated OpenAPI | Phase 1 patterns established | `[ ]` TODO |
| Migrate ALA interface from `ala-ui/` Vite app to platform-ui | Consolidate 4 Vite apps into one | ALA domain mapping | `[ ]` TODO |
| Migrate `ops-ui/`, `dyn-dt-ui/`, `ai-agents-ui/` into platform-ui | Retire all embedded Vite builds | Per-domain migration | `[ ]` TODO |
| Fix SAML build dependency (python3-saml/xmlsec) | Enterprise SSO unblocked | Docker build environment | `[ ]` TODO |
| Add iOS EAS Build pipeline | Expand mobile reach | Apple Developer account | `[ ]` TODO |
| Complete PWA service worker in platform-ui | Offline-capable web app | Dashboard migration complete | `[ ]` TODO |
| Stripe self-service billing portal UI | Revenue-critical for self-service sales | Billing module mapped | `[ ]` TODO |
| Setup Grafana + Loki on EKS | Observability — currently flying blind | Fluent Bit DaemonSet | `[ ]` TODO |

---

## Blocked

| Task | Why Blocked | Unblocked By |
|------|-------------|--------------|
| Auth bridge implementation | Need to confirm Flask auth response contract (Q1) | Read `apps/authentication/api_auth.py` + test |
| SSE notifications for approvals | Need to understand current notification mechanism (Q11) | Investigate current technician approval flow |
| Role-based nav filtering | Need complete role list (Q8) | Read `rbac.py` fully |
| iOS build pipeline | Apple Developer account required | Business decision + account purchase |
| SAML enterprise SSO | xmlsec compilation issue unresolved | Docker build environment fix |

---

## Backlog Conventions

- **Now**: Will be worked on this week or is actively blocking other work
- **Next**: Planned for the next 2-8 weeks, sequenced by dependency
- **Later**: Important but not immediate; will be scheduled into phases
- **Blocked**: Cannot start without the listed unblocking action

Mark tasks complete by changing `[ ]` to `[x]` and adding date: `[x] 2026-04-25`
