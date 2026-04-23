# 03 — Technology Inventory

_Last updated: 2026-04-23_

---

## Backend (platformengineer)

### Core Framework

| Technology | Version | Assessment |
|------------|---------|------------|
| Python | 3.x | **Appropriate** — mature, good AI ecosystem |
| Flask | 3.1.1 | **Appropriate but reaching limits** — solid micro-framework, but 81 modules strain its non-opinionated nature |
| Werkzeug | 3.1.3 | Strong foundation |
| Jinja2 | 3.1.6 | **Outdated for UI** — server-side templates being replaced by platform-ui |
| waitress | - | **Appropriate for Windows dev** — used in TEST; gunicorn on Linux |

### Database & ORM

| Technology | Version | Assessment |
|------------|---------|------------|
| PostgreSQL | - | **Strong** — correct choice; JSONB for flexibility, partitioned tables |
| SQLAlchemy | 2.0.38 | **Strong** — async-compatible; good version |
| Flask-SQLAlchemy | 3.1.1 | Appropriate |
| Flask-Migrate | 4.1.0 | Appropriate; 39 parallel heads is unusual but functional |
| psycopg2-binary | 2.9.11 | Appropriate; `asyncpg` would be needed for async |

### Task Queue

| Technology | Assessment |
|------------|------------|
| Celery | **Appropriate** — battle-tested; `--pool=solo` on Windows dev only |
| Redis | **Strong** — used for Celery broker + cache + circuit breaker state |

### Authentication & Security

| Technology | Assessment |
|------------|------------|
| Flask-Login | **Appropriate** — session-based auth; works but tightly coupled to Jinja2 |
| PyJWT | **Good** — present; unclear how consistently used for API auth |
| pyotp + qrcode | **Good** — TOTP 2FA support |
| SAML (python3-saml) | **Disabled** — compilation issues; enterprise SSO gap |
| Flask-Dance | OAuth flows; appropriate |
| bleach | Input sanitization; good |

### AI / LLM

| Technology | Assessment |
|------------|------------|
| Anthropic SDK (Claude) | **Strong** — primary investigation engine |
| Gemini (google-generativeai) | **Strong** — voice AI (Gemini Live) + ALA |
| OpenAI SDK | **Good** — provider option |
| Ollama | **Good** — local/self-hosted option |
| Provider abstraction layer | **Excellent** — best pattern in the codebase |

### Observability

| Technology | Assessment |
|------------|------------|
| prometheus-client | **Appropriate** — metrics collection |
| Structured logging | Partially implemented — standard `logging` module |
| No centralized log aggregation | **Gap** — no ELK/Loki/CloudWatch configured |
| No distributed tracing | **Gap** — no OpenTelemetry despite `otel.py` file existing in helpdesk |

### HTTP & APIs

| Technology | Assessment |
|------------|------------|
| Flask Blueprints | Appropriate for current scale |
| No OpenAPI/Swagger generation | **Gap** — only ALA has `openapi.yaml` |
| requests / httpx | Used for external HTTP calls |

### Validation & Forms

| Technology | Assessment |
|------------|------------|
| WTForms | **Outdated for API use** — form-based; not suitable for JSON API validation |
| jsonschema | Used in agent_runtime for tool payload validation |
| bleach | Input sanitization |
| Pydantic | **Not present** — significant gap for API validation and type safety |

### Infrastructure / Deployment

| Technology | Assessment |
|------------|------------|
| Docker | **Good** — single image shared by web-api + all celery workers |
| Kubernetes (EKS) | **Strong** — kustomize overlays; base + eks-test overlay |
| GitHub Actions | **Good** — 25+ workflows; CI, CD, SAST, secret scanning |
| AWS SSM Parameter Store | **Strong** — correct secrets management |
| AWS ECR | **Appropriate** |
| Cloudflare Tunnels | **Creative solution** — avoids NLB cost; works for single-node |
| STUNner (K8s TURN) | **Good** — K8s-native TURN for WebRTC |
| kustomize | **Good** — environment-specific overlays |

### Testing

| Technology | Assessment |
|------------|------------|
| pytest | **Appropriate** |
| Test coverage | **Inconsistent** — some modules well tested, others not at all |
| No integration test framework | **Gap** — individual unit tests, no contract/e2e tests |

---

## Frontend (platform-ui — new)

| Technology | Version | Assessment |
|------------|---------|------------|
| Next.js | 16.2.4 | **Strong** — App Router, RSC, good defaults |
| React | 19.2.4 | **Cutting edge** — RC quality concerns; good long-term bet |
| TypeScript | 5.x | **Strong** |
| TailwindCSS | 4.x | **Strong** — v4 is cutting edge, mostly stable |
| shadcn/ui + Radix UI | Latest | **Strong** — accessible, headless, composable |
| TanStack Query | 5.x | **Strong** — correct data-fetching solution |
| Zustand | 5.x | **Strong** — minimal state management |
| Framer Motion | 12.x | **Strong** — animations; `LazyMotion` used correctly |
| next-intl | 4.x | **Strong** — i18n with Hebrew/Arabic RTL support |
| next-themes | 0.4.6 | **Good** — dark mode |
| next-auth | 4.x | **Caution** — v4 still maintained; v5 (beta) is the future |
| Recharts | 3.x | **Appropriate** — charts |
| react-hook-form + zod | Latest | **Strong** — form validation |
| lucide-react | Latest | **Good** — icons |
| sonner | **Good** — toast notifications |

---

## Mobile App (mobile-app-rn-v2)

| Technology | Assessment |
|------------|------------|
| React Native 0.83 + Expo SDK 55 | **Appropriate** — modern RN with managed workflow |
| Tamagui 2.0 | **Good** — cross-platform UI, performant |
| Expo Router | **Good** — file-based routing |
| Zustand | **Good** — shared with platform-ui philosophy |
| EAS Build | **Appropriate** — but GitHub Actions used for CI |

---

## Voice / Real-Time

| Technology | Assessment |
|------------|------------|
| Go (realtime-voice-go) | **Strong** — correct choice for low-latency audio streaming |
| WebRTC | **Strong** — industry standard |
| STUNner | **Good** — K8s-native TURN; avoids metered.ca dependency |
| Gemini Live API | **Strong** — native audio model; cutting edge |

---

## Summary: Assessment by Category

| Category | Current State | Gap |
|----------|--------------|-----|
| Backend framework | Adequate | API design, Pydantic validation |
| Database | Strong | None major |
| AI abstraction | Excellent | — |
| Frontend (new) | Good start | Auth wiring, real data, more pages |
| Frontend (old) | Outdated | Being replaced |
| Auth | Functional | SAML disabled, API auth unclear |
| Observability | Partial | Centralized logging, tracing |
| Testing | Inconsistent | Coverage, integration tests |
| Documentation | Partial | API contracts |
| Security | Functional | See security assessment |
