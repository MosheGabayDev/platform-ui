export const queryKeys = {
  // Dashboard
  dashboardStats:  ["dashboard", "stats"]          as const,
  timeSeries:      (days: number) => ["dashboard", "timeseries", days] as const,
  serviceHealth:   ["dashboard", "health"]          as const,

  // Module 01: Users
  users: {
    all:     () => ["users"]                                    as const,
    stats:   () => ["users", "stats"]                          as const,
    list:    (params?: object) => ["users", "list", params]    as const,
    detail:  (id: number) => ["users", "detail", id]          as const,
    pending: () => ["users", "pending"]                        as const,
    activity: (id: number, params?: object) =>
      ["users", "activity", id, params]                        as const,
  },

  // Module 02: Organizations
  orgs: {
    all:    () => ["orgs"]                                      as const,
    stats:  () => ["orgs", "stats"]                            as const,
    list:   (params?: object) => ["orgs", "list", params]      as const,
    detail: (id: number) => ["orgs", "detail", id]            as const,
  },

  // Module 03: Roles & Permissions
  roles: {
    all:         () => ["roles"]                                    as const,
    list:        (params?: object) => ["roles", "list", params]    as const,
    detail:      (id: number) => ["roles", "detail", id]          as const,
    permissions: () => ["roles", "permissions"]                    as const,
  },

  // Cap 18: PlatformModuleRegistry
  moduleRegistry: {
    all:     () => ["module-registry"]                  as const,
    modules: () => ["module-registry", "modules"]       as const,
    status:  (key: string) => ["module-registry", "status", key] as const,
  },

  // Cap 12: Notifications (shell-level — polling 30s)
  notifications: {
    all:  () => ["notifications"]         as const,
    list: () => ["notifications", "list"] as const,
  },

  // WhatsApp module
  whatsapp: {
    all:      () => ["whatsapp"]                    as const,
    chats:    (params?: object) => ["whatsapp", "chats", params] as const,
    sharedWithMe: (params?: object) => ["whatsapp", "shared-with-me", params] as const,
    chatMessages: (id: number, params?: object) =>
      ["whatsapp", "chats", id, "messages", params] as const,
    chatShares: (id: number) => ["whatsapp", "chats", id, "shares"] as const,
    shareRecipients: (q: string) => ["whatsapp", "share-recipients", q] as const,
    search:   (params?: object) => ["whatsapp", "search", params] as const,
    sessions: () => ["whatsapp", "sessions"]       as const,
    sessionQr: (id: number) => ["whatsapp", "sessions", id, "qr"] as const,
  },

  // Platform-wide audit log (R046 service)
  audit: {
    all:    () => ["audit"]                                  as const,
    list:   (params?: object) => ["audit", "list", params]   as const,
    stats:  () => ["audit", "stats"]                         as const,
  },

  // Cap 16: PlatformSettings Engine
  settings: {
    all:        () => ["settings"]                                          as const,
    definitions: () => ["settings", "definitions"]                          as const,
    byCategory: (category: string) => ["settings", "category", category]    as const,
    allCategories: () => ["settings", "all-categories"]                     as const,
    one:        (key: string) => ["settings", "key", key]                   as const,
  },

  // Cap 17: PlatformFeatureFlags
  featureFlags: {
    all:         () => ["feature-flags"]                                    as const,
    definitions: () => ["feature-flags", "definitions"]                     as const,
    flag:        (key: string) => ["feature-flags", "flag", key]            as const,
    flagWithChain: (key: string) => ["feature-flags", "flag", key, "with-chain"] as const,
  },

  // Cap 27: PlatformPolicy Engine
  policies: {
    all:      () => ["policies"]                                            as const,
    list:     () => ["policies", "list"]                                    as const,
    detail:   (id: string) => ["policies", "detail", id]                    as const,
    evaluate: (
      actionId: string | undefined,
      params: unknown,
      resource: unknown,
    ) => ["policies", "evaluate", actionId, params, resource]               as const,
  },

  // Cap 11: PlatformSearch / Command Palette
  search: {
    global: (q: string) => ["search", "global", q]                          as const,
  },

  // §7 task 10.05 — Customer feedback aggregator
  feedback: {
    all:  () => ["feedback"]                  as const,
    list: () => ["feedback", "list"]          as const,
  },

  // §1 task 5B.15 — Notes (second vertical, validates "generic" claim)
  notes: {
    all:  () => ["notes"]                     as const,
    list: () => ["notes", "list"]             as const,
  },

  // §1 task 5B.16 — Bookmarks (third vertical lite — module-registry contract)
  bookmarks: {
    all:  () => ["bookmarks"]                 as const,
    list: () => ["bookmarks", "list"]         as const,
  },

  // Cap PlatformAIProviderGateway (Phase 2.1) — batch 41 ADR-028 #8 sync
  aiProviders: {
    all:     () => ["ai-providers"]                                     as const,
    catalog: () => ["ai-providers", "catalog"]                          as const,
    configs: () => ["ai-providers", "configs"]                          as const,
    config:  (providerId: string | null) =>
      ["ai-providers", "config", providerId]                            as const,
    resolve: (params: object) =>
      ["ai-providers", "resolve", params]                               as const,
  },

  // Cap PlatformAISkillRegistry (Phase 2.2) — batch 41 ADR-028 #8 sync
  aiSkills: {
    all:      () => ["ai-skills"]                                       as const,
    list:     (filter: object) => ["ai-skills", "list", filter]         as const,
    validate: (skillId: string | undefined, params: unknown) =>
      ["ai-skills", "validate", skillId, params]                        as const,
  },

  // Cap PlatformAIUsage (Phase 2.3) — batch 41 ADR-028 #8 sync
  aiUsage: {
    all:    () => ["ai-usage"]                                          as const,
    stats:  (range: string) => ["ai-usage", "stats", range]             as const,
    events: (params: object) => ["ai-usage", "events", params]          as const,
  },

  // Phase 6: Billing (mock pre-Stripe — see PRODUCT_LAUNCH_PLAN.md §3)
  billing: {
    all:         () => ["billing"]                          as const,
    overview:    () => ["billing", "overview"]              as const,
    usageSeries: (days: number) =>
      ["billing", "usage-series", days]                     as const,
  },

  // Module 04: Helpdesk (Phase A — list + KPI dashboard)
  helpdesk: {
    all:         () => ["helpdesk"]                                    as const,
    stats:       () => ["helpdesk", "stats"]                          as const,
    tickets:     (params?: object) => ["helpdesk", "tickets", params] as const,
    ticket:      (id: number) => ["helpdesk", "ticket", id]          as const,
    technicians: (availableOnly?: boolean) => ["helpdesk", "technicians", { availableOnly }] as const,
    technicianUtilization: () => ["helpdesk", "technicians", "utilization"]      as const,
    slaPolicies:    () => ["helpdesk", "sla", "policies"]    as const,
    slaCompliance:  () => ["helpdesk", "sla", "compliance"]  as const,
    approvals:      (params?: object) => ["helpdesk", "approvals", params] as const,
    maintenance:    (params?: object) => ["helpdesk", "maintenance", params] as const,
    batch:          (params?: object) => ["helpdesk", "batch", params] as const,
    batchTask:      (id: number) => ["helpdesk", "batch", "task", id]   as const,
  },
} as const;
