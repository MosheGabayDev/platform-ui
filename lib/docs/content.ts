/**
 * @module lib/docs/content
 * Static help-surface catalog (Phase 3.3). Hebrew + English bodies where
 * helpful. Edit this file to update in-app docs; no rebuild gymnastics
 * needed beyond a Next.js redeploy.
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-help-surface-spec.md
 */
import type { DocsCatalog, DocArticle, AIShortcut, KeyboardShortcut } from "./types";

const QUICK_STARTS: DocArticle[] = [
  {
    id: "quick-start-helpdesk",
    category: "quick-start",
    module_key: "helpdesk",
    title: "Helpdesk",
    title_he: "הלפדסק",
    summary: "Manage tickets, technicians, SLAs, KB articles, and batch tasks.",
    summary_he: "ניהול פניות, טכנאים, SLA, מאמרי בסיס ידע ומשימות אצווה.",
    tags: ["tickets", "support", "sla", "helpdesk"],
    steps: [
      { text: "Open /helpdesk to see the dashboard.", text_he: "פתח /helpdesk לדשבורד הראשי." },
      { text: "Use Ctrl+K and type a ticket id to jump straight to it." },
      { text: "Try the AI: open the floating assistant and say 'take ticket 1001'.", text_he: "נסה את ה-AI: פתח את הסייען וכתוב 'take ticket 1001'." },
      { text: "Check audit-log to see the action recorded." },
    ],
  },
  {
    id: "quick-start-users",
    category: "quick-start",
    module_key: "users",
    title: "Users & roles",
    title_he: "משתמשים ותפקידים",
    summary: "Invite users, assign roles, deactivate accounts.",
    tags: ["users", "rbac", "roles"],
    steps: [
      { text: "Open /users to list members of your org." },
      { text: "Use /roles to manage permissions per role." },
      { text: "Bulk-deactivate via the AI: 'deactivate user 42' (requires confirm)." },
    ],
  },
  {
    id: "quick-start-audit-log",
    category: "quick-start",
    module_key: "audit-log",
    title: "Audit log",
    title_he: "יומן ביקורת",
    summary: "Searchable trail of every important platform event.",
    tags: ["audit", "logs", "compliance"],
    steps: [
      { text: "Open /audit-log to browse recent entries." },
      { text: "Filter by category (login / create / update / delete / admin / ai / security)." },
      { text: "Each AI action lands here under category=ai with the matched policy decision." },
    ],
  },
  {
    id: "quick-start-ai-agents",
    category: "quick-start",
    module_key: "ai-agents",
    title: "AI agents",
    title_he: "סוכני AI",
    summary: "Background AI workers that run on triggers (cron, events).",
    tags: ["ai", "agents", "automation"],
    steps: [
      { text: "Open /ai-agents to list configured agents." },
      { text: "Each agent uses a skill from /admin/ai-skills and obeys policies in /admin/policies." },
    ],
  },
  {
    id: "quick-start-ai-providers",
    category: "quick-start",
    module_key: "ai-providers",
    title: "AI providers",
    title_he: "ספקי AI",
    summary: "Pick which LLM providers and models your org uses.",
    tags: ["ai", "providers", "llm"],
    steps: [
      { text: "Open /admin/ai-providers (admin only)." },
      { text: "Enable a provider, paste credentials, click Test connection." },
      { text: "Routing rules pick which provider serves which purpose." },
    ],
  },
  {
    id: "quick-start-knowledge",
    category: "quick-start",
    module_key: "knowledge",
    title: "Knowledge base & RAG",
    title_he: "ידע ו-RAG",
    summary: "Upload documents the AI can ground its answers in.",
    tags: ["rag", "knowledge", "ai"],
    steps: [
      { text: "Open /knowledge to upload PDFs / docs / URLs." },
      { text: "Indexed chunks become retrievable by AI agents during chat." },
    ],
  },
  {
    id: "quick-start-voice",
    category: "quick-start",
    module_key: "voice",
    title: "Voice & ALA",
    title_he: "ALA — Voice AI",
    summary: "Inbound/outbound voice flows with ASR + TTS.",
    tags: ["voice", "ala", "telephony"],
    steps: [
      { text: "Open /ala to design call flows." },
      { text: "Inspect /voice for live and historical call sessions." },
    ],
  },
  {
    id: "quick-start-automation",
    category: "quick-start",
    module_key: "automation",
    title: "Automation",
    title_he: "אוטומציה",
    summary: "Trigger-condition-action workflows across modules.",
    tags: ["automation", "workflows", "triggers"],
    steps: [
      { text: "Open /automation to build workflows." },
      { text: "Use the audit-log to confirm runs and inspect failures." },
    ],
  },
  {
    id: "quick-start-integrations",
    category: "quick-start",
    module_key: "integrations",
    title: "Integrations",
    title_he: "אינטגרציות",
    summary: "OAuth/webhook integrations to external systems.",
    tags: ["integrations", "oauth", "webhooks"],
    steps: [
      { text: "Open /integrations and pick a provider." },
      { text: "Authorize once; tokens are stored encrypted via cap 16 secrets." },
    ],
  },
  {
    id: "quick-start-monitoring",
    category: "quick-start",
    module_key: "monitoring",
    title: "Monitoring",
    title_he: "ניטור",
    summary: "Health, logs, metrics — operations data for the platform itself.",
    tags: ["monitoring", "logs", "metrics"],
    steps: [
      { text: "Open /monitoring for system health probes." },
      { text: "Use /logs for raw application logs and /metrics for time-series." },
    ],
  },
  {
    id: "quick-start-billing",
    category: "quick-start",
    module_key: "billing",
    title: "Billing & API keys",
    title_he: "חיוב ו-API keys",
    summary: "Plans, invoices, usage caps, API tokens.",
    tags: ["billing", "api-keys", "plan"],
    steps: [
      { text: "Open /billing to view your current plan and invoices." },
      { text: "Manage tokens at /api-keys — they inherit the org's RBAC." },
    ],
  },
  {
    id: "quick-start-data-sources",
    category: "quick-start",
    module_key: "data-sources",
    title: "Data sources",
    title_he: "מקורות נתונים",
    summary: "External databases / warehouses the platform can query.",
    tags: ["data-sources", "databases"],
    steps: [
      { text: "Open /data-sources to register a connection." },
      { text: "Connections are read-only by default; admin can grant write." },
    ],
  },
];

