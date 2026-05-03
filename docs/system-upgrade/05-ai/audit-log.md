# AuditLog Service — Frontend↔Backend Contract

**Owner:** R046 (AuditLog + Notifications platform service)
**Status:** Frontend mock shipped 2026-05-01 (commit `60c1a48`); backend not yet built.
**Capability:** PlatformAuditLog (cap 10 in `04-capabilities/catalog.md`).

> **Why this doc exists.** Comprehensive review #2 §4.3 flagged the audit-log
> mock shape as **invented** — it has no Flask backing model. This doc is the
> canonical contract that R046 backend MUST adopt verbatim, otherwise the
> `/audit-log` page breaks on `MOCK_MODE=false` flip.
>
> Open question this resolves: **Q-AU-1**.

---

## Background — what exists today vs. what we need

The legacy backend has a partial recorder, NOT a full audit service:

| Component | Path | Notes |
|---|---|---|
| `UserActivity` model | `apps/authentication/models.py:794-810` | `(id, user_id, action: String(100), ip_address, user_agent, additional_data: JSON, created_at)`. NO `org_id`, NO category, NO resource_type/id columns. Joined to `org_id` via `User.org_id`. |
| `record_activity()` helper | `apps/authentication/jwt_auth.py:72-90` | Inline call from auth flows. Used inconsistently across modules — many emit ad-hoc `record_activity` calls; some don't audit at all. |
| `templates/admin/audit_log.html` | Jinja view | Reads `UserActivity` rows + filters. Frontend-only template. |

**The platform DOES NOT have:**
- A category enum
- Structured `resource_type` + `resource_id` fields
- Cross-module `record(...)` API
- Retention / cleanup
- Admin-scoped query API with cross-tenant safety

R046 must build this surface. The frontend has already shipped a viewer that
expects the full surface (commit `60c1a48`).

---

## Frontend contract — what the page reads

Defined in [`lib/modules/audit/types.ts`](../../../lib/modules/audit/types.ts).

```ts
export type AuditCategory =
  | "login"
  | "create"
  | "update"
  | "delete"
  | "admin"
  | "ai"
  | "security";

export interface AuditLogEntry {
  id: number;
  org_id: number;
  /** Stable action identifier — module.verb. Example: "helpdesk.ticket.create". */
  action: string;
  category: AuditCategory;
  actor_id: number | null;       // null for system / unauthenticated events
  actor_name: string | null;     // denormalized for display (joined from users)
  resource_type: string | null;  // e.g. "ticket", "user", "ai_action_token"
  resource_id: string | null;    // string to accommodate non-numeric IDs
  timestamp: string;             // ISO-8601 UTC
  metadata: Record<string, unknown>;  // free-form JSON, MUST be PII-redacted by caller
  ip: string | null;
  user_agent: string | null;
}

export interface AuditLogParams {
  page: number;
  per_page: number;
  category?: AuditCategory;
  actor_id?: number;
  /** Free-text search across action + resource_type + actor_name (server-side). */
  search?: string;
  /** ISO-8601; inclusive lower bound. */
  from?: string;
  /** ISO-8601; inclusive upper bound. */
  to?: string;
}

export interface AuditLogStats {
  total_24h: number;
  total_7d: number;
  by_category_24h: Record<AuditCategory, number>;
  unique_actors_24h: number;
}
```

**Endpoints consumed:**
- `GET /api/proxy/audit-log?page=1&per_page=25&category=&actor_id=&search=&from=&to=` → `AuditLogResponse`
- `GET /api/proxy/audit-log/stats` → `AuditLogStatsResponse`

---

## Recommended Flask schema

### Table — new `audit_log` (do NOT extend `UserActivity`)

