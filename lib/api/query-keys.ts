export const queryKeys = {
  dashboardStats:  ["dashboard", "stats"]          as const,
  timeSeries:      (days: number) => ["dashboard", "timeseries", days] as const,
  serviceHealth:   ["dashboard", "health"]          as const,
} as const;
