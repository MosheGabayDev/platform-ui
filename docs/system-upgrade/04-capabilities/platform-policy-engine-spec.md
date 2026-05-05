# PlatformPolicy Engine — Backend Contract Spec (cap 27)

> **Status:** spec drafted 2026-05-05 (Phase 1.4 of GENERIC_AI_PLATFORM_PROGRESS).
> Backend MUST adopt this contract verbatim before MOCK flip.
>
> **Why this matters:** the policy engine is the safety layer for AI actions. Without it, the only thing standing between an AI proposal and execution is RBAC + a confirmation dialog. With it, an org can declare rules like "deny `helpdesk.ticket.delete` outside business hours", "require approval when `params.affected_count > 100`", "deny when caller is not the assigned technician". This is a hard requirement before any tenant trusts the AI to take real actions.

---

## 1. Concept

A **policy** is a named set of rules. A **rule** is a tuple of (resource pattern, action pattern, condition expression, effect). When the AI shell or a confirm-action flow needs to know whether an action is allowed, it asks the engine:

```
evaluatePolicy({ action_id, params, session, resource }) → PolicyDecision
```

The engine returns:

```ts
{
  allowed: boolean,
  requires_approval: boolean,
  matched_rules: PolicyRuleMatch[],
  reasons: string[],
}
```

**Deny precedence:** if any matching rule has `effect: "deny"`, the decision is denied — no later allow can override. This makes policies safe to compose.

**Default:** if no rule matches, the decision is `allowed: true` (engine is opt-in for restrictions, not opt-out for allowance — RBAC remains the floor).

---

## 2. Rule shape

```ts
interface PolicyRule {
  id: string;                            // stable id for audit
  description: string;                   // human-readable purpose
  resource_pattern: string;              // glob: "helpdesk/ticket/*", "users/*", "*"
  action_pattern: string;                // glob: "helpdesk.ticket.delete", "helpdesk.*", "*"
  /**
   * Subject of the rule — who it applies to. null = everyone.
   * Examples: { roles: ["technician"] }, { user_id: 7 }, { is_admin: false }
   */
  subject: SubjectSelector | null;
  /**
   * Optional condition expression evaluated against the EvaluationContext.
   * Mock evaluator supports a small expression language:
   *   - field references: "params.affected_count", "session.role", "resource.priority"
   *   - operators: ==, !=, >, >=, <, <=, in, not_in, exists, between
   *   - logical: and, or, not
   *   - functions: now(), hour_of_day(), is_business_hours()
   * Example: 'params.affected_count > 100 and not is_business_hours()'
   */
  condition: string | null;
  /** Optional time window — rule only active during this interval. */
  active_from: string | null;            // ISO
  active_until: string | null;           // ISO
  effect: "allow" | "deny" | "require_approval";
  /** Display priority — higher numbers evaluate first. Ties broken by id. */
  priority: number;
  enabled: boolean;
}

interface SubjectSelector {
  roles?: string[];                      // any-of match
  user_id?: number;                      // specific user
  is_admin?: boolean;                    // narrow by admin flag
  is_system_admin?: boolean;
  org_id?: number;                       // for system_admin acting cross-tenant
}
```

---

## 3. Policy shape

```ts
interface Policy {
  id: string;                            // "policy.helpdesk.business_hours"
  name: string;                          // "Helpdesk: business hours only for high-impact actions"
  description: string;
  category: "ai_safety" | "compliance" | "operational" | "experimental";
  org_id: number | null;                 // null = system-wide template
  rules: PolicyRule[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
  /** Audit metadata. */
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
}
```

---

## 4. Evaluation context

```ts
interface PolicyEvaluationContext {
  action_id: string;                     // "helpdesk.ticket.resolve"
  params: Record<string, unknown>;       // {ticketId: 1004, resolution: "Fixed"}
  session: {
    user_id: number;
    org_id: number;
    role: string;
    roles: string[];
    is_admin: boolean;
    is_system_admin: boolean;
    permissions: string[];
  };
  /** Optional: when the action targets a specific resource the engine
   *  may consult its data (priority, status, etc) for conditions. */
  resource: Record<string, unknown> | null;
  /** Server-side timestamp; client should not be trusted for time. */
  evaluated_at: string;                  // ISO
}
```

