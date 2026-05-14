/**
 * Cross-cutting invariant: the he/en i18n catalogs MUST have the same
 * shape — every key path in one MUST exist in the other. A drift here
 * means a Hebrew user sees an English fallback (or worse, a missing-
 * translation key string) for whatever leaf is missing.
 *
 * Catches the bug class where someone adds a new English string but
 * forgets to add the Hebrew counterpart (or vice-versa).
 *
 * Batch 57 — added after the i18n debt cleanup arc closed
 * (batches 44–52) so we don't backslide.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import he from "@/i18n/messages/he.json";
import en from "@/i18n/messages/en.json";

type Catalog = Record<string, unknown>;

function flatten(obj: Catalog, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flatten(v as Catalog, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

describe("i18n catalog parity (he ↔ en)", () => {
  const heKeys = new Set(flatten(he as Catalog));
  const enKeys = new Set(flatten(en as Catalog));

  it("every English leaf key exists in Hebrew catalog", () => {
    const missingInHe = [...enKeys].filter((k) => !heKeys.has(k));
    expect(missingInHe).toEqual([]);
  });

  it("every Hebrew leaf key exists in English catalog", () => {
    const missingInEn = [...heKeys].filter((k) => !enKeys.has(k));
    expect(missingInEn).toEqual([]);
  });

  it("catalogs are non-trivial (sanity check — must have many keys)", () => {
    expect(heKeys.size).toBeGreaterThan(500);
    expect(enKeys.size).toBe(heKeys.size);
  });

  it("every useTranslations(\"scope\") resolves to a sub-object in both catalogs", () => {
    function walk(dir: string, out: string[] = []): string[] {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".next") continue;
          walk(p, out);
        } else if (
          /\.(tsx?|jsx?)$/.test(entry.name) &&
          !/\.test\.(tsx?|jsx?)$/.test(entry.name)
        ) {
          out.push(p);
        }
      }
      return out;
    }
    const sources = [
      ...walk("app"),
      ...walk("components"),
      ...walk("lib"),
    ];
    const scopes = new Set<string>();
    const re = /useTranslations\(\s*["']([^"']+)["']\s*\)/g;
    for (const file of sources) {
      const src = fs.readFileSync(file, "utf8");
      for (const m of src.matchAll(re)) scopes.add(m[1]!);
    }

    function resolve(obj: Catalog, dotted: string): unknown {
      let node: unknown = obj;
      for (const seg of dotted.split(".")) {
        if (node === null || typeof node !== "object" || Array.isArray(node)) return undefined;
        node = (node as Record<string, unknown>)[seg];
      }
      return node;
    }

    const broken: string[] = [];
    for (const scope of scopes) {
      const heNode = resolve(he as Catalog, scope);
      const enNode = resolve(en as Catalog, scope);
      // useTranslations expects an OBJECT scope (so callers can `t("key")`).
      const ok =
        heNode !== null && typeof heNode === "object" && !Array.isArray(heNode) &&
        enNode !== null && typeof enNode === "object" && !Array.isArray(enNode);
      if (!ok) broken.push(scope);
    }
    expect(broken).toEqual([]);
    // Sanity floor — make sure the walker actually found scopes.
    expect(scopes.size).toBeGreaterThan(50);
  });

  it("every t(\"key\") literal resolves to a leaf in both catalogs (single-scope files)", () => {
    function walk(dir: string, out: string[] = []): string[] {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".next") continue;
          walk(p, out);
        } else if (
          /\.(tsx?|jsx?)$/.test(entry.name) &&
          !/\.test\.(tsx?|jsx?)$/.test(entry.name)
        ) {
          out.push(p);
        }
      }
      return out;
    }

    function resolve(obj: Catalog, dotted: string): unknown {
      let node: unknown = obj;
      for (const seg of dotted.split(".")) {
        if (node === null || typeof node !== "object" || Array.isArray(node)) return undefined;
        node = (node as Record<string, unknown>)[seg];
      }
      return node;
    }

    const sources = [...walk("app"), ...walk("components"), ...walk("lib")];
    const useTransRe = /useTranslations\(\s*["']([^"']+)["']\s*\)/g;
    // Match t("...") / tt("...") / any 1-char-or-more identifier ending in t,
    // but require it to be a string-literal arg only (skip template strings,
    // variables, and the `as never` ternary cast pattern).
    const callRe = /\b(?:t|tt|[a-zA-Z]+T)\(\s*"([^"]+)"\s*[,)]/g;

    const broken: string[] = [];
    let validatedFiles = 0;
    let validatedKeys = 0;
    for (const file of sources) {
      const src = fs.readFileSync(file, "utf8");
      const scopes = [...src.matchAll(useTransRe)].map((m) => m[1]!);
      // Only audit files with exactly one scope — otherwise we can't know
      // which scope a given t() call is bound to without real AST analysis.
      if (scopes.length !== 1) continue;
      const scope = scopes[0]!;
      validatedFiles += 1;
      for (const m of src.matchAll(callRe)) {
        const key = m[1]!;
        // Skip dotted keys that look like file paths or URLs and obvious
        // non-i18n strings (heuristic: leaf keys are camelCase identifiers
        // possibly dotted, never with spaces or slashes).
        if (/[\s/]/.test(key)) continue;
        validatedKeys += 1;
        const full = `${scope}.${key}`;
        const heVal = resolve(he as Catalog, full);
        const enVal = resolve(en as Catalog, full);
        if (typeof heVal !== "string" || typeof enVal !== "string") {
          broken.push(`${file}: ${full}`);
        }
      }
    }
    expect(broken).toEqual([]);
    expect(validatedFiles).toBeGreaterThan(20);
    expect(validatedKeys).toBeGreaterThan(100);
  });

  it("every SettingCategory / ModuleCategory / AuditCategory has an i18n label in both locales", () => {
    // Cross-cut: discriminated union types listed at type-level have
    // matching i18n leaf keys at runtime. A new category in the
    // union without a label → page renders "categories.X" literal.
    // A removed/typo'd label → same. TypeScript catches one direction
    // (the code calling `t(category)` requires the union), but not
    // the catalog side.
    const cases: Array<{ scope: string; values: readonly string[] }> = [
      {
        scope: "admin.settings.categories",
        // SettingCategory values from lib/modules/settings/types.ts
        values: ["ai", "branding", "notifications", "rate_limits", "integrations", "experimental"],
      },
      {
        scope: "admin.modules.categories",
        // ModuleCategory values from lib/modules/module-registry/types.ts
        values: ["core", "ai", "operations", "growth", "experimental"],
      },
      {
        scope: "admin.auditLog.categories",
        // AuditCategory values from lib/modules/audit/types.ts + the "all"
        // filter option used by /audit-log page.
        values: ["all", "login", "create", "update", "delete", "admin", "ai", "security"],
      },
      {
        scope: "helpdesk.tickets.status",
        // TicketStatus values + the "all" filter option. Used by
        // TicketStatusBadge and the /helpdesk/tickets filter dropdown.
        values: ["all", "new", "in_progress", "resolved", "closed"],
      },
      {
        scope: "helpdesk.tickets.priority",
        // TicketPriority values + the "all" filter option. Used by
        // TicketPriorityBadge and the /helpdesk/tickets filter dropdown.
        values: ["all", "low", "medium", "high", "critical"],
      },
      {
        scope: "admin.aiSkills.categories",
        // SkillCategory values from lib/modules/ai-skills/types.ts
        values: ["read", "mutate", "destroy", "external", "compute"],
      },
      {
        scope: "admin.aiProviders.categories",
        // ProviderCategory values + the "all" filter option. Used by
        // ProviderCard category badge and the category filter row.
        values: ["all", "cloud", "hosted", "local", "openai_compatible"],
      },
      {
        scope: "admin.aiUsage.recent.outcomes",
        // UsageEvent.outcome values from lib/modules/ai-usage/types.ts —
        // rendered by OutcomeBadge on /admin/ai-usage.
        values: ["success", "error", "cached", "cancelled"],
      },
      {
        scope: "admin.policies.effects",
        // PolicyEffect values from lib/modules/policies/types.ts —
        // rendered by RuleRow on /admin/policies.
        values: ["allow", "deny", "require_approval"],
      },
      {
        scope: "helpdesk.approvals.risk",
        // RiskLevel values rendered by ApprovalRow on /helpdesk/approvals
        // (mirrors SkillRiskLevel — same 4 levels).
        values: ["low", "medium", "high", "critical"],
      },
      {
        scope: "helpdesk.approvals.status",
        // ToolInvocationStatus values + "all" filter option on
        // /helpdesk/approvals.
        values: ["all", "pending_approval", "approved", "rejected", "success", "error"],
      },
      {
        scope: "helpdesk.batch.status",
        // BatchTask.status values + "all" filter option on /helpdesk/batch.
        values: ["all", "running", "queued", "succeeded", "partial", "failed", "cancelled"],
      },
      {
        scope: "helpdesk.maintenance.status",
        // MaintenanceWindow.status values + "all" filter option on
        // /helpdesk/maintenance.
        values: ["all", "scheduled", "in_progress", "completed", "cancelled"],
      },
      {
        scope: "admin.featureFlags.categories",
        // FlagDefinition.category values + "all" filter option on
        // /admin/feature-flags.
        values: ["all", "ai", "modules", "integrations", "platform", "experimental"],
      },
      {
        scope: "admin.aiUsage.ranges",
        // UsageRange values from lib/modules/ai-usage/types.ts —
        // rendered by the range filter dropdown on /admin/ai-usage.
        values: ["24h", "7d", "mtd", "30d"],
      },
      {
        scope: "admin.feedback.filters",
        // FeedbackType values + "all" filter option on /admin/feedback.
        // Doubles as type-badge labels (tType(item.type)).
        values: ["all", "bug", "feature", "insight"],
      },
      {
        scope: "admin.feedback.status",
        // FeedbackStatus values rendered by the status badge on
        // /admin/feedback.
        values: ["new", "triaged", "converted", "duplicate", "wontFix"],
      },
      {
        scope: "billing.plans",
        // PlanTier values from lib/modules/billing/types.ts —
        // rendered by the plan-tier badge on /billing.
        values: ["free", "pro", "enterprise"],
      },
      {
        scope: "billing.invoices.status",
        // InvoiceStatus values rendered by the status badge on the
        // invoices DataTable column on /billing.
        values: ["paid", "pending", "failed"],
      },
      {
        scope: "helpdesk.maintenance.impact",
        // MaintenanceImpact values rendered by the impact badge on
        // the /helpdesk/maintenance DataTable.
        values: ["none", "low", "medium", "high"],
      },
      {
        scope: "whatsapp.states",
        // WhatsAppSessionState values rendered by stateLabel() on
        // /whatsapp/sessions.
        values: ["needs_qr", "connecting", "ready", "disconnected", "failed", "unlinked"],
      },
      {
        scope: "help.capability",
        // AICapabilityLevel values rendered by AIShortcutRow on /help.
        values: ["READ", "WRITE_LOW", "WRITE_HIGH", "DESTRUCTIVE"],
      },
      {
        scope: "admin.aiSkills.risk",
        // SkillRiskLevel values from lib/modules/ai-skills/types.ts
        values: ["low", "medium", "high", "critical"],
      },
      {
        scope: "jobStatus",
        // JobStatus union from lib/modules/job-runner/types.ts — 17
        // known statuses + the "unknown" fallback used by JobStatusBadge.
        // Open-enum `(string & {})` values bypass i18n and render raw.
        values: [
          "pending",
          "queued",
          "running",
          "success",
          "succeeded",
          "partial",
          "failed",
          "cancelled",
          "scheduled",
          "in_progress",
          "completed",
          "pending_approval",
          "approved",
          "rejected",
          "healthy",
          "disabled_by_flag",
          "unavailable",
          "unknown",
        ],
      },
    ];
    function resolve(obj: Catalog, dotted: string): unknown {
      let node: unknown = obj;
      for (const seg of dotted.split(".")) {
        if (node === null || typeof node !== "object" || Array.isArray(node)) return undefined;
        node = (node as Record<string, unknown>)[seg];
      }
      return node;
    }
    const missing: string[] = [];
    for (const { scope, values } of cases) {
      for (const val of values) {
        const path = `${scope}.${val}`;
        if (typeof resolve(he as Catalog, path) !== "string") missing.push(`he: ${path}`);
        if (typeof resolve(en as Catalog, path) !== "string") missing.push(`en: ${path}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every resource_type emitted by inferResourceHint has an auditLog.resourceTypes label (batch 144)", async () => {
    // The audit-log page renders resource_type via
    // t("admin.auditLog.resourceTypes.<rt>"). A new executor that
    // emits a resource_type without a corresponding i18n entry will
    // fall back to the raw snake_case string in the UI, breaking the
    // Hebrew experience silently. Lock this so the next vertical's
    // inferResourceHint addition forces an i18n label.
    const { _registeredActions, inferResourceHint } = await import(
      "@/lib/platform/ai-actions/executors"
    );
    const enLabels = ((en as unknown as Catalog).admin as Catalog | undefined)
      ?.auditLog as Catalog | undefined;
    const heLabels = ((he as unknown as Catalog).admin as Catalog | undefined)
      ?.auditLog as Catalog | undefined;
    const enRT = enLabels?.resourceTypes as Record<string, string> | undefined;
    const heRT = heLabels?.resourceTypes as Record<string, string> | undefined;
    expect(enRT, "en admin.auditLog.resourceTypes missing").toBeDefined();
    expect(heRT, "he admin.auditLog.resourceTypes missing").toBeDefined();
    const { _mockFixtureResourceTypes } = await import("@/lib/api/audit");
    const emitted = new Set<string>();
    for (const actionId of _registeredActions()) {
      const rt = inferResourceHint(actionId, {}).resource_type;
      if (rt) emitted.add(rt);
    }
    // Fixture entries seed types that no executor produces yet
    // (session, ai_session, ai_action_token, sla_policy, role). Lock
    // those too so the audit log doesn't render any raw snake_case.
    for (const rt of _mockFixtureResourceTypes()) emitted.add(rt);
    const missing: string[] = [];
    for (const rt of emitted) {
      if (!(rt in (enRT ?? {}))) missing.push(`en:${rt}`);
      if (!(rt in (heRT ?? {}))) missing.push(`he:${rt}`);
    }
    expect(missing).toEqual([]);
  });

  it("no leaf value is empty string in either locale", () => {
    function emptyLeaves(obj: Catalog, prefix = ""): string[] {
      const out: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === "object" && !Array.isArray(v)) {
          out.push(...emptyLeaves(v as Catalog, path));
        } else if (typeof v === "string" && v.trim() === "") {
          out.push(path);
        }
      }
      return out;
    }
    expect(emptyLeaves(he as Catalog)).toEqual([]);
    expect(emptyLeaves(en as Catalog)).toEqual([]);
  });
});