const PLATFORM_ARTICLES: DocArticle[] = [
  {
    id: "platform-overview",
    category: "platform",
    title: "Platform overview",
    title_he: "סקירת הפלטפורמה",
    summary: "How the horizontal capabilities fit together.",
    body: "The platform is built from horizontal capabilities (settings, modules, feature flags, policies, AI providers, AI skills, audit log) plus optional vertical modules (helpdesk, etc.). Every feature is gated through policies (cap 27) and recorded in the audit log (cap 10). LLM calls go through the provider gateway (cap 2.1) and obey the per-skill enablement (cap 2.2).",
    body_he: "הפלטפורמה בנויה מיכולות אופקיות (הגדרות, מודולים, feature flags, policies, ספקי AI, כישורי AI, יומן ביקורת) ומודולים אנכיים (הלפדסק וכו'). כל פעולה עוברת דרך policies (cap 27) ונרשמת ב-audit log (cap 10).",
    tags: ["overview", "architecture"],
  },
  {
    id: "platform-ai-safety",
    category: "platform",
    title: "How AI safety works",
    title_he: "כיצד פועל מנגנון בטיחות ה-AI",
    summary: "Propose → Confirm → Audit. The AI never executes silently.",
    body: "Every AI-initiated action follows three steps: (1) the AI proposes the action with a token-bound expiration; (2) the user reviews and confirms (or rejects); (3) the executor runs and the audit log records the outcome with category=ai. Policies (cap 27) can reject proposals before they ever reach the user.",
    tags: ["ai", "safety", "audit"],
  },
];

