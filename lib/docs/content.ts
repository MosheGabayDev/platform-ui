/**
 * @module lib/docs/content
 * Help-surface catalog (Phase 3.3, Track E refactor).
 *
 * Each entry references translation keys instead of embedded copy. Add a
 * new locale by editing `i18n/messages/<locale>.json` — no changes to
 * this file required.
 *
 * Search is performed against the resolved translations + tags via the
 * `searchCatalog(query, t)` helper, where `t` is the result of
 * `useTranslations()` in the calling component.
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-help-surface-spec.md
 */
import type {
  DocsCatalog,
  DocArticle,
  AIShortcut,
  KeyboardShortcut,
} from "./types";

const QUICK_STARTS: DocArticle[] = [
  {
    id: "quick-start-helpdesk",
    category: "quick-start",
    module_key: "helpdesk",
    titleKey: "help.modules.helpdesk.title",
    summaryKey: "help.modules.helpdesk.summary",
    stepKeys: [
      "help.modules.helpdesk.steps.0",
      "help.modules.helpdesk.steps.1",
      "help.modules.helpdesk.steps.2",
      "help.modules.helpdesk.steps.3",
    ],
    tags: ["tickets", "support", "sla", "helpdesk"],
  },
  {
    id: "quick-start-users",
    category: "quick-start",
    module_key: "users",
    titleKey: "help.modules.users.title",
    summaryKey: "help.modules.users.summary",
    stepKeys: [
      "help.modules.users.steps.0",
      "help.modules.users.steps.1",
      "help.modules.users.steps.2",
    ],
    tags: ["users", "rbac", "roles"],
  },
  {
    id: "quick-start-audit-log",
    category: "quick-start",
    module_key: "audit-log",
    titleKey: "help.modules.auditLog.title",
    summaryKey: "help.modules.auditLog.summary",
    stepKeys: [
      "help.modules.auditLog.steps.0",
      "help.modules.auditLog.steps.1",
      "help.modules.auditLog.steps.2",
    ],
    tags: ["audit", "logs", "compliance"],
  },
  {
    id: "quick-start-ai-agents",
    category: "quick-start",
    module_key: "ai-agents",
    titleKey: "help.modules.aiAgents.title",
    summaryKey: "help.modules.aiAgents.summary",
    stepKeys: [
      "help.modules.aiAgents.steps.0",
      "help.modules.aiAgents.steps.1",
    ],
    tags: ["ai", "agents", "automation"],
  },
  {
    id: "quick-start-ai-providers",
    category: "quick-start",
    module_key: "ai-providers",
    titleKey: "help.modules.aiProviders.title",
    summaryKey: "help.modules.aiProviders.summary",
    stepKeys: [
      "help.modules.aiProviders.steps.0",
      "help.modules.aiProviders.steps.1",
      "help.modules.aiProviders.steps.2",
    ],
    tags: ["ai", "providers", "llm"],
  },
  {
    id: "quick-start-knowledge",
    category: "quick-start",
    module_key: "knowledge",
    titleKey: "help.modules.knowledge.title",
    summaryKey: "help.modules.knowledge.summary",
    stepKeys: [
      "help.modules.knowledge.steps.0",
      "help.modules.knowledge.steps.1",
    ],
    tags: ["rag", "knowledge", "ai"],
  },
  {
    id: "quick-start-voice",
    category: "quick-start",
    module_key: "voice",
    titleKey: "help.modules.voice.title",
    summaryKey: "help.modules.voice.summary",
    stepKeys: [
      "help.modules.voice.steps.0",
      "help.modules.voice.steps.1",
    ],
    tags: ["voice", "ala", "telephony"],
  },
  {
    id: "quick-start-automation",
    category: "quick-start",
    module_key: "automation",
    titleKey: "help.modules.automation.title",
    summaryKey: "help.modules.automation.summary",
    stepKeys: [
      "help.modules.automation.steps.0",
      "help.modules.automation.steps.1",
    ],
    tags: ["automation", "workflows", "triggers"],
  },
  {
    id: "quick-start-integrations",
    category: "quick-start",
    module_key: "integrations",
    titleKey: "help.modules.integrations.title",
    summaryKey: "help.modules.integrations.summary",
    stepKeys: [
      "help.modules.integrations.steps.0",
      "help.modules.integrations.steps.1",
    ],
    tags: ["integrations", "oauth", "webhooks"],
  },
  {
    id: "quick-start-monitoring",
    category: "quick-start",
    module_key: "monitoring",
    titleKey: "help.modules.monitoring.title",
    summaryKey: "help.modules.monitoring.summary",
    stepKeys: [
      "help.modules.monitoring.steps.0",
      "help.modules.monitoring.steps.1",
    ],
    tags: ["monitoring", "logs", "metrics"],
  },
  {
    id: "quick-start-billing",
    category: "quick-start",
    module_key: "billing",
    titleKey: "help.modules.billing.title",
    summaryKey: "help.modules.billing.summary",
    stepKeys: [
      "help.modules.billing.steps.0",
      "help.modules.billing.steps.1",
    ],
    tags: ["billing", "api-keys", "plan"],
  },
  {
    id: "quick-start-data-sources",
    category: "quick-start",
    module_key: "data-sources",
    titleKey: "help.modules.dataSources.title",
    summaryKey: "help.modules.dataSources.summary",
    stepKeys: [
      "help.modules.dataSources.steps.0",
      "help.modules.dataSources.steps.1",
    ],
    tags: ["data-sources", "databases"],
  },
];

