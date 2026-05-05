# PlatformAISkillRegistry — Backend Contract Spec

> **Status:** spec drafted 2026-05-06 (Phase 2.2 of GENERIC_AI_PLATFORM_PROGRESS).
> Backend MUST adopt this contract verbatim before MOCK flip.
>
> **Why this matters:** the skill registry is the inventory of "what the AI can actually do" per module + per org. Without it, every executor lives as a code-time decision — there's no way to enable/disable specific skills per tenant, audit which skills the AI has access to, or surface a clean catalog for the AI shell's `availableActions`. This is the bridge between the policy engine (cap 27 — what's allowed) and the executor registry (what runs).

---

## 1. Concept

A **skill** (also called "AI capability" or "tool") is a single action the AI can propose. Each skill declares:
- A unique `id` (used in executor lookup, audit, policy patterns) — e.g. `helpdesk.ticket.take`
- A `module_key` so the skill belongs to a registered module (cap 18)
- A `risk_level` that the policy engine and approval flow consult
- A `parameter_schema` (JSON-Schema-compatible) that validates AI proposals
- `required_permissions` — backend RBAC re-checks before invocation
- A `policy_action_id` — the action_id passed to the policy engine (cap 27)
- A `default_enabled` flag — system-wide default. Per-org overrides via `/api/ai-skills/<id>/enablement`.

```
┌──────────────────────────────────────────────────────────┐
│  AI proposes skill X                                       │
│         ↓                                                  │
│  SkillRegistry.lookup(X)  ← module-level skill manifests   │
│         ↓                                                  │
│  Per-org enabled? — module enabled (cap 18)? — RBAC?       │
│         ↓                                                  │
│  Policy engine (cap 27) → allow / deny / require_approval  │
│         ↓                                                  │
│  Executor registry runs — emits AuditLog entry (cap 10)    │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Skill manifest

```ts
interface AISkill {
  id: string;                         // "helpdesk.ticket.take"
  module_key: string;                 // "helpdesk" — must match a registered module (cap 18)
  label: string;
  label_he?: string;
  description: string;
  // Categorisation
  category: "read" | "mutate" | "destroy" | "external" | "compute";
  // Risk drives default policy decisions and approval requirements
  risk_level: "low" | "medium" | "high" | "critical";
  // Parameter validation. Mock uses a minimal subset; backend validates full
  // JSON-Schema draft-07 on invocation.
  parameter_schema: {
    type: "object";
    properties: Record<string, ParameterDef>;
    required: string[];
  };
  // Backend RBAC re-check. Caller must have ALL of these.
  required_permissions: string[];
  // The action_id passed to PlatformPolicyEngine (cap 27). Usually equals `id`.
  policy_action_id: string;
  // Whether the AI shell may propose this skill at all. False for human-only
  // actions (e.g. billing.charge).
  ai_callable: boolean;
  // Default-on/off when an org enables the owning module.
  default_enabled: boolean;
  // Human-readable estimate for cost previews and audit context.
  estimated_cost_class: "free" | "cheap" | "moderate" | "expensive";
  // Lifecycle
  introduced_in: string;
  deprecated: boolean;
}

interface ParameterDef {
  type: "string" | "number" | "boolean" | "integer";
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
}
```

---

## 3. Per-org enablement

```ts
interface SkillEnablement {
  skill_id: string;
  org_id: number;
  enabled: boolean;
  // Only org_admin / system_admin can flip. Audit entry per write.
  set_by_user_id: number | null;
  set_at: string | null;
  source: "default" | "org_override";
}
```

---

## 4. Endpoints

### 4.1 — List skills (catalog + per-org status)

```
GET /api/proxy/ai-skills
GET /api/proxy/ai-skills?module=helpdesk
GET /api/proxy/ai-skills?ai_callable=true
GET /api/proxy/ai-skills?enabled_for_org=true
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "skills": [
      {
        "skill": { /* AISkill manifest */ },
        "enablement": { /* SkillEnablement */ },
        // Computed: enabled iff module enabled AND skill default/override on AND ai_callable
        "available_to_ai": true
      }
    ],
    "total": 12,
    "module_counts": { "helpdesk": 4, "users": 3, "audit-log": 1 }
  }
}
```

### 4.2 — Set per-org enablement

```
PUT /api/proxy/ai-skills/<skill_id>/enablement
```

Body: `{ enabled: boolean, reason?: string }`. Audit emission with `category=admin`, `action=ai_skill.enablement.set`.

### 4.3 — Validate a skill invocation (read-only, used by AI shell pre-confirm)

```
POST /api/proxy/ai-skills/<skill_id>/validate
```

Body: `{ params: Record<string, unknown> }`. Returns:
```jsonc
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "skill_available": true,
    "policy_decision": { /* PolicyDecision from cap 27 */ }
  }
}
```
On invalid params: `valid: false, errors: [{path: "ticketId", message: "must be integer"}]`. This combines: (a) parameter_schema validation, (b) skill enablement check, (c) policy evaluation. The AI shell calls this before showing the "Confirm" button.

---

## 5. Multi-tenant safety

- `org_id` from session.
- Cross-tenant write attempts MUST 403.
- Skill enablement only writable by org_admin / system_admin.
- Skill execution path goes through executor registry, which MUST consult the skill manifest's `required_permissions` AND the skill enablement AND policy decision before running.

---

## 6. Schema (Postgres)

```sql
CREATE TABLE ai_skill_definitions (
  id VARCHAR(120) PRIMARY KEY,
  module_key VARCHAR(60) NOT NULL,
  manifest JSONB NOT NULL,
  manifest_version VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_skill_enablement (
  org_id BIGINT NOT NULL,
  skill_id VARCHAR(120) NOT NULL REFERENCES ai_skill_definitions(id),
  enabled BOOLEAN NOT NULL,
  set_by_user_id BIGINT,
  set_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  PRIMARY KEY (org_id, skill_id)
);

CREATE INDEX idx_skill_enablement_lookup ON ai_skill_enablement (org_id, skill_id);
```

---

## 7. MOCK_MODE flip checklist

- [ ] Migration applied (2 tables)
- [ ] Manifests sync from code (boot-time import — same pattern as cap 18)
- [ ] CRUD endpoints registered
- [ ] Cross-tenant write guard tested
- [ ] Audit emission verified
- [ ] Frontend: flip `MOCK_MODE = false` in `lib/api/ai-skills.ts`
- [ ] Executor registry (`lib/platform/ai-actions/executors.ts`) consults the
      skill manifest at runtime instead of hard-coding action IDs

---

## 8. Open questions (Q-AIS-*)

- **Q-AIS-1** — Should skills be versioned? Recommendation: defer. Manifest version field is a system-level identifier; in v1 the latest manifest always wins. Versioning becomes useful when actions return structured data the AI relies on, which we'll address with Phase 3.
- **Q-AIS-2** — Per-skill rate limits separate from `rate_limits.*` settings? Recommendation: defer to PlatformBilling cap 26 — quotas live there.
- **Q-AIS-3** — Tool-use schema export to LLM provider? Recommendation: backend transforms the manifest into Anthropic / OpenAI tool-call shape on the fly. Frontend doesn't see it.
- **Q-AIS-4** — Per-skill cost preview using cap 26 usage meter? Recommendation: include `estimated_cost_class` in the manifest now (cheap/moderate/expensive) so the UI can hint without depending on usage meter being live.

---

## 9. Frontend wiring (this commit)

- `lib/modules/ai-skills/types.ts` — types.
- `lib/modules/<module>/skills.ts` — per-module skill manifests (helpdesk + users skills declared up-front; other modules add their own as they ship).
- `lib/platform/ai-skills/registry.ts` — central manifest aggregator (mirrors cap 18 manifests pattern).
- `lib/api/ai-skills.ts` — mock client implementing the 3 endpoints.
- `lib/hooks/use-ai-skills.ts` — `useAISkills(filter?)`, `useSkillValidation(id, params)`.
- `app/(dashboard)/admin/ai-skills/page.tsx` — categorized skill catalog with per-skill enable toggle, risk badge, parameter-schema preview.
- Tests + E2E.

The existing `lib/platform/ai-actions/executors.ts` is preserved as the runtime registry; the skill registry becomes its declarative input. Migration path: every executor's `actionId` MUST match a skill `id`.