```py
class AuditLog(db.Model):
    """Platform-wide audit trail. Single source of truth for security/compliance."""
    __tablename__ = "audit_log"

    id            = db.Column(db.BigInteger, primary_key=True)
    # Tenant scope — REQUIRED on every row, never accepted from client.
    org_id        = db.Column(db.Integer, nullable=False, index=True)
    # Stable identifier: <module>.<verb>. Example: "helpdesk.ticket.create".
    # Indexed for filter performance.
    action        = db.Column(db.String(100), nullable=False, index=True)
    # Category for fast UI filtering. Enum at DB level via CHECK constraint.
    category      = db.Column(
        db.String(20),
        nullable=False,
        default="update",
        index=True,
    )
    # Actor — null when the event is system-generated or unauthenticated
    # (e.g. failed login attempt). Denormalize actor_name at write time so
    # the audit row remains readable even after the user is deleted.
    actor_id      = db.Column(db.Integer, nullable=True, index=True)
    actor_name    = db.Column(db.String(200), nullable=True)
    # Resource fingerprint — string to accommodate UUID, ticket_number, etc.
    resource_type = db.Column(db.String(50), nullable=True, index=True)
    resource_id   = db.Column(db.String(100), nullable=True)
    # Free-form structured payload. MUST be PII-redacted at the call site.
    metadata      = db.Column(JSONB, nullable=False, default=dict)
    # Request fingerprint — for security forensics.
    ip            = db.Column(db.String(45), nullable=True)  # IPv6 length
    user_agent    = db.Column(db.String(500), nullable=True)
    # Timestamp at write time. Indexed for time-range queries.
    timestamp     = db.Column(
        db.DateTime(timezone=True),
        server_default=db.func.now(),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        db.CheckConstraint(
            "category IN ('login','create','update','delete','admin','ai','security')",
            name="audit_log_category_chk",
        ),
        # Composite index for the common viewer query (org + category + time range).
        db.Index("ix_audit_log_org_category_ts", "org_id", "category", "timestamp"),
        db.Index("ix_audit_log_org_actor_ts", "org_id", "actor_id", "timestamp"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "org_id": self.org_id,
            "action": self.action,
            "category": self.category,
            "actor_id": self.actor_id,
            "actor_name": self.actor_name,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "metadata": self.metadata or {},
            "ip": self.ip,
            "user_agent": self.user_agent,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
```

### Service — `AuditLog.record(...)`

```py
class AuditLogService:
    @staticmethod
    def record(
        *,
        org_id: int,
        action: str,
        category: str = "update",
        actor_id: int | None = None,
        actor_name: str | None = None,
        resource_type: str | None = None,
        resource_id: str | int | None = None,
        metadata: dict | None = None,
        ip: str | None = None,
        user_agent: str | None = None,
    ) -> AuditLog:
        """
        Single write path. Caller is responsible for PII redaction in `metadata`.

        - org_id is REQUIRED and never inferred from request — the caller MUST
          pass it from the verified JWT, not from request body.
        - Failure is non-fatal: log the exception and return None rather than
          raising, so a downstream audit failure doesn't abort the user action.
        """
        ...
```

### Backfill from `UserActivity`

R046 migration MUST include a one-shot copier:

```sql
INSERT INTO audit_log (org_id, action, category, actor_id, actor_name, metadata, ip, user_agent, timestamp)
SELECT
    u.org_id,
    a.action,
    CASE
        WHEN a.action LIKE 'auth.login%'        THEN 'login'
        WHEN a.action LIKE '%.delete' OR a.action LIKE '%.deactivate' THEN 'delete'
        WHEN a.action LIKE '%.create' OR a.action LIKE '%.add'        THEN 'create'
        WHEN a.action LIKE 'auth.%failed%'      THEN 'security'
        WHEN a.action LIKE 'ai.%'               THEN 'ai'
        WHEN a.action LIKE '%.admin.%'          THEN 'admin'
        ELSE 'update'
    END as category,
    a.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.username) as actor_name,
    COALESCE(a.additional_data, '{}'::jsonb),
    a.ip_address,
    a.user_agent,
    a.created_at
FROM user_activity a
JOIN users u ON a.user_id = u.id
WHERE NOT EXISTS (SELECT 1 FROM audit_log WHERE id = a.id);
```

After backfill verification, deprecate `UserActivity` writes — every `record_activity()` call site converts to `AuditLogService.record(...)`.

### Routes (R046 deliverable)

```py
@bp.route("/api/audit-log", methods=["GET"])
@jwt_required
@role_required("admin", "system_admin")
def list_audit_log():
    """Filter + paginate. Org-scoped (system_admin sees all-org)."""
    ...

@bp.route("/api/audit-log/stats", methods=["GET"])
@jwt_required
@role_required("admin", "system_admin")
def audit_log_stats():
    """Aggregate counts for the page's KPI tiles."""
    ...
```

---

## Categorization rules

The 7 categories are NOT free-form. Keep them stable:

