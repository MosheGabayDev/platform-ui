/**
 * @module lib/api/policies
 * PlatformPolicy Engine client (cap 27, Phase 1.4).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-policy-engine-spec.md
 *
 * Mock implements:
 *   - 3 seeded system policies (deny critical out-of-hours, require approval
 *     for high blast radius, AI safety baseline)
 *   - Condition evaluator with field references, comparison/logical ops,
 *     glob patterns, built-in functions
 *   - Deny precedence (any matching deny rule short-circuits to denied)
 *   - Default-allow when no rule matches
 *   - Cross-tenant isolation (mock evaluates only system + current-org policies)
 */
import type {
  Policy,
  PolicyRule,
  PolicyDecision,
  PolicyRuleMatch,
  PolicyEvaluationContext,
  PolicyListResponse,
  PolicyResponse,
  EvaluateInput,
  EvaluateResponse,
} from "@/lib/modules/policies/types";
import { emitPolicyEvaluation } from "@/lib/platform/ai-actions/audit-emitter";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy";
export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API !== "false";

// Track A: localStorage-backed persistence for mock state.
import {
  loadMockState,
  saveMockState,
  clearMockState,
} from "@/lib/api/_mock-storage";
const STORAGE_KEY = "mock:policies:enabled-overrides";
const STORAGE_VERSION = 1;
const ENABLED_OVERRIDES = new Map<string, boolean>(
  loadMockState<Array<[string, boolean]>>(STORAGE_KEY, STORAGE_VERSION, []),
);
function persistEnabledOverrides(): void {
  saveMockState(STORAGE_KEY, STORAGE_VERSION, Array.from(ENABLED_OVERRIDES.entries()));
}
/** Test helper — clears localStorage + override map. */
export function _resetPoliciesMockState(): void {
  ENABLED_OVERRIDES.clear();
  clearMockState("mock:policies:");
}

// ---------------------------------------------------------------------------
// Glob matching for action_pattern / resource_pattern
// ---------------------------------------------------------------------------