---

## 5. Decision shape

```ts
interface PolicyDecision {
  allowed: boolean;
  requires_approval: boolean;
  /** All rules that matched, in evaluation order. UI shows this for transparency. */
  matched_rules: PolicyRuleMatch[];
  /** Concatenation of `description` of denying or approval-requiring rules. */
  reasons: string[];
  /** Decision id for audit linkage. */
  decision_id: string;
}

interface PolicyRuleMatch {
  policy_id: string;
  rule_id: string;
  effect: "allow" | "deny" | "require_approval";
  description: string;
}
```

The frontend `ConfirmActionDialog` consults `requires_approval` to decide whether to show the danger UI even if the action's static `dangerLevel` is low.

---

## 6. Endpoints

### 6.1 — Evaluate (hot path)

```
POST /api/proxy/policies/evaluate
```

**Request:**
```jsonc
{
  "action_id": "helpdesk.ticket.resolve",
  "params": { "ticketId": 1004, "resolution": "Fixed" },
  "resource": { "priority": "P1", "status": "in_progress" }
}
```

`session` is derived from auth — never trust the client.

**Response (200):** `PolicyDecision`.

### 6.2 — List policies (admin)

```
GET /api/proxy/policies
GET /api/proxy/policies?category=ai_safety
```

### 6.3 — Get a policy

```
GET /api/proxy/policies/<id>
```

### 6.4 — Create / update / delete

```
POST /api/proxy/policies
PUT /api/proxy/policies/<id>
DELETE /api/proxy/policies/<id>
```

`system_admin` always; `org_admin` MAY edit policies whose `category="operational"` (defer to later).

### 6.5 — Test a draft policy (admin)

```
POST /api/proxy/policies/<id>/test
```

Body: a draft `Policy` and a list of `PolicyEvaluationContext` test cases. Returns the decision per case so admins can preview before saving. Useful for the "did this rule match what I expected?" workflow.

---

## 7. Multi-tenant safety

- Evaluation: `org_id` from session is injected into context. Cross-tenant evaluation is impossible because the engine reads policies for `session.org_id` only.
- Writes: `org_admin` cannot create policies for another org. System-wide templates (`org_id: null`) are system_admin-only.
- Audit: every evaluation is logged with `category=ai`, `action=policy.evaluate`, `metadata={action_id, decision, matched_rules}`.

---

## 8. Performance budget

- `evaluate` p95 ≤ 50ms. Hot-path call from every AI-proposed action confirm flow.
- Policy cache: the engine caches active policies per `org_id` for 60s. Updates invalidate cache via SSE (cap 23) or 60s stale.
- Frontend: `usePolicyDecision(actionId, params)` with `staleTime: 0` (always fresh — params change with user input).

---

## 9. Schema (Postgres)

```sql
CREATE TABLE policies (
  id VARCHAR(120) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(40) NOT NULL,
  org_id BIGINT,                     -- null for system-wide templates
  rules JSONB NOT NULL,              -- array of PolicyRule
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id BIGINT,
  updated_by_user_id BIGINT
);

CREATE TABLE policy_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  action_id VARCHAR(120) NOT NULL,
  params JSONB,
  decision JSONB NOT NULL,           -- full PolicyDecision
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_policies_lookup ON policies (org_id, enabled);
CREATE INDEX idx_decisions_lookup ON policy_decisions (org_id, action_id, evaluated_at DESC);
```

---

## 10. Initial system policies (seeded)

These ship with the platform. Tenants can override via creating org-scoped policies that take precedence (Q-PE-1).

### `policy.system.deny_critical_outside_business_hours`
- Category: `operational`
- Rules:
  - `description: "Deny critical-priority resolves and bulk operations outside business hours."`
  - `action_pattern: "helpdesk.ticket.resolve"`, `condition: 'resource.priority == "P1" and not is_business_hours()'`, `effect: "deny"`
  - `action_pattern: "helpdesk.batch.*"`, `condition: 'not is_business_hours()'`, `effect: "deny"`

