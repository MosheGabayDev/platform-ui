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

  // Cap 12: Notifications (shell-level — polling 30s)
  notifications: {
    all:  () => ["notifications"]         as const,
    list: () => ["notifications", "list"] as const,
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
  },
} as const;