function globToRegex(pattern: string): RegExp {
  // Escape regex metacharacters except * and ?
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  // For action patterns, * matches any chars including dots, so
  // "helpdesk.*" matches "helpdesk.ticket.resolve". Use a single-char
  // hint via ? if a stricter component-level match is needed later.
  const re = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${re}$`);
}

function patternMatches(pattern: string, value: string): boolean {
  if (pattern === "*") return true;
  return globToRegex(pattern).test(value);
}

// ---------------------------------------------------------------------------
// Condition evaluator — small expression language
// ---------------------------------------------------------------------------

type Token =
  | { type: "ident"; value: string }
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "lbracket" }
  | { type: "rbracket" }
  | { type: "comma" }
  | { type: "op"; value: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i]!;
    if (c === " " || c === "\t" || c === "\n") {
      i += 1;
      continue;
    }
    if (c === "(") { tokens.push({ type: "lparen" }); i += 1; continue; }
    if (c === ")") { tokens.push({ type: "rparen" }); i += 1; continue; }
    if (c === "[") { tokens.push({ type: "lbracket" }); i += 1; continue; }
    if (c === "]") { tokens.push({ type: "rbracket" }); i += 1; continue; }
    if (c === ",") { tokens.push({ type: "comma" }); i += 1; continue; }
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < input.length && input[j] !== quote) j += 1;
      tokens.push({ type: "string", value: input.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if (c >= "0" && c <= "9") {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j]!)) j += 1;
      tokens.push({ type: "number", value: Number(input.slice(i, j)) });
      i = j;
      continue;
    }
    // Multi-char operators
    if (c === "=" && input[i + 1] === "=") { tokens.push({ type: "op", value: "==" }); i += 2; continue; }
    if (c === "!" && input[i + 1] === "=") { tokens.push({ type: "op", value: "!=" }); i += 2; continue; }
    if (c === ">" && input[i + 1] === "=") { tokens.push({ type: "op", value: ">=" }); i += 2; continue; }
    if (c === "<" && input[i + 1] === "=") { tokens.push({ type: "op", value: "<=" }); i += 2; continue; }
    if (c === ">" || c === "<") { tokens.push({ type: "op", value: c }); i += 1; continue; }
    // Identifiers & keywords
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < input.length && /[a-zA-Z0-9_.]/.test(input[j]!)) j += 1;
      const ident = input.slice(i, j);
      if (ident === "and" || ident === "or" || ident === "not" || ident === "in" || ident === "not_in" || ident === "exists") {
        tokens.push({ type: "op", value: ident });
      } else {
        tokens.push({ type: "ident", value: ident });
      }
      i = j;
      continue;
    }
    throw new Error(`tokenize: unexpected char '${c}' at ${i}`);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  consume(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new Error("unexpected end of expression");
    this.pos += 1;
    return t;
  }
  matchOp(...values: string[]): boolean {
    const t = this.peek();
    return t?.type === "op" && values.includes(t.value);
  }

  parseExpr(): unknown {
    return this.parseOr();
  }

  parseOr(): unknown {
    let left = this.parseAnd();
    while (this.matchOp("or")) {
      this.consume();
      const right = this.parseAnd();
      left = { op: "or", left, right };
    }
    return left;
  }

  parseAnd(): unknown {
    let left = this.parseNot();
    while (this.matchOp("and")) {
      this.consume();
      const right = this.parseNot();
      left = { op: "and", left, right };
    }
    return left;
  }

  parseNot(): unknown {
    if (this.matchOp("not")) {
      this.consume();
      return { op: "not", operand: this.parseNot() };
    }
    if (this.matchOp("exists")) {
      this.consume();
      // exists is a prefix unary — eats the next field reference and
      // returns true iff the value is not undefined/null.
      return { op: "exists", operand: this.parseUnary() };
    }
    return this.parseComparison();
  }

  parseComparison(): unknown {
    const left = this.parseUnary();
    if (this.matchOp("==", "!=", ">", ">=", "<", "<=")) {
      const op = (this.consume() as { value: string }).value;
      const right = this.parseUnary();
      return { op, left, right };
    }
    if (this.matchOp("in", "not_in")) {
      const op = (this.consume() as { value: string }).value;
      this.expect("lbracket");
      const items: unknown[] = [];
      while (!this.peekIs("rbracket")) {
        items.push(this.parseUnary());
        if (this.peekIs("comma")) this.consume();
      }
      this.expect("rbracket");
      return { op, left, items };
    }
    return left;
  }

  parseUnary(): unknown {
    const t = this.peek();
    if (!t) throw new Error("unexpected end of expression");
    if (t.type === "lparen") {
      this.consume();
      const inner = this.parseExpr();
      this.expect("rparen");
      return inner;
    }
    if (t.type === "number") {
      this.consume();
      return { kind: "literal", value: t.value };
    }
    if (t.type === "string") {
      this.consume();
      return { kind: "literal", value: t.value };
    }
    if (t.type === "ident") {
      this.consume();
      // Function call?
      if (this.peekIs("lparen")) {
        this.consume();
        const args: unknown[] = [];
        while (!this.peekIs("rparen")) {
          args.push(this.parseExpr());
          if (this.peekIs("comma")) this.consume();
        }
        this.expect("rparen");
        return { kind: "call", name: t.value, args };
      }
      return { kind: "ident", name: t.value };
    }
    throw new Error(`parseUnary: unexpected ${t.type}`);
  }

  expect(type: Token["type"]) {
    const t = this.peek();
    if (!t || t.type !== type) throw new Error(`expected ${type}, got ${t?.type}`);
    this.consume();
  }

  peekIs(type: Token["type"]): boolean {
    return this.peek()?.type === type;
  }
}

function getPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function isBusinessHours(d: Date = new Date()): boolean {
  const day = d.getDay(); // 0=Sun, 6=Sat
  const hour = d.getHours();
  // Sun-Thu in ISR is the typical work week (we use the full Sun-Fri to be lenient)
  if (day === 5 || day === 6) return false; // Fri / Sat off
  return hour >= 9 && hour < 18;
}

function evalNode(node: unknown, ctx: PolicyEvaluationContext): unknown {
  if (!node || typeof node !== "object") return node;
  const n = node as Record<string, unknown>;
  if (n.kind === "literal") return n.value;
  if (n.kind === "ident") {
    const name = String(n.name);
    if (name === "true") return true;
    if (name === "false") return false;
    if (name === "null") return null;
    return getPath(ctx, name);
  }
  if (n.kind === "call") {
    const name = String(n.name);
    if (name === "is_business_hours") return isBusinessHours();
    if (name === "hour_of_day") return new Date().getHours();
    if (name === "now") return new Date().toISOString();
    throw new Error(`unknown function: ${name}`);
  }
  const op = String(n.op);
  if (op === "and") return Boolean(evalNode(n.left, ctx)) && Boolean(evalNode(n.right, ctx));
  if (op === "or") return Boolean(evalNode(n.left, ctx)) || Boolean(evalNode(n.right, ctx));
  if (op === "not") return !evalNode(n.operand, ctx);
  if (op === "exists") {
    const v = evalNode(n.operand, ctx);
    return v !== undefined && v !== null;
  }
  if (op === "in" || op === "not_in") {
    const left = evalNode(n.left, ctx);
    const items = (n.items as unknown[]).map((it) => evalNode(it, ctx));
    const matched = items.some((it) => it === left);
    return op === "in" ? matched : !matched;
  }
  // Comparisons
  const left = evalNode(n.left, ctx);
  const right = evalNode(n.right, ctx);
  switch (op) {
    case "==": return left === right;
    case "!=": return left !== right;
    case ">":  return Number(left) > Number(right);
    case ">=": return Number(left) >= Number(right);
    case "<":  return Number(left) < Number(right);
    case "<=": return Number(left) <= Number(right);
  }
  throw new Error(`unknown operator: ${op}`);
}

export function evaluateCondition(
  expression: string,
  ctx: PolicyEvaluationContext,
): boolean {
  if (!expression || expression.trim() === "") return true;
  try {
    const ast = new Parser(tokenize(expression)).parseExpr();
    return Boolean(evalNode(ast, ctx));
  } catch {
    // Fail-safe: on any evaluator error, treat condition as not matching
    // (so the rule is skipped — least-surprise: a broken rule doesn't deny
    // by accident). Backend MUST log this.
    return false;
  }
}

// ---------------------------------------------------------------------------
// Subject matching
// ---------------------------------------------------------------------------

function subjectMatches(rule: PolicyRule, ctx: PolicyEvaluationContext): boolean {
  const s = rule.subject;
  if (!s) return true;
  if (s.user_id !== undefined && s.user_id !== ctx.session.user_id) return false;
  if (s.org_id !== undefined && s.org_id !== ctx.session.org_id) return false;
  if (s.is_admin !== undefined && s.is_admin !== ctx.session.is_admin) return false;
  if (s.is_system_admin !== undefined && s.is_system_admin !== ctx.session.is_system_admin) return false;
  if (s.roles && s.roles.length > 0) {
    const has = ctx.session.roles.some((r) => s.roles!.includes(r));
    if (!has) return false;
  }
  return true;
}

function ruleActiveNow(rule: PolicyRule, now: Date): boolean {
  if (!rule.enabled) return false;
  if (rule.active_from) {
    if (now < new Date(rule.active_from)) return false;
  }
  if (rule.active_until) {
    if (now > new Date(rule.active_until)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Mock policy catalog
// ---------------------------------------------------------------------------

const MOCK_POLICIES: Policy[] = [
  {
    id: "policy.system.deny_critical_outside_business_hours",
    name: "Deny critical actions outside business hours",
    description: "Prevents resolving P1 tickets and running batch operations outside Sun-Thu 9-18.",
    category: "operational",
    org_id: null,
    rules: [
      {
        id: "rule.deny_p1_resolve_off_hours",
        description: "Deny resolving P1 tickets outside business hours",
        resource_pattern: "*",
        action_pattern: "helpdesk.ticket.resolve",
        subject: null,
        condition: 'resource.priority == "P1" and not is_business_hours()',
        active_from: null,
        active_until: null,
        effect: "deny",
        priority: 100,
        enabled: true,
      },
      {
        id: "rule.deny_batch_off_hours",
        description: "Deny batch operations outside business hours",
        resource_pattern: "*",
        action_pattern: "helpdesk.batch.*",
        subject: null,
        condition: "not is_business_hours()",
        active_from: null,
        active_until: null,
        effect: "deny",
        priority: 90,
        enabled: true,
      },
    ],
    enabled: true,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    created_by_user_id: null,
    updated_by_user_id: null,
  },
  {
    id: "policy.system.require_approval_high_blast_radius",
    name: "Require approval for high blast radius",
    description: "Forces human approval when an action affects many items or crosses orgs.",
    category: "ai_safety",
    org_id: null,
    rules: [
      {
        id: "rule.approval_large_batch",
        description: "Require approval when bulk action affects >50 items",
        resource_pattern: "*",
        action_pattern: "helpdesk.batch.*",
        subject: null,
        condition: "params.affected_count > 50",
        active_from: null,
        active_until: null,
        effect: "require_approval",
        priority: 80,
        enabled: true,
      },
    ],
    enabled: true,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    created_by_user_id: null,
    updated_by_user_id: null,
  },
  {
    id: "policy.system.ai_safety_baseline",
    name: "AI safety baseline",
    description: "Hard limits on what the AI can do without admin approval.",
    category: "ai_safety",
    org_id: null,
    rules: [
      {
        id: "rule.deny_admin_for_non_admin",
        description: "Deny admin-namespace actions for non-admin users",
        resource_pattern: "*",
        action_pattern: "admin.*",
        subject: { is_admin: false },
        condition: null,
        active_from: null,
        active_until: null,
        effect: "deny",
        priority: 200,
        enabled: true,
      },
      {
        id: "rule.approval_delete_for_non_admin",
        description: "Require approval for any delete action by non-admin users",
        resource_pattern: "*",
        action_pattern: "*.delete",
        subject: { is_admin: false },
        condition: null,
        active_from: null,
        active_until: null,
        effect: "require_approval",
        priority: 70,
        enabled: true,
      },
    ],
    enabled: true,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    created_by_user_id: null,
    updated_by_user_id: null,
  },
  {
    // Demonstrates policy-engine integration with the new verticals
    // (5B.15 + 5B.16). The pattern uses module.action wildcards so
    // every vertical's create-mutation goes through the same governor.
    id: "policy.system.content_size_limits",
    name: "Content size limits",
    description:
      "Block oversize submissions on user-content modules (notes/bookmarks). Cheap defence-in-depth on top of backend validation.",
    category: "operational",
    org_id: null,
    rules: [
      {
        id: "rule.deny_oversize_note_body",
        description: "Deny notes.create when body exceeds 10 000 chars",
        resource_pattern: "*",
        action_pattern: "notes.create",
        subject: null,
        condition: "params.body_length > 10000",
        active_from: null,
        active_until: null,
        effect: "deny",
        priority: 60,
        enabled: true,
      },
      {
        id: "rule.deny_oversize_bookmark_title",
        description: "Deny bookmarks.create when title exceeds 200 chars",
        resource_pattern: "*",
        action_pattern: "bookmarks.create",
        subject: null,
        condition: "params.title_length > 200",
        active_from: null,
        active_until: null,
        effect: "deny",
        priority: 60,
        enabled: true,
      },
    ],
    enabled: true,
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
    created_by_user_id: null,
    updated_by_user_id: null,
  },
  // Batch 165 — WhatsApp session policies. Closes the gap caught in
  // the batch 159 review: the 3 ai_callable skills declared
  // `policy_action_id: "whatsapp.session.*"` but no rule matched —
  // every chat-driven proposal would have passed without an explicit
  // gate.
  {
    id: "policy.system.whatsapp_session_safety",
    name: "WhatsApp session safety",
    description:
      "Guards the AI-callable WhatsApp session lifecycle: rate-limit link, require approval for unlink, require admin for self-erase. Matches whatsapp-bridge-spec.md §12.6 + §3.4.",
    category: "operational",
    org_id: null,
    rules: [
      {
        id: "rule.whatsapp.require_approval_for_unlink",
        description:
          "AI-proposed whatsapp.session.unlink (DESTRUCTIVE) must surface UI approval — never auto-execute even when the chat flow is otherwise allowed.",
        resource_pattern: "*",
        action_pattern: "whatsapp.session.unlink",
        subject: null,
        condition: null,
        active_from: null,
        active_until: null,
        effect: "require_approval",
        priority: 100,
        enabled: true,
      },
      {
        id: "rule.whatsapp.deny_link_burst",
        description:
          "Throttle WhatsApp session linking to 5/min per user (spec §12.6). A burst beyond that is treated as abuse and denied.",
        resource_pattern: "*",
        action_pattern: "whatsapp.session.link",
        subject: null,
        condition: "user.recent_link_count_1m >= 5",
        active_from: null,
        active_until: null,
        effect: "deny",
        priority: 80,
        enabled: true,
      },
      {
        id: "rule.whatsapp.deny_relink_burst",
        description:
          "Same throttle for relink — bridge bears the same Meta/Baileys API cost as link.",
        resource_pattern: "*",
        action_pattern: "whatsapp.session.relink",
        subject: null,
        condition: "user.recent_link_count_1m >= 5",
        active_from: null,
        active_until: null,
        effect: "deny",
        priority: 80,
        enabled: true,
      },
    ],
    enabled: true,
    created_at: "2026-05-19T00:00:00Z",
    updated_at: "2026-05-19T00:00:00Z",
    created_by_user_id: null,
    updated_by_user_id: null,
  },
  // Batch 165 — WhatsApp DSR + self-erase safety. These are the
  // irreversible mass-deletion paths from /whatsapp/admin/dsr and the
  // user-side erase dialog. Backend enforces self_approval_forbidden
  // (spec §3.4) and recovery_window_days (spec §1); the policy gates
  // here are the FE-engine-visible mirror so they show up in the
  // policy tester + audit.
  {
    id: "policy.system.whatsapp_irreversible_delete",
    name: "WhatsApp irreversible delete gating",
    description:
      "Require admin role + UI approval for DSR delete-by-subject and user-driven self-erase. Both paths drop messages permanently after recovery window.",
    category: "compliance",
    org_id: null,
    rules: [
      {
        id: "rule.whatsapp.deny_dsr_for_non_admin",
        description:
          "Hard deny whatsapp.dsr.delete for non-admin users. UX-level PermissionGate is not enough; BE check is authoritative; this rule keeps the policy tester honest.",
        resource_pattern: "*",
        action_pattern: "whatsapp.dsr.*",
        subject: { is_admin: false },
        condition: null,
        active_from: null,
        active_until: null,
        effect: "deny",
        priority: 100,
        enabled: true,
      },
      {
        id: "rule.whatsapp.require_approval_for_self_erase",
        description:
          "User-driven self-erase (entire archive wipe) must go through the UI dialog with reason + acknowledge — never auto-approve from any chat or API flow.",
        resource_pattern: "*",
        action_pattern: "whatsapp.self_erase.*",
        subject: null,
        condition: null,
        active_from: null,
        active_until: null,
        effect: "require_approval",
        priority: 100,
        enabled: true,
      },
    ],
    enabled: true,
    created_at: "2026-05-19T00:00:00Z",
    updated_at: "2026-05-19T00:00:00Z",
    created_by_user_id: null,
    updated_by_user_id: null,
  },
  // Batch 165 — AI safety floor for the rest of the ai_callable
  // surface. Closes the invariant "every ai_callable skill has at
  // least one policy rule matching its policy_action_id". Previously
  // 5 skills slipped through with no gate at all: helpdesk.ticket.take,
  // helpdesk.maintenance.cancel, users.{search,deactivate,reset_password}.
  // Each rule below is the minimum safety floor — narrower org-specific
  // overrides can still raise the bar.
  {
    id: "policy.system.ai_callable_safety_floor",
    name: "AI-callable safety floor",
    description:
      "Default gates for every ai_callable skill — ensures no chat-proposed action runs without an explicit policy decision (allow / deny / require_approval).",
    category: "ai_safety",
    org_id: null,
    rules: [
      {
        id: "rule.allow_helpdesk_ticket_take",
        description:
          "helpdesk.ticket.take is WRITE_LOW; allow but surface in the policy tester so audit shows an explicit allow decision.",
        resource_pattern: "*",
        action_pattern: "helpdesk.ticket.take",
        subject: null,
        condition: null,
        active_from: null,
        active_until: null,
        effect: "allow",
        priority: 10,
        enabled: true,
      },
      {
        id: "rule.require_approval_maintenance_cancel",
        description:
          "helpdesk.maintenance.cancel is DESTRUCTIVE (windows already scheduled — cancellation has stakeholder impact). Force human approval, no auto-execute from chat.",
        resource_pattern: "*",
        action_pattern: "helpdesk.maintenance.cancel",
        subject: null,
        condition: null,
        active_from: null,
        active_until: null,
        effect: "require_approval",
        priority: 100,
        enabled: true,
      },
      {
        id: "rule.allow_users_search",
        description:
          "users.search is READ-only; allow explicitly.",
        resource_pattern: "*",
        action_pattern: "users.search",
        subject: null,
        condition: null,
        active_from: null,
        active_until: null,
        effect: "allow",
        priority: 10,
        enabled: true,
      },
      {
        id: "rule.require_approval_users_deactivate",
        description:
          "users.deactivate cuts off a user from the platform — DESTRUCTIVE. Require approval even when the requester has the permission.",
        resource_pattern: "*",
        action_pattern: "users.deactivate",
        subject: null,
        condition: null,
        active_from: null,
        active_until: null,
        effect: "require_approval",
        priority: 100,
        enabled: true,
      },
      {
        id: "rule.allow_users_reset_password",
        description:
          "users.reset_password is WRITE_LOW (sends out-of-band email). Allow, but rate-limit at the apiFetch layer in BE per spec §12.6.",
        resource_pattern: "*",
        action_pattern: "users.reset_password",
        subject: null,
        condition: null,
        active_from: null,
        active_until: null,
        effect: "allow",
        priority: 10,
        enabled: true,
      },
    ],
    enabled: true,
    created_at: "2026-05-19T00:00:00Z",
    updated_at: "2026-05-19T00:00:00Z",
    created_by_user_id: null,
    updated_by_user_id: null,
  },
];

function generateDecisionId(): string {
  return `dec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

export function evaluatePoliciesAgainstContext(
  policies: Policy[],
  ctx: PolicyEvaluationContext,
): PolicyDecision {
  const now = new Date(ctx.evaluated_at);
  const matched: Array<{ policy: Policy; rule: PolicyRule }> = [];

  for (const policy of policies) {
    if (!policy.enabled) continue;
    // Org isolation: system templates (org_id=null) apply everywhere; org
    // policies must match session.org_id.
    if (policy.org_id !== null && policy.org_id !== ctx.session.org_id) continue;

    for (const rule of policy.rules) {
      if (!ruleActiveNow(rule, now)) continue;
      if (!patternMatches(rule.action_pattern, ctx.action_id)) continue;
      if (!subjectMatches(rule, ctx)) continue;
      if (rule.condition && !evaluateCondition(rule.condition, ctx)) continue;
      matched.push({ policy, rule });
    }
  }

  // Sort by priority desc — higher priority first
  matched.sort((a, b) => b.rule.priority - a.rule.priority);

  // Deny precedence: any deny → denied (regardless of allows)
  const denyMatches = matched.filter((m) => m.rule.effect === "deny");
  const approvalMatches = matched.filter((m) => m.rule.effect === "require_approval");

  const decision: PolicyDecision = {
    allowed: denyMatches.length === 0,
    requires_approval: approvalMatches.length > 0,
    matched_rules: matched.map(
      (m): PolicyRuleMatch => ({
        policy_id: m.policy.id,
        rule_id: m.rule.id,
        effect: m.rule.effect,
        description: m.rule.description,
      }),
    ),
    reasons: [
      ...denyMatches.map((m) => m.rule.description),
      ...(denyMatches.length === 0
        ? approvalMatches.map((m) => m.rule.description)
        : []),
    ],
    decision_id: generateDecisionId(),
  };

  return decision;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const DEFAULT_SESSION = {
  user_id: 1,
  org_id: 1,
  role: "system_admin",
  roles: ["system_admin"],
  is_admin: true,
  is_system_admin: true,
  permissions: [],
};

function applyOverrides(policies: Policy[]): Policy[] {
  if (ENABLED_OVERRIDES.size === 0) return policies;
  return policies.map((p) =>
    ENABLED_OVERRIDES.has(p.id)
      ? { ...p, enabled: ENABLED_OVERRIDES.get(p.id)! }
      : p,
  );
}

export async function fetchPolicies(): Promise<PolicyListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    const policies = applyOverrides(MOCK_POLICIES);
    return {
      success: true,
      data: { policies, total: policies.length },
    };
  }
  const res = await fetch(`${BASE}/policies`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPolicy(id: string): Promise<PolicyResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 50));
    const policy = applyOverrides(MOCK_POLICIES).find((p) => p.id === id);
    if (!policy) throw new Error(`404: policy '${id}' not found`);
    return { success: true, data: { policy } };
  }
  const res = await fetch(`${BASE}/policies/${encodeURIComponent(id)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function setPolicyEnabled(
  id: string,
  enabled: boolean,
): Promise<PolicyResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 100));
    const idx = MOCK_POLICIES.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error(`404: policy '${id}' not found`);
    ENABLED_OVERRIDES.set(id, enabled);
    persistEnabledOverrides();
    const policy: Policy = {
      ...MOCK_POLICIES[idx]!,
      enabled,
      updated_at: new Date().toISOString(),
    };
    return { success: true, data: { policy } };
  }
  const res = await fetch(`${BASE}/policies/${encodeURIComponent(id)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function evaluatePolicy(input: EvaluateInput): Promise<EvaluateResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 30));
    const ctx: PolicyEvaluationContext = {
      action_id: input.action_id,
      params: input.params ?? {},
      session: DEFAULT_SESSION,
      resource: input.resource ?? null,
      evaluated_at: new Date().toISOString(),
    };
    const decision = evaluatePoliciesAgainstContext(applyOverrides(MOCK_POLICIES), ctx);
    // Phase 2.4: emit AI audit entry per spec §12.
    void emitPolicyEvaluation({
      action_id: input.action_id,
      params: ctx.params,
      decision,
    });
    return { success: true, data: { decision } };
  }
  const res = await fetch(`${BASE}/policies/evaluate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