### `policy.system.require_approval_high_blast_radius`
- Category: `ai_safety`
- Rules:
  - `description: "Require approval when bulk action affects >50 items."`
  - `action_pattern: "helpdesk.batch.*"`, `condition: 'params.affected_count > 50'`, `effect: "require_approval"`
  - `description: "Require approval when reassigning tickets across orgs."`
  - `action_pattern: "helpdesk.bulk_reassign"`, `condition: 'params.from_org != params.to_org'`, `effect: "require_approval"`

### `policy.system.ai_safety_baseline`
- Category: `ai_safety`
- Rules:
  - `description: "Deny destructive admin actions from AI agents."`
  - `action_pattern: "admin.*"`, `subject: { is_admin: false }`, `effect: "deny"`
  - `description: "Require approval for any mutation by non-admin users."`
  - `action_pattern: "*.delete"`, `subject: { is_admin: false }`, `effect: "require_approval"`

---

## 11. Mock condition language

The mock evaluator supports a strict subset of the condition syntax:

- Field references: `params.<key>`, `session.<key>`, `resource.<key>`
- Comparison ops: `==`, `!=`, `>`, `>=`, `<`, `<=`
- Membership: `in [...]`, `not_in [...]`
- Existence: `exists params.<key>`
- Logical: `and`, `or`, `not`
- Built-in functions: `is_business_hours()`, `hour_of_day()`, `now()`

The expression evaluator is implemented as a small recursive descent parser. Unknown identifiers throw `"unknown identifier: <name>"` at evaluation time — caught and treated as "rule does not match" (fail-safe).

---

## 12. Audit & observability

- Every `evaluate` call writes a row to `policy_decisions` AND emits a PlatformAuditLog entry with `category=ai`, `action=policy.evaluate`.
- Reasons surfaced to the user: only the deny / require-approval rule descriptions. Allow rules don't surface (avoid confusing UI).
- Admin can view recent decisions via `/admin/policies/decisions` (deferred — requires backend; exposed in this spec for future).

---

## 13. MOCK_MODE flip checklist

- [ ] Migrations applied (2 tables + 2 indexes)
- [ ] System-wide policies seeded
- [ ] Condition evaluator on backend matches the mock semantics
- [ ] `/api/policies/evaluate` p95 measured ≤ 50ms
- [ ] Cross-tenant test: org A cannot read or evaluate policies of org B
- [ ] Audit emission verified
- [ ] Frontend: flip `MOCK_MODE = false` in `lib/api/policies.ts`

---

## 14. Open questions (Q-PE-*)

- **Q-PE-1** — Org-scoped policies: do they EXTEND system policies or REPLACE them within the action_pattern they cover? Recommendation: **extend** — both are evaluated, deny precedence applies. Replacing causes accidental privilege escalation.
- **Q-PE-2** — Should the engine support "approve as a different user" overrides? Recommendation: defer to PlatformApprovalFlow (cap 13). Policy engine produces `requires_approval`; approval flow handles the human-in-the-loop step.
- **Q-PE-3** — Action ID pattern syntax: glob (`helpdesk.*`) vs regex? Recommendation: **glob** — more readable, fewer pitfalls.
- **Q-PE-4** — Per-user audit visibility: does a viewer user need to see why their action was denied? Recommendation: yes, show generic reason ("Denied by org policy"). Detailed rule descriptions shown to admins only.

---

## 15. Frontend wiring (this commit)

- `lib/modules/policies/types.ts` — full type set.
- `lib/api/policies.ts` — mock client with the 3 system policies + a working condition evaluator.
- `lib/hooks/use-policy-decision.ts` — `usePolicyDecision({ actionId, params, resource })`.
- `app/(dashboard)/admin/policies/page.tsx` — list policies, view rules per policy, toggle enabled, link to evaluation tester.
- Tests: condition evaluator, deny precedence, default-allow, system policies fire correctly.
- Wiring: `ConfirmActionDialog` consults the policy engine; deny reason replaces the title/description, requires-approval forces the high-danger UX.
