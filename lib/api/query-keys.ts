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
} as const;