const PLATFORM_ARTICLES: DocArticle[] = [
  {
    id: "platform-overview",
    category: "platform",
    titleKey: "help.platform.overview.title",
    summaryKey: "help.platform.overview.summary",
    bodyKey: "help.platform.overview.body",
    tags: ["overview", "architecture"],
  },
  {
    id: "platform-ai-safety",
    category: "platform",
    titleKey: "help.platform.aiSafety.title",
    summaryKey: "help.platform.aiSafety.summary",
    bodyKey: "help.platform.aiSafety.body",
    tags: ["ai", "safety", "audit"],
  },
];

const AI_SHORTCUTS: AIShortcut[] = [
  {
    phrase: "take ticket NNNN",
    action_id: "helpdesk.ticket.take",
    descriptionKey: "help.aiShortcuts.takeTicket",
    capability_level: "WRITE_HIGH",
  },
  {
    phrase: "resolve ticket NNNN",
    action_id: "helpdesk.ticket.resolve",
    descriptionKey: "help.aiShortcuts.resolveTicket",
    capability_level: "WRITE_HIGH",
  },
  {
    phrase: "cancel maintenance NNNN",
    action_id: "helpdesk.maintenance.cancel",
    descriptionKey: "help.aiShortcuts.cancelMaintenance",
    capability_level: "DESTRUCTIVE",
  },
  {
    phrase: "cancel batch NNNN",
    action_id: "helpdesk.batch.cancel",
    descriptionKey: "help.aiShortcuts.cancelBatch",
    capability_level: "DESTRUCTIVE",
  },
  {
    phrase: "search users for <query>",
    action_id: "users.search",
    descriptionKey: "help.aiShortcuts.searchUsers",
    capability_level: "READ",
  },
  {
    phrase: "deactivate user NNNN",
    action_id: "users.deactivate",
    descriptionKey: "help.aiShortcuts.deactivateUser",
    capability_level: "DESTRUCTIVE",
  },
  {
    phrase: "reset password for user NNNN",
    action_id: "users.reset_password",
    descriptionKey: "help.aiShortcuts.resetPassword",
    capability_level: "WRITE_LOW",
  },
];

const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { keys: ["g", "d"], labelKey: "help.keyboardShortcuts.dashboard" },
  { keys: ["g", "u"], labelKey: "help.keyboardShortcuts.users" },
  { keys: ["g", "t"], labelKey: "help.keyboardShortcuts.tickets" },
  { keys: ["g", "a"], labelKey: "help.keyboardShortcuts.aiAgents" },
  { keys: ["g", "h"], labelKey: "help.keyboardShortcuts.helpdesk" },
  { keys: ["g", "s"], labelKey: "help.keyboardShortcuts.settings" },
  { keys: ["g", "l"], labelKey: "help.keyboardShortcuts.logs" },
  { keys: ["⌘", "K"], labelKey: "help.keyboardShortcuts.openCommandPalette" },
  { keys: ["/"], labelKey: "help.keyboardShortcuts.focusSearch" },
  { keys: ["?"], labelKey: "help.keyboardShortcuts.showShortcuts" },
  { keys: ["Esc"], labelKey: "help.keyboardShortcuts.closeOrCancel" },
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
 *
 * Note: this implementation searches against translation keys + tags +
 * static fields (phrase, action_id). Locale-aware text matching can be
 * added later by passing the active translator and walking resolved
 * strings — for now substring on the keys + tags catches the most-common
 * search terms (module name, action_id, phrase fragment).
 */
export function searchCatalog(query: string): DocsCatalog {
  const q = query.trim().toLowerCase();
  if (!q) return DOCS_CATALOG;

  const matchesArticle = (a: DocArticle): boolean => {
    const haystack = [
      a.titleKey,
      a.summaryKey,
      a.bodyKey ?? "",
      ...(a.tags ?? []),
      a.module_key ?? "",
      ...(a.stepKeys ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  };

  const matchesAI = (s: AIShortcut): boolean =>
    [s.phrase, s.action_id, s.descriptionKey, s.capability_level]
      .join(" ")
      .toLowerCase()
      .includes(q);

  const matchesKbd = (k: KeyboardShortcut): boolean =>
    [k.labelKey, ...k.keys].join(" ").toLowerCase().includes(q);

  return {
    articles: DOCS_CATALOG.articles.filter(matchesArticle),
    aiShortcuts: DOCS_CATALOG.aiShortcuts.filter(matchesAI),
    keyboardShortcuts: DOCS_CATALOG.keyboardShortcuts.filter(matchesKbd),
  };
}