| Category | When to use | Examples |
|---|---|---|
| `login` | Successful authentication events | `auth.login`, `auth.logout`, `auth.refresh` |
| `create` | New row inserted | `users.create`, `helpdesk.ticket.create`, `orgs.create` |
| `update` | Existing row modified (most common) | `helpdesk.ticket.assigned`, `helpdesk.ticket.resolved`, `users.update` |
| `delete` | Row deactivated or deleted | `users.deactivate`, `helpdesk.ticket.delete`, `orgs.disable` |
| `admin` | Privilege/policy mutations | `roles.permissions_updated`, `helpdesk.sla.policy_updated`, `orgs.settings_changed` |
| `ai` | LLM/agent activity | `ai.chat.message`, `ai.action.proposed`, `ai.action.confirmed`, `ai.action.rejected` |
| `security` | Auth failures, lockouts, suspicious | `auth.login.failed`, `auth.password.reset`, `security.rate_limit_hit` |

**When in doubt:** `update`. Changing categorization later is cheap (one ALTER + a backfill query).

---

## PII redaction rules

| Field | Allowed in metadata | Notes |
|---|---|---|
| User email | NO | Mask to `"[redacted]"` or omit. UI shows actor_name from a separate column. |
| Phone number | NO | Same. |
| Password / token | NEVER | Reject the call if present. |
| IP address | YES (separate column) | The `ip` column is intentional — it's forensic data, masked from non-admin viewers in the UI. |
| User agent | YES (separate column) | Same forensic intent. |
| Internal IDs | YES | `user_id`, `ticket_id`, etc. are not PII. |
| Free text reason | OK with caution | Operators may paste PII into reason fields — backend should not over-trust. Consider redacting common patterns. |

The frontend mock fixture demonstrates the pattern:
- [`lib/api/audit.ts:121`](../../../lib/api/audit.ts#L121) — `metadata: { email: "[redacted]" }` for `users.create`
- [`lib/api/audit.ts:191`](../../../lib/api/audit.ts#L191) — same for `auth.login.failed`

---

## Cross-tenant safety

**Required.** Every query MUST scope by `org_id` from the verified JWT:

```py
session.query(AuditLog).filter(AuditLog.org_id == g.user.org_id)
```

System admins see all-org via `if g.user.is_system_admin: skip filter`. The
audit_log table has the largest blast radius of any table in the platform —
a missing filter exposes other orgs' security history.

P1-Exit gate item #6 includes a cross-tenant test for audit log:
> "Cross-tenant test passes: org A user cannot see org B's audit entries."

---

## Retention

R046-min ships **without** a retention policy (entries kept indefinitely).
Retention deferred to R046-full. Default once added: **365 days**, configurable
per-org via Settings Engine (R045-full).

---

## Frontend MOCK_MODE flip checklist

Before flipping `MOCK_MODE = false` in [`lib/api/audit.ts`](../../../lib/api/audit.ts):

- [ ] R046-min `AuditLog` table migration shipped + applied
- [ ] `AuditLogService.record()` callable from helpdesk + auth + AI shell
- [ ] At least 3 record sites wired (per ADR-040 Helpdesk validation): one in
      `apps/helpdesk/actions.py`, one in `apps/authentication/jwt_auth.py`,
      one in the AI proposal confirm path
- [ ] `GET /api/audit-log` + `/stats` routes return `AuditLog.to_dict()` shapes
      matching this contract verbatim
- [ ] Cross-tenant test passes (gate item #6)
- [ ] Backfill from `UserActivity` complete (admin sees historical events too)

After flip, monitor for:
- Unknown `category` values from backend → frontend should fall back to `"update"` and log a console warning
- Missing `actor_name` for old rows → render `actor_id` as fallback (frontend already does)
- `metadata` keys not redacted → security team review

---

## See also

- [`lib/api/audit.ts`](../../../lib/api/audit.ts) — frontend client
- [`app/(dashboard)/audit-log/page.tsx`](../../../app/(dashboard)/audit-log/page.tsx) — viewer page
- [`docs/system-upgrade/10-tasks/R046-audit-notifications/epic.md`](../10-tasks/R046-audit-notifications/epic.md) — backend round
- [`docs/system-upgrade/08-decisions/open-questions.md`](../08-decisions/open-questions.md) — Q-AU-1 (this doc resolves it), Q-NT-1 (notifications model location)