const AI_SHORTCUTS: AIShortcut[] = [
  {
    phrase: "take ticket NNNN",
    action_id: "helpdesk.ticket.take",
    description: "Assigns ticket NNNN to you (the current user).",
    description_he: "משייך פנייה NNNN למשתמש הנוכחי.",
    capability_level: "WRITE_HIGH",
  },
  {
    phrase: "resolve ticket NNNN",
    action_id: "helpdesk.ticket.resolve",
    description: "Marks ticket NNNN resolved.",
    description_he: "סוגר פנייה NNNN.",
    capability_level: "WRITE_HIGH",
  },
  {
    phrase: "cancel maintenance NNNN",
    action_id: "helpdesk.maintenance.cancel",
    description: "Cancels maintenance window NNNN.",
    capability_level: "DESTRUCTIVE",
  },
  {
    phrase: "cancel batch NNNN",
    action_id: "helpdesk.batch.cancel",
    description: "Cancels batch task NNNN.",
    capability_level: "DESTRUCTIVE",
  },
  {
    phrase: "search users for <query>",
    action_id: "users.search",
    description: "Searches users by name / email / id.",
    description_he: "חיפוש משתמשים לפי שם / אימייל / מזהה.",
    capability_level: "READ",
  },
  {
    phrase: "deactivate user NNNN",
    action_id: "users.deactivate",
    description: "Deactivates user NNNN — they can no longer log in.",
    capability_level: "DESTRUCTIVE",
  },
  {
    phrase: "reset password for user NNNN",
    action_id: "users.reset_password",
    description: "Sends a password-reset email to user NNNN.",
    capability_level: "WRITE_LOW",
  },
];

const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { keys: ["g", "d"], label: "Dashboard", label_he: "דשבורד" },
  { keys: ["g", "u"], label: "Users", label_he: "משתמשים" },
  { keys: ["g", "t"], label: "Tickets", label_he: "פניות" },
  { keys: ["g", "a"], label: "AI agents", label_he: "סוכני AI" },
  { keys: ["g", "h"], label: "Helpdesk" },
  { keys: ["g", "s"], label: "Settings", label_he: "הגדרות" },
  { keys: ["g", "l"], label: "Logs", label_he: "לוגים" },
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["/"], label: "Focus sidebar search" },
  { keys: ["?"], label: "Show keyboard shortcuts" },
  { keys: ["Esc"], label: "Close / cancel" },
];

export const DOCS_CATALOG: DocsCatalog = {
  articles: [...QUICK_STARTS, ...PLATFORM_ARTICLES],
  aiShortcuts: AI_SHORTCUTS,
  keyboardShortcuts: KEYBOARD_SHORTCUTS,
};

/**
 * Plain substring search across articles, AI shortcuts, and keyboard
 * shortcuts. Returns a filtered catalog. Empty query returns the full
 * catalog unchanged.
 */
export function searchCatalog(query: string): DocsCatalog {
  const q = query.trim().toLowerCase();
  if (!q) return DOCS_CATALOG;

  const matchesArticle = (a: DocArticle): boolean => {
    const haystack = [
      a.title,
      a.title_he,
      a.summary,
      a.summary_he,
      a.body,
      a.body_he,
      ...(a.tags ?? []),
      a.module_key,
      ...(a.steps ?? []).flatMap((s) => [s.text, s.text_he]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  };

  const matchesAI = (s: AIShortcut): boolean =>
    [s.phrase, s.action_id, s.description, s.description_he, s.capability_level]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);

  const matchesKbd = (k: KeyboardShortcut): boolean =>
    [k.label, k.label_he, ...k.keys]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);

  return {
    articles: DOCS_CATALOG.articles.filter(matchesArticle),
    aiShortcuts: DOCS_CATALOG.aiShortcuts.filter(matchesAI),
    keyboardShortcuts: DOCS_CATALOG.keyboardShortcuts.filter(matchesKbd),
  };
}
